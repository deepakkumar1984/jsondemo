import type { Context } from 'hono';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

/**
 * Custom handler registry - dynamically extensible
 * Add custom handlers here as needed for specific API endpoints
 */
export const customHandlerRegistry: Record<string, (c: Context<Env>) => Promise<Response>> = {
  // Add custom handlers here dynamically as needed
  // Example:
  // 'resource.handlerName': async (c) => { ... }
};
