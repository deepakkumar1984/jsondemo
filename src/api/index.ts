import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import tasksRoutes from './routes/tasks';
import projectsRoutes from './routes/projects';
import usersRoutes from './routes/users';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const api = new Hono<Env>();

// CORS for all routes
api.use('*', cors());

// Public routes (no auth required)
api.route('/auth', auth);
api.route('/tasks', tasksRoutes);
api.route('/projects', projectsRoutes);
api.route('/users', usersRoutes);

export default api;
