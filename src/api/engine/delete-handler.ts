import type { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, count } from 'drizzle-orm';
import type { ResourceApiConfig } from './types';
import { schemaRegistry } from './schema-registry';
import { success, error, handleError } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

export function deleteHandler(config: ResourceApiConfig, table: any) {
  return async (c: Context<Env>) => {
    try {
      const db = drizzle(c.env.DB);
      const id = c.req.param('id');
      const deleteConfig = config.delete!;

      // Check record exists
      const [existing] = await db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);

      if (!existing) {
        const e = error(`${config.resource} not found`, 404);
        return c.json(e.body, e.status);
      }

      // Referential checks
      for (const check of deleteConfig.referentialChecks ?? []) {
        const refTable = schemaRegistry[check.table];
        const [refCount] = await db
          .select({ value: count() })
          .from(refTable)
          .where(eq(refTable[check.foreignKey], id));

        if (refCount.value > 0) {
          const message = check.message.replace('{count}', String(refCount.value));
          const e = error(message, 409);
          return c.json(e.body, e.status);
        }
      }

      if (deleteConfig.mode === 'soft') {
        const softField = deleteConfig.softDeleteField!;
        const softValue = deleteConfig.softDeleteValue!;
        const now = new Date().toISOString();

        await db
          .update(table)
          .set({ [softField]: softValue, updatedAt: now })
          .where(eq(table.id, id));

        const label = config.resource.replace(/s$/, '');
        return c.json(success({ message: `${capitalize(label)} ${softValue} successfully` }));
      }

      // Hard delete
      await db.delete(table).where(eq(table.id, id));

      const label = config.resource.replace(/s$/, '');
      return c.json(success({ message: `${capitalize(label)} deleted successfully` }));
    } catch (err) {
      const e = handleError(`Delete ${config.resource}`, err);
      return c.json(e.body, e.status);
    }
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
