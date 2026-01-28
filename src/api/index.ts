import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import { createResourceRouter } from './engine/route-engine';
import { getDefaultSchema } from './engine/schema-loader';
import { loadApiConfigs } from './config-loader';
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

// Dynamically load all API configs from config/api directory
const schemaRegistry = getDefaultSchema();
const allConfigs = loadApiConfigs();

console.log(`\n📋 Loaded ${allConfigs.length} API configs dynamically\n`);

// Register all resource routes
for (const config of allConfigs) {
  const router = createResourceRouter(config, schemaRegistry);
  protectedApi.route(config.basePath, router);
}

api.route('/', protectedApi);

export default api;
