/**
 * Data Client Factory
 *
 * Creates BlazorlyDataServiceClient instances from worker environment bindings.
 * This factory centralizes client configuration and makes it easy to access
 * the data API from anywhere in the application.
 */

import { BlazorlyDataServiceClient, ClientConfig } from './BlazorlyDataServiceClient';

/**
 * Environment bindings for Data API configuration
 */
export interface DataApiEnv {
  DATA_API_URL: string;
  DATA_API_KEY?: string;
  DATA_TENANT_ID?: string;
  DATA_DATABASE?: string;
}

/**
 * Create a BlazorlyDataServiceClient from worker environment bindings
 *
 * @param env - Worker environment bindings containing Data API configuration
 * @returns Configured BlazorlyDataServiceClient instance
 * @throws Error if DATA_API_URL is not configured
 *
 * @example
 * ```typescript
 * // In a Hono route handler
 * const client = createDataClient(c.env);
 * const items = await client.getItems('todos');
 * ```
 */
export function createDataClient(env: DataApiEnv): BlazorlyDataServiceClient {
  if (!env.DATA_API_URL) {
    throw new Error('DATA_API_URL environment variable is required');
  }

  const config: ClientConfig = {
    baseUrl: env.DATA_API_URL,
  };

  if (env.DATA_API_KEY) {
    config.apiKey = env.DATA_API_KEY;
  }

  if (env.DATA_TENANT_ID) {
    config.tenantId = env.DATA_TENANT_ID;
  }

  if (env.DATA_DATABASE) {
    config.database = env.DATA_DATABASE;
  }

  return new BlazorlyDataServiceClient(config);
}

/**
 * Type for the combined environment bindings (Data API + other app bindings)
 */
export type AppEnv = DataApiEnv & {
  JWT_SECRET: string;
  // Add other environment bindings here as needed
};
