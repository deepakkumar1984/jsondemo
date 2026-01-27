import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import { createResourceRouter } from './engine/route-engine';
import { getDefaultSchema } from './engine/schema-loader';
import departmentsConfig from '../../config/api/departments.json';
import positionsConfig from '../../config/api/positions.json';
import employeesConfig from '../../config/api/employees.json';
import employeeDocumentsConfig from '../../config/api/employee-documents.json';
import payrollRunsConfig from '../../config/api/payroll-runs.json';
import salaryStructuresConfig from '../../config/api/salary-structures.json';
import jobPostingsConfig from '../../config/api/job-postings.json';
import performanceReviewsConfig from '../../config/api/performance-reviews.json';
import attendanceConfig from '../../config/api/attendance.json';
import leaveRequestsConfig from '../../config/api/leave-requests.json';
import leaveTypesConfig from '../../config/api/leave-types.json';
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

// Load all configs synchronously and create routers
const schemaRegistry = getDefaultSchema();
const allConfigs = [
  departmentsConfig as unknown as any,
  positionsConfig as unknown as any,
  employeesConfig as unknown as any,
  employeeDocumentsConfig as unknown as any,
  payrollRunsConfig as unknown as any,
  salaryStructuresConfig as unknown as any,
  jobPostingsConfig as unknown as any,
  performanceReviewsConfig as unknown as any,
  attendanceConfig as unknown as any,
  leaveRequestsConfig as unknown as any,
  leaveTypesConfig as unknown as any,
];

// Register all resource routes
for (const config of allConfigs) {
  const router = createResourceRouter(config, schemaRegistry);
  protectedApi.route(config.basePath, router);
}

api.route('/', protectedApi);

export default api;
