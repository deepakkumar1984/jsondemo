/**
 * Migrate Schema to Data API
 *
 * Reads JSON schema configs from config/schema and creates collections
 * in the Blazorly Data API using BlazorlyDataServiceClient.
 *
 * Usage:
 *   bun run tsx scripts/schema/migrate-to-data-api.ts [options]
 *
 * Options:
 *   --drop     Drop and recreate all collections (WARNING: deletes data)
 *   --alter    Alter existing tables to add missing columns (safe, no data loss)
 *   --force    Force create tables even if collection metadata exists
 *   --verify   Only verify tables exist, don't create anything
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { BlazorlyDataServiceClient, Collection, Field, FieldType } from '../../src/db/BlazorlyDataServiceClient';

/**
 * Load environment variables from wrangler.toml [vars] section
 */
function loadWranglerVars(): Record<string, string> {
  const wranglerPath = join(process.cwd(), 'wrangler.toml');
  if (!existsSync(wranglerPath)) {
    return {};
  }

  try {
    const content = readFileSync(wranglerPath, 'utf-8');
    const vars: Record<string, string> = {};

    // Find [vars] section and parse it
    const varsMatch = content.match(/\[vars\]([\s\S]*?)(?=\[|$)/);
    if (varsMatch) {
      const varsSection = varsMatch[1];
      // Parse KEY = "value" or KEY = value patterns
      const lineRegex = /^(\w+)\s*=\s*"?([^"\n]+)"?/gm;
      let match;
      while ((match = lineRegex.exec(varsSection)) !== null) {
        vars[match[1]] = match[2].trim();
      }
    }

    return vars;
  } catch {
    return {};
  }
}

// Configuration interface matching config/schema/*.json format
interface ColumnConfig {
  name: string;
  type: string; // SQLite or PostgreSQL types
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
  default?: string | number | boolean;
  defaultFn?: 'uuid';
  enum?: string[];
  references?: {
    table: string;
    column: string;
    onDelete?: string;
  };
  description?: string;
}

interface TableConfig {
  table: string;
  description?: string;
  columns: ColumnConfig[];
  indexes?: { name: string; columns: string[]; unique?: boolean }[];
}

interface MigrationOptions {
  drop?: boolean;
  alter?: boolean;
  force?: boolean;
  verify?: boolean;
}

/**
 * Map SQLite/PostgreSQL types to Data API field types
 */
function mapColumnType(col: ColumnConfig): FieldType {
  // If it's a UUID default, use uuid type
  if (col.defaultFn === 'uuid') {
    return 'uuid';
  }

  // If it references another table's id column, use uuid type
  // (since all our primary keys are UUID)
  if (col.references && col.references.column === 'id') {
    return 'uuid';
  }

  // If it has enum, it's still a string type
  if (col.enum) {
    return 'string';
  }

  // Map column types to Data API types
  switch (col.type.toLowerCase()) {
    // String types
    case 'text':
    case 'varchar':
    case 'char':
      // Check if it's a timestamp field by name convention (strict check)
      if (col.name.toLowerCase().endsWith('_at') || col.default === 'CURRENT_TIMESTAMP') {
        return 'timestamp';
      }
      return 'string';

    // Integer types
    case 'integer':
    case 'smallint':
    case 'bigint':
    case 'serial':
    case 'bigserial':
      return 'integer';

    // Float types
    case 'real':
    case 'double precision':
    case 'numeric':
    case 'decimal':
      return 'float';

    // Boolean
    case 'boolean':
      return 'boolean';

    // Timestamp types
    case 'timestamp':
    case 'timestamptz':
      return 'timestamp';

    // Date/time types
    case 'date':
      return 'date';
    case 'time':
    case 'timetz':
    case 'interval':
      return 'string'; // Store as string

    // UUID
    case 'uuid':
      return 'uuid';

    // JSON types
    case 'json':
    case 'jsonb':
      return 'json';

    // Binary types
    case 'bytea':
    case 'blob':
      return 'json'; // Store as base64 in JSON

    default:
      return 'string';
  }
}

