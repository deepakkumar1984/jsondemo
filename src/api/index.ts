import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import employees from './routes/employees';
import departments from './routes/departments';
import positions from './routes/positions';
import documents from './routes/documents';
import payroll from './routes/payroll';
import talent from './routes/talent';
import workforce from './routes/workforce';
import { authMiddleware } from './middleware/auth';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };
const api = new Hono<Env>();

// CORS for all routes
api.use('*', cors());

// Public routes (no auth required)
api.route('/auth', auth);

// Protected routes (auth middleware applied)
const protectedApi = new Hono<Env>();
protectedApi.use('*', authMiddleware);
protectedApi.route('/employees', employees);
protectedApi.route('/departments', departments);
protectedApi.route('/positions', positions);
protectedApi.route('/documents', documents);
protectedApi.route('/payroll', payroll);
protectedApi.route('/talent', talent);
protectedApi.route('/workforce', workforce);

api.route('/', protectedApi);

export default api;
