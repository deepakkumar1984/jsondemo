import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import { loadApiConfigs } from './config-loader';
import { createRouterFromConfig } from './engine/route-engine';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const api = new Hono<Env>();

// CORS for all routes
api.use('*', cors());

// Public routes (no auth required)
api.route('/auth', auth);

// Auto-register config-driven API routes
// This runs at module initialization time
(async () => {
  try {
    const apiConfigs = await loadApiConfigs();

    for (const [resource, config] of Object.entries(apiConfigs)) {
      console.log(`[API] Registering config-driven route: ${config.basePath}`);
      const router = createRouterFromConfig(config);
      api.route(config.basePath, router);
    }

    console.log(`[API] Registered ${Object.keys(apiConfigs).length} config-driven API routes`);
  } catch (error) {
    console.error('[API] Error loading config-driven routes:', error);
  }
})();

export default api;
