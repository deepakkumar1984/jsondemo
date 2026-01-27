import { Context, Next } from 'hono';
import { z } from 'zod';

export function validate<T extends z.ZodType>(schema: T) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return c.json({
          success: false,
          error: 'Validation failed',
          details: result.error.issues.map((i: any) => ({ path: i.path.join('.'), message: i.message })),
        }, 400);
      }
      c.set('validatedBody', result.data);
      await next();
    } catch {
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }
  };
}
