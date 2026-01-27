import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import { loadAllResourceRouters } from './engine';
import { authMiddleware } from './middleware/auth';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const api = new Hono<Env>();

// CORS for all routes
api.use('*', cors());

// Public routes (no auth required)
api.route('/auth', auth);

// Protected config-driven routes
const protectedApi = new Hono<Env>();
protectedApi.use('*', authMiddleware);

const resourceRouters = loadAllResourceRouters();
for (const { basePath, router } of resourceRouters) {
  protectedApi.route(basePath, router);
}

api.route('/', protectedApi);

export default api;
