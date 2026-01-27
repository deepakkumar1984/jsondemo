/**
 * Dynamic Schema Loader
 *
 * Loads database schema from a configurable source.
 * Currently supports loading from the default db/schema.ts module.
 * Future: Could load from JSON configs, remote sources, or multiple schema files.
 */

import * as defaultSchema from '../../db/schema';

export type SchemaSource = string | Record<string, any>;

export interface SchemaLoaderConfig {
  apps: Array<{
    id: string;
    schemaSource?: string;
  }>;
}

/**
 * Load schema for a specific app by ID.
 * Returns a map of table names to Drizzle table objects.
 */
export function loadSchemaForApp(
  appId: string,
  config: SchemaLoaderConfig
): Record<string, any> {
  const app = config.apps.find((a) => a.id === appId);
  if (!app) {
    throw new Error(`App "${appId}" not found in configuration`);
  }

  // For now, all apps share the same schema
  // In the future, each app could have its own schema
  return buildSchemaRegistry(defaultSchema);
}

/**
 * Load schema for all configured apps.
 * Returns a map of app ID to schema registry.
 */
export function loadAllSchemas(
  config: SchemaLoaderConfig
): Record<string, Record<string, any>> {
  const result: Record<string, Record<string, any>> = {};

  for (const app of config.apps) {
    result[app.id] = loadSchemaForApp(app.id, config);
  }

  return result;
}

/**
 * Build a schema registry from a schema module.
 * Maps table names to their Drizzle table objects.
 */
function buildSchemaRegistry(schema: any): Record<string, any> {
  return {
    users: schema.users,
    departments: schema.departments,
    positions: schema.positions,
    employees: schema.employees,
    employeeDocuments: schema.employeeDocuments,
    salaryStructures: schema.salaryStructures,
    payComponents: schema.payComponents,
    employeeSalaries: schema.employeeSalaries,
    payrollRuns: schema.payrollRuns,
    payslips: schema.payslips,
    jobPostings: schema.jobPostings,
    applicants: schema.applicants,
    performanceReviews: schema.performanceReviews,
    leaveTypes: schema.leaveTypes,
    leaveBalances: schema.leaveBalances,
    leaveRequests: schema.leaveRequests,
    attendance: schema.attendance,
  };
}

/**
 * Get the default schema (shared by all apps for now).
 */
export function getDefaultSchema(): Record<string, any> {
  return buildSchemaRegistry(defaultSchema);
}
