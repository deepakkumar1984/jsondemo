/**
 * Dynamic Schema Loader
 *
 * Loads database schema from the Data API or local configuration.
 * Supports loading from:
 * - Data API (remote collections)
 * - Local JSON configs (fallback)
 */

import { BlazorlyDataServiceClient, Collection } from '../../db/BlazorlyDataServiceClient';
import { createDataClient, DataApiEnv } from '../../db/data-client';

export type SchemaSource = 'api' | 'local' | string;

export interface SchemaLoaderConfig {
  apps: Array<{
    id: string;
    schemaSource?: SchemaSource;
  }>;
}

/**
 * Schema registry cache
 */
let schemaCache: Collection[] | null = null;
let schemaCacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Load schema from the Data API
 *
 * @param client - BlazorlyDataServiceClient instance
 * @returns Promise resolving to array of collections
 */
export async function loadSchemaFromApi(client: BlazorlyDataServiceClient): Promise<Collection[]> {
  const now = Date.now();

  // Return cached schema if still valid
  if (schemaCache && now - schemaCacheTimestamp < CACHE_TTL) {
    return schemaCache;
  }

  try {
    schemaCache = await client.getCollections();
    schemaCacheTimestamp = now;
    return schemaCache;
  } catch (error) {
    console.error('Failed to load schema from API:', error);

    // Return cached schema if available, even if expired
    if (schemaCache) {
      console.warn('Using stale cached schema');
      return schemaCache;
    }

    throw error;
  }
}

/**
 * Load schema for a specific app by ID.
 * Returns a map of table names to collection definitions.
 *
 * @param appId - The app ID
 * @param config - Schema loader configuration
 * @param env - Environment bindings for Data API
 */
export async function loadSchemaForApp(
  appId: string,
  config: SchemaLoaderConfig,
  env: DataApiEnv
): Promise<Record<string, Collection>> {
  const app = config.apps.find((a) => a.id === appId);
  if (!app) {
    throw new Error(`App "${appId}" not found in configuration`);
  }

  const client = createDataClient(env);
  const collections = await loadSchemaFromApi(client);

  return buildSchemaRegistry(collections);
}

/**
 * Load schema for all configured apps.
 * Returns a map of app ID to schema registry.
 */
export async function loadAllSchemas(
  config: SchemaLoaderConfig,
  env: DataApiEnv
): Promise<Record<string, Record<string, Collection>>> {
  const result: Record<string, Record<string, Collection>> = {};
  const client = createDataClient(env);
  const collections = await loadSchemaFromApi(client);
  const registry = buildSchemaRegistry(collections);

  for (const app of config.apps) {
    result[app.id] = registry;
  }

  return result;
}

/**
 * Build a schema registry from collections array.
 * Maps collection names to their definitions.
 */
function buildSchemaRegistry(collections: Collection[]): Record<string, Collection> {
  const registry: Record<string, Collection> = {};

  for (const collection of collections) {
    registry[collection.collection] = collection;
  }

  return registry;
}

/**
 * Get collection names from the API
 *
 * @param env - Environment bindings
 * @returns Promise resolving to array of collection names
 */
export async function getCollectionNames(env: DataApiEnv): Promise<string[]> {
  const client = createDataClient(env);
  const collections = await loadSchemaFromApi(client);
  return collections.map(c => c.collection);
}

/**
 * Get a specific collection schema
 *
 * @param collectionName - Name of the collection
 * @param env - Environment bindings
 * @returns Promise resolving to the collection or null if not found
 */
export async function getCollectionSchema(
  collectionName: string,
  env: DataApiEnv
): Promise<Collection | null> {
  const client = createDataClient(env);

  try {
    return await client.getCollection(collectionName);
  } catch {
    return null;
  }
}

/**
 * Clear the schema cache
 * Useful when schema changes are made
 */
export function clearSchemaCache(): void {
  schemaCache = null;
  schemaCacheTimestamp = 0;
}

/**
 * Export schema to JSON
 *
 * @param env - Environment bindings
 * @returns Promise resolving to schema export
 */
export async function exportSchema(env: DataApiEnv): Promise<{
  version: string;
  collections: Collection[];
}> {
  const client = createDataClient(env);
  return await client.exportSchema();
}

/**
 * Import schema from JSON
 *
 * @param schema - Schema to import
 * @param env - Environment bindings
 * @returns Promise resolving to import result
 */
export async function importSchema(
  schema: { version: string; collections: Collection[] },
  env: DataApiEnv
): Promise<{ message: string; collections_imported: number }> {
  const client = createDataClient(env);
  const result = await client.importSchema(schema);

  // Clear cache after import
  clearSchemaCache();

  return result;
}