/**
 * Convert column name from camelCase to snake_case for database
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert a column config to a Data API Field
 * @param col - Column configuration
 * @param skipForeignKeys - If true, don't include foreign key constraints (for initial table creation)
 */
function convertColumnToField(col: ColumnConfig, skipForeignKeys = false): Field {
  const field: Field = {
    field: toSnakeCase(col.name),
    type: mapColumnType(col),
    schema: {
      is_primary_key: col.primaryKey || false,
      is_nullable: !col.notNull,
      is_unique: col.unique || false,
    },
    meta: {
      required: col.notNull || false,
    }
  };

  // For UUID fields with auto-generation, don't set has_auto_increment
  // (that's only for integer types). The API will handle UUID generation.
  // Just mark it as a UUID primary key - the application generates UUIDs.

  // Add default value (including SQL functions like CURRENT_TIMESTAMP)
  if (col.default !== undefined && col.defaultFn !== 'uuid') {
    field.schema!.default_value = col.default;
  }

  // Add foreign key reference (unless skipped for initial table creation)
  if (col.references && !skipForeignKeys) {
    field.schema!.foreign_key_table = col.references.table;
    field.schema!.foreign_key_column = col.references.column;
    if (col.references.onDelete) {
      field.schema!.on_delete = col.references.onDelete.toUpperCase();
    }
  }

  return field;
}

/**
 * Convert a table config to a Data API Collection
 * @param config - Table configuration
 * @param skipForeignKeys - If true, don't include foreign key constraints
 */
function convertTableToCollection(config: TableConfig, skipForeignKeys = false): Collection {
  return {
    collection: config.table,
    meta: {
      note: config.description,
    },
    schema: {
      name: config.table,
    },
    fields: config.columns.map(col => convertColumnToField(col, skipForeignKeys)),
  };
}

/**
 * Check if a table has foreign key references
 */
function hasForeignKeys(config: TableConfig): boolean {
  return config.columns.some(col => col.references);
}

/**
 * Load all schema configs from the config/schema directory
 */
function loadSchemaConfigs(schemaDir: string): TableConfig[] {
  const files = readdirSync(schemaDir).filter(f =>
    f.endsWith('.json') && !f.includes('format')
  );

  return files.map(file => {
    const content = readFileSync(join(schemaDir, file), 'utf-8');
    return JSON.parse(content) as TableConfig;
  });
}

/**
 * Topological sort to ensure tables are created in dependency order
 */
