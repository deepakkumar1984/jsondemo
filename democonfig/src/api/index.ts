import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import { apiRoutes } from './routes.generated';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const api = new Hono<Env>();

// CORS for all routes
api.use('*', cors());

// Public routes (no auth required)
api.route('/auth', auth);

// Auto-register TypeScript API routes
for (const route of apiRoutes) {
  console.log(`[API] Registering TypeScript route: ${route.path}`);
  api.route(route.path, route.router);
}

console.log(`[API] Registered ${apiRoutes.length} TypeScript API routes`);

export default api;
