import type { Hono } from 'hono';
import type { ResourceApiConfig } from './types';
import { createResourceRouter } from './route-engine';

// Import all API config JSON files
import departmentsConfig from '../../../config/api/departments.json';
import positionsConfig from '../../../config/api/positions.json';
import employeesConfig from '../../../config/api/employees.json';
import employeeDocumentsConfig from '../../../config/api/employee-documents.json';
import payrollRunsConfig from '../../../config/api/payroll-runs.json';
import salaryStructuresConfig from '../../../config/api/salary-structures.json';
import jobPostingsConfig from '../../../config/api/job-postings.json';
import performanceReviewsConfig from '../../../config/api/performance-reviews.json';
import attendanceConfig from '../../../config/api/attendance.json';
import leaveRequestsConfig from '../../../config/api/leave-requests.json';
import leaveTypesConfig from '../../../config/api/leave-types.json';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const configs: ResourceApiConfig[] = [
  departmentsConfig as unknown as ResourceApiConfig,
  positionsConfig as unknown as ResourceApiConfig,
  employeesConfig as unknown as ResourceApiConfig,
  employeeDocumentsConfig as unknown as ResourceApiConfig,
  payrollRunsConfig as unknown as ResourceApiConfig,
  salaryStructuresConfig as unknown as ResourceApiConfig,
  jobPostingsConfig as unknown as ResourceApiConfig,
  performanceReviewsConfig as unknown as ResourceApiConfig,
  attendanceConfig as unknown as ResourceApiConfig,
  leaveRequestsConfig as unknown as ResourceApiConfig,
  leaveTypesConfig as unknown as ResourceApiConfig,
];

export function loadAllResourceRouters(): { basePath: string; router: Hono<Env> }[] {
  return configs.map((config) => ({
    basePath: config.basePath,
    router: createResourceRouter(config),
  }));
}

export { createResourceRouter } from './route-engine';
export type { ResourceApiConfig } from './types';
