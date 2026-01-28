/**
 * AI Config Generator CLI
 *
 * Usage:
 *   npm run generate schema "task management app with tasks, projects, users"
 *   npm run generate api tasks
 *   npm run generate pages employees
 */

import * as fs from 'fs';
import * as path from 'path';

async function generateConfig(
  type: 'schema' | 'api' | 'pages' | 'apps',
  description: string,
  workerUrl: string = 'http://localhost:8787'
) {
  console.log(`\n🤖 Generating ${type} for: "${description}"\n`);
  console.log('='.repeat(80));

  try {
    // Gather context from existing configs
    let context: any = {};

    if (type === 'api' || type === 'pages') {
      // Read existing schemas
      const schemaDir = 'config/schema';
      if (fs.existsSync(schemaDir)) {
        const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.json'));
        context.schemas = schemaFiles.map(file => {
          const content = JSON.parse(fs.readFileSync(path.join(schemaDir, file), 'utf-8'));
          return {
            table: content.table,
            columns: content.columns.map((col: any) => ({
              name: col.name,
              type: col.type,
              references: col.references
            }))
          };
        });
        console.log(`📋 Found ${context.schemas.length} existing schemas`);
      }
    }

    if (type === 'pages') {
      // Read existing APIs
      const apiDir = 'config/api';
      if (fs.existsSync(apiDir)) {
        const apiFiles = fs.readdirSync(apiDir).filter(f => f.endsWith('.json'));
        context.apis = apiFiles.map(file => {
          const content = JSON.parse(fs.readFileSync(path.join(apiDir, file), 'utf-8'));
          return {
            resource: content.resource,
            basePath: content.basePath,
            operations: Object.keys(content).filter(k => ['list', 'getById', 'create', 'update', 'delete'].includes(k))
          };
        });
        console.log(`🔌 Found ${context.apis.length} existing APIs`);
      }
    }

    if (type === 'apps') {
      // Read existing pages
      const pagesDir = 'config/pages';
      if (fs.existsSync(pagesDir)) {
        const entities = fs.readdirSync(pagesDir).filter(item =>
          fs.statSync(path.join(pagesDir, item)).isDirectory()
        );

        context.pages = entities.map(entity => {
          const entityDir = path.join(pagesDir, entity);
          const pageFiles = fs.readdirSync(entityDir).filter(f => f.endsWith('.json'));
          return {
            entity,
            pages: pageFiles.map(f => f.replace('.json', ''))
          };
        });
        console.log(`📄 Found ${context.pages.length} page groups`);
      }

      // Read existing apps.json if it exists
      const appsFile = 'config/apps.json';
      if (fs.existsSync(appsFile)) {
        context.existingApps = JSON.parse(fs.readFileSync(appsFile, 'utf-8'));
        console.log(`📱 Found existing apps config`);
      }
    }

    // Call AI worker
    console.log(`\n📡 Calling AI worker...`);
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, description, context })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Worker error: ${error}`);
      process.exit(1);
    }

    const result = await response.json();

    if (!result.success) {
      console.error(`❌ Generation failed: ${result.error}`);
      process.exit(1);
    }

    console.log(`✅ Generated ${result.generated} ${type} config(s)\n`);

    // Handle apps separately (returns single object, not array)
    if (type === 'apps') {
      const appsFile = 'config/apps.json';
      fs.writeFileSync(appsFile, JSON.stringify(result.config, null, 2));
      console.log(`💾 Saved to ${appsFile}\n`);

      console.log('✨ Apps config updated!\n');
      console.log('Next steps:');
      console.log('  1. Review config/apps.json');
      console.log('  2. Restart dev server to see navigation changes');
      return;
    }

    // Determine output directory for schema/api/pages
    let outputDir: string;
    if (type === 'schema') {
      outputDir = 'config/schema';
    } else if (type === 'api') {
      outputDir = 'config/api';
    } else {
      outputDir = 'config/pages';
    }

    // Create directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save configs (schema/api/pages only)
    console.log(`💾 Saving to ${outputDir}/\n`);
    const configs = result.configs || [];
    configs.forEach((config: any) => {
      let filepath: string;
      let displayPath: string;

      if (type === 'schema') {
        filepath = path.join(outputDir, `${config.table}.json`);
        displayPath = `${config.table}.json`;
      } else if (type === 'api') {
        filepath = path.join(outputDir, `${config.resource}.json`);
        displayPath = `${config.resource}.json`;
      } else {
        // Organize pages into folders: tasks/list.json instead of tasks-list.json
        const parts = config.page.split('/');
        if (parts.length === 2) {
          const [entity, pageName] = parts;
          const entityDir = path.join(outputDir, entity);
          if (!fs.existsSync(entityDir)) {
            fs.mkdirSync(entityDir, { recursive: true });
          }
          filepath = path.join(entityDir, `${pageName}.json`);
          displayPath = `${entity}/${pageName}.json`;
        } else {
          filepath = path.join(outputDir, `${config.page.replace('/', '-')}.json`);
          displayPath = `${config.page.replace('/', '-')}.json`;
        }
      }

      fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
      console.log(`   ✓ ${displayPath}`);

      // Show preview
      if (type === 'schema') {
        console.log(`     Table: ${config.table}`);
        console.log(`     Columns: ${config.columns.length}`);
      } else if (type === 'api') {
        console.log(`     Resource: ${config.resource}`);
        console.log(`     Path: ${config.basePath}`);
      } else {
        console.log(`     Page: ${config.page}`);
      }
      console.log();
    });

    // Validate generated configs
    console.log('✅ Validating configs...\n');
    const { validateFile } = await import('./validate-config.js');

    let allValid = true;
    for (const config of configs) {
      let filepath: string;

      if (type === 'schema') {
        filepath = path.join(outputDir, `${config.table}.json`);
      } else if (type === 'api') {
        filepath = path.join(outputDir, `${config.resource}.json`);
      } else {
        // Handle folder structure for pages
        const parts = config.page.split('/');
        if (parts.length === 2) {
          const [entity, pageName] = parts;
          filepath = path.join(outputDir, entity, `${pageName}.json`);
        } else {
          filepath = path.join(outputDir, `${config.page.replace('/', '-')}.json`);
        }
      }

      const isValid = validateFile(filepath);
      if (!isValid) {
        allValid = false;
      }
    }

    if (!allValid) {
      console.log('\n⚠️  Some configs have validation issues - please review');
    }

    // Next steps
    console.log('\n✨ Generation complete!\n');
    console.log('Next steps:');
    if (type === 'schema') {
      console.log('  1. Review schemas in config/schema/');
      console.log('  2. Run: npm run schema:generate');
      console.log('  3. Run: npm run db:generate && npm run db:migrate');
      console.log('  4. Generate APIs: npm run generate api "tasks, projects, users"');
    } else if (type === 'api') {
      console.log('  1. Review API configs in config/api/');
      console.log('  2. Test endpoints after server restart');
      console.log('  3. Generate pages: npm run generate pages "tasks, projects, users"');
    } else if (type === 'pages') {
      console.log('  1. Review page configs in config/pages/');
      console.log('  2. Generate apps: npm run generate apps "update navigation"');
      console.log('  3. Restart dev server to see pages');
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);

    if (error.message.includes('timeout') || error.message.includes('504')) {
      console.error('\n💡 AI request timed out. Try:');
      console.error('  1. Generate one entity at a time (e.g., "tasks" instead of "tasks, projects, users")');
      console.error('  2. Reduce complexity in description');
      console.error('  3. Wait a moment and try again');
    } else {
      console.error('\nMake sure the AI worker is running:');
      console.error('  npm run ai:dev');
    }

    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: npm run generate <type> <description>');
  console.error('');
  console.error('Types: schema | api | pages | apps');
  console.error('');
  console.error('Examples:');
  console.error('  npm run generate schema "task management app"');
  console.error('  npm run generate api tasks');
  console.error('  npm run generate pages employees');
  console.error('  npm run generate apps "update navigation"');
  process.exit(1);
}

const type = args[0] as 'schema' | 'api' | 'pages' | 'apps';
const description = args.slice(1).join(' ');

if (!['schema', 'api', 'pages', 'apps'].includes(type)) {
  console.error('Invalid type. Must be: schema, api, pages, or apps');
  process.exit(1);
}

generateConfig(type, description);
