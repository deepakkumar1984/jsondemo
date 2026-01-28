import * as schema from '../../db/schema';

/**
 * Dynamically build schema registry from all table exports
 * Automatically picks up any table defined in schema.ts
 */
export const schemaRegistry: Record<string, any> = {};

// Dynamically register all tables from schema
for (const [key, value] of Object.entries(schema)) {
  // Only include SQLite tables (they have a getSQL method)
  if (value && typeof value === 'object' && '_' in value) {
    schemaRegistry[key] = value;
    console.log(`✓ Registered table: ${key}`);
  }
}
