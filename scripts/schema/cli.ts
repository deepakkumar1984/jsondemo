/**
 * Schema Management CLI
 *
 * Command-line interface for schema management tasks.
 * Provides commands for exporting, generating, and diffing schemas.
 */

import { join } from 'path';
import { loadSchemaConfigs } from './generator';
import { diffSchemas, generateDiffReport, generateMigrationHints } from './differ';
import { exportSchemaToJson } from './exporter';
import { regenerateSchema } from './generator';

const commands = {
  export: exportCommand,
  generate: generateCommand,
  diff: diffCommand,
  init: initCommand,
  help: helpCommand,
};

async function exportCommand(args: string[]) {
  const outputDir = args[0] || join(process.cwd(), 'config/schema');
  console.log('Exporting current schema to JSON configs...\n');
  exportSchemaToJson(outputDir);
}

async function generateCommand(args: string[]) {
  const schemaDir = args[0] || join(process.cwd(), 'config/schema');
  const outputFile = args[1] || join(process.cwd(), 'src/db/schema.generated.ts');

  console.log('Generating Drizzle schema from JSON configs...\n');
  regenerateSchema(schemaDir, outputFile);
}

async function diffCommand(args: string[]) {
  const oldDir = args[0] || join(process.cwd(), 'config/schema.backup');
  const newDir = args[1] || join(process.cwd(), 'config/schema');

  console.log('Comparing schemas...\n');

  try {
    const oldConfigs = loadSchemaConfigs(oldDir);
    const newConfigs = loadSchemaConfigs(newDir);

    const diff = diffSchemas(oldConfigs, newConfigs);
    const report = generateDiffReport(diff);

    console.log(report);

    const migrationHints = generateMigrationHints(diff);
    console.log('\nMIGRATION HINTS:');
    console.log('='.repeat(80));
    console.log(migrationHints);
  } catch (error: any) {
    console.error('Error comparing schemas:', error.message);
    process.exit(1);
  }
}

async function initCommand(args: string[]) {
  console.log('Initializing config-driven schema system...\n');

  // Step 1: Export existing schema
  console.log('Step 1: Exporting current TypeScript schema to JSON...');
  await exportCommand([]);

  console.log('\nStep 2: Generating Drizzle schema from JSON...');
  await generateCommand([]);

  console.log('\n✅ Schema system initialized successfully!');
  console.log('\nNext steps:');
  console.log('  1. Review the JSON configs in config/schema/');
  console.log('  2. Make any changes to the JSON configs as needed');
  console.log('  3. Run `npm run schema:generate` to regenerate schema.generated.ts');
  console.log('  4. Update apps.json schemaSource to "config/schema" to use generated schema');
  console.log('  5. Run `npm run db:generate` to create migrations');
}

async function helpCommand(args: string[]) {
  console.log(`
Schema Management CLI
=====================

Usage: npm run schema:<command> [args]

Commands:
  export [outputDir]           Export current schema to JSON configs
                               Default: config/schema/

  generate [schemaDir] [out]   Generate Drizzle schema from JSON configs
                               Default: config/schema/ → src/db/schema.generated.ts

  diff [oldDir] [newDir]       Compare two schema directories and show changes
                               Default: config/schema.backup/ vs config/schema/

  init                         Initialize config-driven schema (export + generate)

  help                         Show this help message

Examples:
  npm run schema:init
  npm run schema:export
  npm run schema:generate
  npm run schema:diff

Workflow:
  1. npm run schema:init              # Bootstrap JSON configs from existing schema
  2. Edit config/schema/*.json        # Make schema changes in JSON
  3. npm run schema:generate          # Regenerate TypeScript schema
  4. npm run db:generate              # Generate migrations with Drizzle
  5. npm run db:migrate               # Apply migrations to database
`);
}

// Main CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const commandArgs = args.slice(1);

  const commandFn = commands[command as keyof typeof commands];

  if (!commandFn) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "npm run schema:help" for usage information.');
    process.exit(1);
  }

  try {
    await commandFn(commandArgs);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
