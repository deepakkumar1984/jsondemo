/**
 * Dynamic API Loader
 *
 * Loads API route configurations from configurable paths.
 * Reads the central apps.json config to discover where API configs are located.
 */

import type { Hono } from 'hono';
import type { ResourceApiConfig } from './types';
import { createResourceRouter } from './route-engine';
import { getDefaultSchema } from './schema-loader';

// Import all API config JSON files directly (works with Vite and Wrangler)
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

export interface AppConfig {
  id: string;
  name: string;
  prefix: string;
  icon?: string;
  schemaSource?: string;
  apiConfigPath: string;
  pagesConfigPath: string;
}

export interface AppsConfig {
  apps: AppConfig[];
}

// All configs imported directly (reliable across all environments)
const allConfigs: ResourceApiConfig[] = [
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

/**
 * Load all API configs and create their routers.
 * Returns an array of { basePath, router, appId } tuples.
 */
export async function loadAllApiConfigs(): Promise<
  Array<{ basePath: string; router: Hono<Env>; appId: string }>
> {
  const schemaRegistry = getDefaultSchema();

  // For now, all configs belong to the "hrm" app
  // In the future, we could organize configs by app folders
  return allConfigs.map((config) => ({
    basePath: config.basePath,
    router: createResourceRouter(config, schemaRegistry),
    appId: 'hrm',
  }));
}

/**
 * Load API configs for a specific app.
 */
export async function loadApiConfigsForApp(
  appId: string
): Promise<Array<{ basePath: string; router: Hono<Env> }>> {
  const allConfigs = await loadAllApiConfigs();
  return allConfigs
    .filter((c) => c.appId === appId)
    .map((c) => ({ basePath: c.basePath, router: c.router }));
}

/**
 * Get the list of all available API endpoints across all apps.
 * Useful for documentation and debugging.
 */
export async function listAllApiEndpoints(): Promise<
  Array<{ path: string; resource: string; appId: string }>
> {
  const endpoints: Array<{ path: string; resource: string; appId: string }> = [];

  for (const config of allConfigs) {
    const basePath = config.basePath;

    if (config.list?.enabled) {
      endpoints.push({ path: `GET ${basePath}`, resource: config.resource, appId: 'hrm' });
    }
    if (config.getById?.enabled) {
      endpoints.push({ path: `GET ${basePath}/:id`, resource: config.resource, appId: 'hrm' });
    }
    if (config.create?.enabled) {
      endpoints.push({ path: `POST ${basePath}`, resource: config.resource, appId: 'hrm' });
    }
    if (config.update?.enabled) {
      endpoints.push({ path: `PUT ${basePath}/:id`, resource: config.resource, appId: 'hrm' });
    }
    if (config.delete?.enabled) {
      endpoints.push({ path: `DELETE ${basePath}/:id`, resource: config.resource, appId: 'hrm' });
    }
    if (config.customEndpoints) {
      for (const ep of config.customEndpoints) {
        endpoints.push({
          path: `${ep.method.toUpperCase()} ${basePath}${ep.path}`,
          resource: config.resource,
          appId: 'hrm',
        });
      }
    }
  }

  return endpoints;
}
