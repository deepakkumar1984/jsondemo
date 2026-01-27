import type { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql } from 'drizzle-orm';
import type { ResourceApiConfig } from './types';
import { schemaRegistry } from './schema-registry';
import { success, error, handleError } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

export function getByIdHandler(config: ResourceApiConfig, table: any) {
  return async (c: Context<Env>) => {
    try {
      const db = drizzle(c.env.DB);
      const id = c.req.param('id');
      const getConfig = config.getById!;

      // Build select fields
      const selectObj: Record<string, any> = {};
      for (const field of getConfig.fields) {
        selectObj[field] = table[field];
      }

      // Add join fields
      for (const join of getConfig.joins ?? []) {
        const joinTable = schemaRegistry[join.table];
        for (const [alias, sourceCol] of Object.entries(join.fields)) {
          selectObj[alias] = joinTable[sourceCol];
        }
      }

      // Add computed fields
      for (const cf of getConfig.computedFields ?? []) {
        if (cf.type === 'number') {
          selectObj[cf.name] = sql<number>`${sql.raw(cf.sql)}`.as(cf.name);
        } else {
          selectObj[cf.name] = sql<string>`${sql.raw(cf.sql)}`.as(cf.name);
        }
      }

      // Build query
      let query = db.select(selectObj).from(table);

      // Apply joins
      for (const join of getConfig.joins ?? []) {
        const joinTable = schemaRegistry[join.table];
        const foreignField = join.on[1].includes('.')
          ? join.on[1].split('.')[1]
          : join.on[1];
        query = query.leftJoin(joinTable, eq(table[join.on[0]], joinTable[foreignField])) as any;
      }

      query = query.where(eq(table.id, id)).limit(1) as any;

      const results = await query;

      if (results.length === 0) {
        const e = error(`${config.resource} not found`, 404);
        return c.json(e.body, e.status);
      }

      const record: any = { ...results[0] };

      // Apply lookups
      for (const lookup of getConfig.lookups ?? []) {
        if (record[lookup.condition]) {
          const lookupTable = schemaRegistry[lookup.table];

          // Build the where value by resolving $field references
          const whereValue = lookup.where.value.startsWith('$')
            ? record[lookup.where.value.slice(1)]
            : lookup.where.value;

          // Build select for lookup
          const lookupSelect: Record<string, any> = {};
          for (const field of lookup.select) {
            lookupSelect[field] = lookupTable[field];
          }

          const [lookupResult] = await db
            .select(lookupSelect)
            .from(lookupTable)
            .where(eq(lookupTable[lookup.where.field], whereValue))
            .limit(1);

          if (lookupResult) {
            // Format the lookup result
            let formatted = lookup.format;
            for (const [key, val] of Object.entries(lookupResult as Record<string, any>)) {
              formatted = formatted.replace(`{${key}}`, val ?? '');
            }
            record[lookup.name] = formatted;
          } else {
            record[lookup.name] = null;
          }
        } else {
          record[lookup.name] = null;
        }
      }

      return c.json(success(record));
    } catch (err) {
      const e = handleError(`Fetch ${config.resource}`, err);
      return c.json(e.body, e.status);
    }
  };
}
