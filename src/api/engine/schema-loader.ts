/**
 * Dynamic Schema Loader
 *
 * Loads database schema from a configurable source.
 * Supports loading from:
 * - Default TypeScript schema (db/schema.ts)
 * - Generated schema from JSON configs (db/schema.generated.ts)
 * - JSON configs directly (future)
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

  // Check if app specifies a custom schema source
  if (app.schemaSource === 'config/schema') {
    // Load from generated schema (JSON configs converted to TypeScript)
    return loadGeneratedSchema();
  }

  // Default: use the standard schema
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
 * Dynamically maps all table exports to their Drizzle table objects.
 */
function buildSchemaRegistry(schema: any): Record<string, any> {
  const registry: Record<string, any> = {};

  // Dynamically register all tables from schema
  for (const [key, value] of Object.entries(schema)) {
    // Only include SQLite tables (they have a _ property)
    if (value && typeof value === 'object' && '_' in value) {
      registry[key] = value;
    }
  }

  return registry;
}

/**
 * Get the default schema (shared by all apps for now).
 */
export function getDefaultSchema(): Record<string, any> {
  return buildSchemaRegistry(defaultSchema);
}

/**
 * Load schema generated from JSON configs.
 * This function attempts to import schema.generated.ts if it exists.
 */
function loadGeneratedSchema(): Record<string, any> {
  try {
    // Try to dynamically import the generated schema
    // In production, you would run `npm run schema:generate` first
    const generatedSchema = require('../../db/schema.generated');
    return buildSchemaRegistry(generatedSchema);
  } catch (error) {
    console.warn('Generated schema not found. Run `npm run schema:generate` to create it.');
    console.warn('Falling back to default schema.');
    return buildSchemaRegistry(defaultSchema);
  }
}
