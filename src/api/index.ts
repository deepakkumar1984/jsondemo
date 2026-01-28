import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const api = new Hono<Env>();

// CORS for all routes
api.use('*', cors());

// Public routes (no auth required)
api.route('/auth', auth);

export default api;
