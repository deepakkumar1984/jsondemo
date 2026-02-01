import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import { apiConfigs } from './configs.generated';
import { createRouterFromConfig, ApiConfig } from './engine/route-engine';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const api = new Hono<Env>();

// CORS for all routes
api.use('*', cors());

// Public routes (no auth required)
api.route('/auth', auth);

// Auto-register config-driven API routes (synchronous - runs at module load time)
for (const [resource, config] of Object.entries(apiConfigs)) {
  // Strip /api prefix from basePath since this router is already mounted at /api
  const routePath = (config as ApiConfig).basePath.replace(/^\/api/, '') || '/';
  console.log(`[API] Registering config-driven route: ${routePath} (from ${(config as ApiConfig).basePath})`);
  const router = createRouterFromConfig(config as ApiConfig);
  api.route(routePath, router);
}

console.log(`[API] Registered ${Object.keys(apiConfigs).length} config-driven API routes`);

export default api;
