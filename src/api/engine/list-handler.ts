import type { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, like, sql, desc, asc, count } from 'drizzle-orm';
import type { ResourceApiConfig } from './types';
import { schemaRegistry } from './schema-registry';
import { getPaginationParams, getOffset, buildMeta } from '../utils/pagination';
import { success, handleError } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

export function listHandler(config: ResourceApiConfig, table: any) {
  return async (c: Context<Env>) => {
    try {
      const db = drizzle(c.env.DB);
      const listConfig = config.list!;

      // Build select fields
      const selectObj: Record<string, any> = {};
      for (const field of listConfig.fields) {
        selectObj[field] = table[field];
      }

      // Add join fields
      for (const join of listConfig.joins ?? []) {
        const joinTable = schemaRegistry[join.table];
        for (const [alias, sourceCol] of Object.entries(join.fields)) {
          selectObj[alias] = joinTable[sourceCol];
        }
      }

      // Add computed fields
      for (const cf of listConfig.computedFields ?? []) {
        if (cf.type === 'number') {
          selectObj[cf.name] = sql<number>`${sql.raw(cf.sql)}`.as(cf.name);
        } else {
          selectObj[cf.name] = sql<string>`${sql.raw(cf.sql)}`.as(cf.name);
        }
      }

      // Build filter conditions
      const conditions: any[] = [];

      // Search (LIKE on multiple fields with OR)
      if (listConfig.search) {
        const searchValue = c.req.query(listConfig.search.param);
        if (searchValue) {
          const pattern = `%${searchValue}%`;
          const searchConditions = listConfig.search.fields.map((f) =>
            like(table[f], pattern)
          );
          if (searchConditions.length > 0) {
            conditions.push(or(...searchConditions));
          }
        }
      }

      // Filters (eq conditions from query params)
      for (const filter of listConfig.filters ?? []) {
        const paramValue = c.req.query(filter.param);
        if (paramValue) {
          conditions.push(eq(table[filter.field], paramValue));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Build query
      let query = db.select(selectObj).from(table);

      // Apply joins
      for (const join of listConfig.joins ?? []) {
        const joinTable = schemaRegistry[join.table];
        const foreignField = join.on[1].includes('.')
          ? join.on[1].split('.')[1]
          : join.on[1];
        query = query.leftJoin(joinTable, eq(table[join.on[0]], joinTable[foreignField])) as any;
      }

      // Apply where
      if (whereClause) {
        query = query.where(whereClause) as any;
      }

      // Apply orderBy
      if (listConfig.orderBy) {
        const orderField = table[listConfig.orderBy.field];
        query = query.orderBy(
          listConfig.orderBy.direction === 'desc' ? desc(orderField) : asc(orderField)
        ) as any;
      }

      if (listConfig.paginated) {
        const url = new URL(c.req.url);
        const paginationParams = getPaginationParams(url);
        const offset = getOffset(paginationParams);

        // Get total count with same filters
        let countQuery = db.select({ value: count() }).from(table);
        if (whereClause) {
          countQuery = countQuery.where(whereClause) as any;
        }
        const [totalResult] = await countQuery;
        const total = totalResult.value;

        // Apply pagination
        query = query.limit(paginationParams.limit).offset(offset) as any;

        const results = await query;
        const meta = buildMeta(paginationParams, total);
        return c.json(success(results, meta));
      }

      const results = await query;
      return c.json(success(results));
    } catch (err) {
      const e = handleError(`Fetch ${config.resource}`, err);
      return c.json(e.body, e.status);
    }
  };
}