function topologicalSort(configs: TableConfig[]): TableConfig[] {
  const sorted: TableConfig[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const configMap = new Map(configs.map(c => [c.table, c]));

  function visit(tableName: string) {
    if (visited.has(tableName)) return;
    if (visiting.has(tableName)) return;

    visiting.add(tableName);

    const config = configMap.get(tableName);
    if (!config) return;

    for (const col of config.columns) {
      if (col.references && col.references.table !== tableName) {
        visit(col.references.table);
      }
    }

    visiting.delete(tableName);
    visited.add(tableName);
    sorted.push(config);
  }

  for (const config of configs) {
    visit(config.table);
  }

  return sorted;
}

/**
 * Check if a table actually exists by trying to query it
 */
async function checkTableExists(client: BlazorlyDataServiceClient, tableName: string): Promise<boolean> {
  try {
    // Try to get items with limit 0 - this will fail if table doesn't exist
    await client.getItems(tableName, { limit: 1 });
    return true;
  } catch (error) {
    const message = (error as Error).message.toLowerCase();
    // Table doesn't exist if we get "not found" or "does not exist" errors
    if (message.includes('not found') || message.includes('does not exist') || message.includes('no such table')) {
      return false;
    }
    // For other errors, assume table exists but has other issues
    return true;
  }
}

/**
 * Get existing fields for a collection
 */
async function getExistingFields(client: BlazorlyDataServiceClient, tableName: string): Promise<string[]> {
  try {
    const collection = await client.getCollection(tableName);
    return collection.fields.map(f => f.field);
  } catch {
    return [];
  }
}

/**
 * Main migration function
 */
async function migrateToDataApi(options: MigrationOptions = {}) {
  // Load environment variables from wrangler.toml as fallback
  const wranglerVars = loadWranglerVars();

  // Environment variables take precedence over wrangler.toml
  const baseUrl = process.env.DATA_API_URL || wranglerVars.DATA_API_URL || 'http://localhost:8789';
  const apiKey = process.env.DATA_API_KEY || wranglerVars.DATA_API_KEY;
  const tenantId = process.env.DATA_TENANT_ID || wranglerVars.DATA_TENANT_ID;
  const database = process.env.DATA_DATABASE || wranglerVars.DATA_DATABASE;

  if (!apiKey || !tenantId) {
    console.error('Error: DATA_API_KEY and DATA_TENANT_ID are required');
    console.error('\nThey can be set via:');
    console.error('  1. Environment variables');
    console.error('  2. wrangler.toml [vars] section');
    console.error('  3. .env file');
    console.error('\nExample wrangler.toml:');
    console.error('  [vars]');
    console.error('  DATA_API_URL = "http://localhost:8789"');
    console.error('  DATA_API_KEY = "your-api-key"');
    console.error('  DATA_TENANT_ID = "your-tenant-id"');
    console.error('  DATA_DATABASE = "your-database"');
    process.exit(1);
  }

  console.log('Connecting to Data API:', baseUrl);
  console.log('Tenant:', tenantId);
  console.log('Database:', database || '(default)');
  console.log('Mode:', options.drop ? 'DROP & RECREATE' : options.alter ? 'ALTER (add missing columns)' : options.verify ? 'VERIFY ONLY' : 'CREATE');
  console.log('');

  const client = new BlazorlyDataServiceClient({
    baseUrl,
    apiKey,
    tenantId,
    database,
  });

  // Test connection
  try {
    await client.healthCheck();
    console.log('✓ Connected to Data API\n');
  } catch (error) {
    console.error('✗ Failed to connect to Data API:', (error as Error).message);
    process.exit(1);
  }

  // Load schema configs
  const schemaDir = join(process.cwd(), 'config/schema');
  console.log('Loading schema configs from:', schemaDir);
  const configs = loadSchemaConfigs(schemaDir);
  console.log(`Found ${configs.length} table configs\n`);

  // Sort by dependencies
  const sortedConfigs = topologicalSort(configs);

  // Get existing collections from metadata
  let existingCollectionMeta: string[] = [];
  try {
    const collections = await client.getCollections();
    existingCollectionMeta = collections.map(c => c.collection);
  } catch {
    // No collections exist
  }

  // Check which tables actually exist (not just metadata) - IN PARALLEL
  console.log('Checking table status...');
  const tableStatus: Map<string, { metaExists: boolean; tableExists: boolean; existingFields: string[] }> = new Map();

  // Run all status checks in parallel for speed
  const statusChecks = await Promise.all(
    sortedConfigs.map(async (config) => {
      const metaExists = existingCollectionMeta.includes(config.table);
      const tableExists = await checkTableExists(client, config.table);
      const existingFields = tableExists ? await getExistingFields(client, config.table) : [];
      return { table: config.table, metaExists, tableExists, existingFields };
    })
  );

  // Store results and display
  for (const result of statusChecks) {
    tableStatus.set(result.table, {
      metaExists: result.metaExists,
      tableExists: result.tableExists,
      existingFields: result.existingFields,
    });
    const status = result.tableExists ? '✓ exists' : result.metaExists ? '⚠ metadata only (table missing!)' : '○ new';
    console.log(`  ${result.table}: ${status}`);
  }
  console.log('');

  // Verify only mode
  if (options.verify) {
    const missing = [...tableStatus.entries()].filter(([_, s]) => !s.tableExists);
    if (missing.length > 0) {
      console.log('⚠ Missing tables:');
      missing.forEach(([name]) => console.log(`  - ${name}`));
      console.log('\nRun with --force to create missing tables');
      process.exit(1);
    } else {
      console.log('✓ All tables exist');
      process.exit(0);
    }
  }

  // Drop mode - delete all and recreate
  if (options.drop) {
    console.log('Dropping existing collections...');
    // Drop sequentially in reverse topological order (respects FK dependencies)
    const reverseOrder = [...sortedConfigs].reverse().map(c => c.table);
    // Also include any tables that exist in metadata but not in our configs
    const extraTables = existingCollectionMeta.filter(t => !reverseOrder.includes(t));
    const toDelete = [...extraTables, ...reverseOrder];

    for (const name of toDelete) {
      if (!existingCollectionMeta.includes(name)) continue;
      try {
        await client.deleteCollection(name);
        console.log(`  ✓ Dropped: ${name}`);
      } catch (error) {
        console.log(`  ⚠ Failed to drop ${name}: ${(error as Error).message}`);
      }
    }
    console.log('');
    // Reset status after drop
    tableStatus.forEach((_, key) => tableStatus.set(key, { metaExists: false, tableExists: false, existingFields: [] }));
  }

  // Phase 1: Create/alter collections WITHOUT foreign keys (to avoid circular dependency issues)
  // Since we skip FK constraints, all tables can be created in parallel!
  console.log(options.alter ? 'Phase 1: Altering collections...' : 'Phase 1: Creating tables (without foreign keys)...');

  type Phase1Result = {
    table: string;
    action: 'created' | 'altered' | 'skipped' | 'failed';
    fields?: number;
    addedFields?: string[];
    error?: string;
    needsFk: boolean;
  };

  const phase1Results = await Promise.all(
    sortedConfigs.map(async (config): Promise<Phase1Result> => {
      const collection = convertTableToCollection(config, true);
      const status = tableStatus.get(config.table)!;
      const needsFk = hasForeignKeys(config);

      // Existing table handling (Check for updates)
      if (status.tableExists) {
        const configFields = config.columns.map(c => toSnakeCase(c.name));
        const missingFields = configFields.filter(f => !status.existingFields.includes(f));

        // Debug logging for troubleshooting
        if (config.table === 'users') {
          console.log(`\n[DEBUG] Table: ${config.table}`);
          console.log(`[DEBUG] Existing fields in DB: ${status.existingFields.join(', ')}`);
          console.log(`[DEBUG] Config fields: ${configFields.join(', ')}`);
          console.log(`[DEBUG] Missing fields: ${missingFields.join(', ')}`);
        }

        // If no new fields, just check if we need to verify FKs
        // We comment this out to FORCE an update call to the API.
        // This ensures that if the metadata is out of sync with the actual DB table,
        // the API has a chance to run ALTER TABLE to fix it.
        /*
        if (missingFields.length === 0) {
          // If in alter mode, we previously returned needsFk: false here.
          // But returning needsFk allows Phase 2 to ensure FK constraints exist.
          return { table: config.table, action: 'skipped', needsFk };
        }
        */

        // If we have missing fields, apply them (implicitly enabling 'alter' behavior)
        try {
          await client.updateCollection(config.table, collection);
          
          // Verify if fields were actually added
          const updatedFields = await getExistingFields(client, config.table);
          const stillMissing = missingFields.filter(f => !updatedFields.includes(f));
          
          if (stillMissing.length > 0) {
             console.warn(`  ⚠ Warning: The migration ran but fields are still missing: ${stillMissing.join(', ')}.`);
             console.warn(`    The Data API ignored the request to add columns. You may need to use direct SQL or recreate the table.`);
             return { table: config.table, action: 'failed', error: 'Data API did not apply schema changes', needsFk: false };
          }
          
          return { table: config.table, action: 'altered', addedFields: missingFields, needsFk };
        } catch (error) {
          return { table: config.table, action: 'failed', error: (error as Error).message, needsFk: false };
        }
      }

      // If only metadata exists (no actual table), clean up orphan metadata first
      if (status.metaExists && !status.tableExists) {
        try {
          await client.deleteCollection(config.table);
        } catch {
          // Ignore delete errors
        }
      }

      // Create new collection (table doesn't exist) - WITHOUT foreign keys
      try {
        await client.createCollection(collection);
        return { table: config.table, action: 'created', fields: config.columns.length, needsFk };
      } catch (error) {
        return { table: config.table, action: 'failed', error: (error as Error).message, needsFk: false };
      }
    })
  );

  // Display results and count
  let created = 0, altered = 0, skipped = 0, failed = 0;
  const tablesNeedingFkUpdate: string[] = [];

  for (const result of phase1Results) {
    switch (result.action) {
      case 'created':
        console.log(`  ✓ Created: ${result.table} (${result.fields} fields)`);
        created++;
        if (result.needsFk) tablesNeedingFkUpdate.push(result.table);
        break;
      case 'altered':
        console.log(`  ✓ Altered: ${result.table} (added: ${result.addedFields?.join(', ')})`);
        altered++;
        if (result.needsFk) tablesNeedingFkUpdate.push(result.table);
        break;
      case 'skipped':
        console.log(`  - Skipped: ${result.table}`);
        skipped++;
        if (result.needsFk) tablesNeedingFkUpdate.push(result.table);
        break;
      case 'failed':
        console.log(`  ✗ Failed: ${result.table} - ${result.error}`);
        failed++;
        break;
    }
  }

  // Phase 2: Add foreign key constraints to tables that need them - IN PARALLEL
  if (tablesNeedingFkUpdate.length > 0 && failed === 0) {
    console.log('\nPhase 2: Adding foreign key constraints...');

    const fkResults = await Promise.all(
      tablesNeedingFkUpdate.map(async (tableName) => {
        const config = sortedConfigs.find(c => c.table === tableName)!;
        const collectionWithFk = convertTableToCollection(config, false);
        const fkCount = config.columns.filter(c => c.references).length;

        try {
          await client.updateCollection(tableName, collectionWithFk);
          return { table: tableName, success: true, fkCount };
        } catch (error) {
          return { table: tableName, success: false, error: (error as Error).message, fkCount };
        }
      })
    );

    let fkAdded = 0, fkFailed = 0;
    for (const result of fkResults) {
      if (result.success) {
        console.log(`  ✓ Added FK constraints: ${result.table} (${result.fkCount} constraints)`);
        fkAdded++;
      } else {
        console.log(`  ⚠ FK constraints skipped for ${result.table}: ${result.error}`);
        fkFailed++;
      }
    }

    if (fkAdded > 0) {
      console.log(`\nForeign key summary: ${fkAdded} tables updated, ${fkFailed} skipped`);
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Created: ${created}`);
  if (options.alter) console.log(`Altered: ${altered}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Migrate Schema to Data API

Usage:
  bun run tsx scripts/schema/migrate-to-data-api.ts [options]

Options:
  --drop     Drop and recreate all collections (WARNING: deletes data)
  --alter    Alter existing tables to add missing columns (safe, no data loss)
  --force    Force create tables even if collection metadata exists
  --verify   Only verify tables exist, don't create anything
  --help     Show this help message

Examples:
  # Create new tables (skip existing)
  bun run db:migrate

  # Add missing columns to existing tables
  bun run db:migrate -- --alter

  # Drop all and recreate (WARNING: deletes data)
  bun run db:migrate:fresh

  # Verify all tables exist
  bun run db:migrate -- --verify
`);
  process.exit(0);
}

const options: MigrationOptions = {
  drop: args.includes('--drop'),
  alter: args.includes('--alter'),
  force: args.includes('--force'),
  verify: args.includes('--verify'),
};

migrateToDataApi(options).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
