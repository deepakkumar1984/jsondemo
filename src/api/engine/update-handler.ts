import type { Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { ResourceApiConfig } from './types';
import { coerceValue } from './coerce';
import { success, error, handleError } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

export function updateHandler(config: ResourceApiConfig, table: any) {
  return async (c: Context<Env>) => {
    try {
      const db = drizzle(c.env.DB);
      const id = c.req.param('id');
      const body = await c.req.json();
      const updateConfig = config.update!;

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

      // Build update object with whitelisted fields only
      const updateData: Record<string, unknown> = {};
      for (const field of updateConfig.fields) {
        if (body[field] !== undefined) {
          if (updateConfig.coerce?.[field]) {
            updateData[field] = coerceValue(body[field], updateConfig.coerce[field]);
          } else {
            updateData[field] = body[field];
          }
        }
      }

      // Auto-add timestamp
      if (updateConfig.addTimestamp) {
        updateData.updatedAt = new Date().toISOString();
      }

      if (Object.keys(updateData).length > 0) {
        await db
          .update(table)
          .set(updateData)
          .where(eq(table.id, id));
      }

      const [updated] = await db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);

      return c.json(success(updated));
    } catch (err) {
      const e = handleError(`Update ${config.resource}`, err);
      return c.json(e.body, e.status);
    }
  };
}
