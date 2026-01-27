/**
 * API Engine Index
 *
 * Exports the dynamic API loader that reads all API configs
 * from the configured paths and generates Hono routers.
 */

export { createResourceRouter } from './route-engine';
export type { ResourceApiConfig } from './types';
export { getDefaultSchema, loadSchemaForApp, loadAllSchemas } from './schema-loader';
export { loadAllApiConfigs, loadApiConfigsForApp, listAllApiEndpoints } from './api-loader';
