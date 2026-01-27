import { Hono } from 'hono';
import api from './api/index';

type Env = {
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
};

const app = new Hono<Env>();

// Mount API routes
app.route('/api', api);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

export default app;
