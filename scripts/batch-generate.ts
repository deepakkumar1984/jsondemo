#!/usr/bin/env tsx
/**
 * Batch Config Generator
 *
 * Reads request.json with features/tasks structure and generates all configs sequentially using AI.
 * Processes tasks in order based on feature.order and task.order.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

interface Task {
  title: string;
  description: string;
  scope: 'schema' | 'api' | 'page' | 'app';
  priority: string;
  order: number;
  estimatedHours?: number;
  type?: string;
}

interface Feature {
  title: string;
  description: string;
  priority: string;
  estimatedComplexity: string;
  order: number;
  tasks: Task[];
  dependencies: string[];
}

interface Request {
  summary: string;
  features: Feature[];
  metadata?: {
    totalEstimatedHours?: number;
    recommendedOrder?: string[];
    riskAreas?: string[];
    suggestedMilestones?: any[];
  };
}

/**
 * Load request.json file
 */
function loadRequest(requestPath: string): Request {
  if (!existsSync(requestPath)) {
    throw new Error(`Request file not found: ${requestPath}`);
  }

  const content = readFileSync(requestPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Build the output path based on scope and title
 */
function buildOutputPath(scope: string, title: string): string {
  // Extract resource name from title
  // "Add Project schema to schemas registry" -> "projects"
  // "Configure Project CRUD operations" -> "projects"
  // "Add Task List page" -> "task-list"

  const normalized = title.toLowerCase()
    .replace(/^(add|create|configure|define|extend|implement|build|register)\s+/i, '')
    .replace(/\s+(schema|api|operations|page|form|configuration|to.*registry).*$/i, '')
    .trim();

  // Convert to kebab-case
  const kebabCase = normalized
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  if (scope === 'schema') {
    // Extract table name: "project schema" -> "projects"
    const tableName = kebabCase.split('-')[0];
    // Pluralize if not already
    const plural = tableName.endsWith('s') ? tableName : `${tableName}s`;
    return `config/schema/${plural}.json`;
  } else if (scope === 'api') {
    // Extract resource: "project crud operations" -> "projects"
    const resourceName = kebabCase.split('-')[0];
    const plural = resourceName.endsWith('s') ? resourceName : `${resourceName}s`;
    return `config/api/${plural}.routes.ts`;
  } else if (scope === 'page') {
    // Keep descriptive name: "task-list-page" -> "task-list"
    const pageName = kebabCase.replace(/-page$/, '');
    return `config/pages/${pageName}.json`;
  } else if (scope === 'app') {
    return `config/apps.json`;
  } else {
    return `config/${kebabCase}.json`;
  }
}

/**
 * Extract feature name for context
 */
function extractFeatureName(title: string): string {
  return title.replace(/\s+(schema|api|operations|page|configuration).*$/i, '').trim();
}

/**
 * Generate a single config using the AI generator
 */
function generateConfig(
  task: Task,
  feature: Feature,
  index: number,
  total: number,
  skipExisting: boolean = false
): boolean {
  const outputPath = buildOutputPath(task.scope, task.title);
  const featureName = extractFeatureName(task.title);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📦 [${index + 1}/${total}] ${task.title}`);
  console.log(`   Feature: ${feature.title}`);
  console.log(`   Scope: ${task.scope}`);
  console.log(`   Priority: ${task.priority}`);
  console.log(`   Output: ${outputPath}`);
  console.log(`${'='.repeat(80)}\n`);

  // Call the AI config generator
  const args = [
    'scripts/ai-config-generator.ts',
    '--type', task.scope,
    '--feature', featureName,
    '--tasks', task.description,
    '--context', `Feature context: ${feature.description}`,
    '--output', outputPath
  ];

  // Add skip-existing flag if enabled
  if (skipExisting) {
    args.push('--skip-existing');
  }

  const result = spawnSync(
    'tsx',
    args,
    {
      stdio: 'inherit',
      cwd: process.cwd()
    }
  );

  if (result.status !== 0) {
    console.error(`\n❌ Failed to generate config for: ${task.title}`);
    console.error(`   Exit code: ${result.status}`);
    if (result.error) {
      console.error(`   Error: ${result.error.message}`);
    }
    return false;
  }

  console.log(`\n✅ Successfully generated: ${outputPath}\n`);
  return true;
}

/**
 * Flatten features and tasks into a single sorted array
 */
function flattenTasks(request: Request): Array<{ task: Task; feature: Feature }> {
  const flattened: Array<{ task: Task; feature: Feature }> = [];

  // Sort features by order
  const sortedFeatures = [...request.features].sort((a, b) => a.order - b.order);

  for (const feature of sortedFeatures) {
    // Sort tasks within feature by order
    const sortedTasks = [...feature.tasks].sort((a, b) => a.order - b.order);

    for (const task of sortedTasks) {
      flattened.push({ task, feature });
    }
  }

  return flattened;
}

/**
 * Main batch generation function
 */
async function main() {
  const args = process.argv.slice(2);
  let requestPath = join(process.cwd(), 'scripts/request.json');
  let dryRun = false;
  let skipExisting = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--request' || args[i] === '-r') {
      requestPath = args[++i];
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--skip-existing') {
      skipExisting = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  console.log(`\n🚀 Starting batch config generation...`);
  console.log(`📄 Reading request file: ${requestPath}\n`);

  try {
    // Load request
    const request = loadRequest(requestPath);

    console.log(`📋 Project: ${request.summary}`);
    console.log(`📦 Total features: ${request.features.length}`);
    const totalTasks = request.features.reduce((sum, f) => sum + f.tasks.length, 0);
    console.log(`📝 Total tasks: ${totalTasks}`);
    if (request.metadata?.totalEstimatedHours) {
      console.log(`⏱️  Estimated hours: ${request.metadata.totalEstimatedHours}`);
    }
    console.log();

    // Show feature breakdown
    console.log('📊 Features breakdown:');
    for (const feature of request.features) {
      console.log(`   ${feature.order + 1}. ${feature.title} (${feature.tasks.length} tasks)`);
    }
    console.log();

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - Showing what would be generated:\n');
    }

    // Flatten and process tasks
    const flatTasks = flattenTasks(request);
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (let i = 0; i < flatTasks.length; i++) {
      const { task, feature } = flatTasks[i];

      if (dryRun) {
        const outputPath = buildOutputPath(task.scope, task.title);
        console.log(`[${i + 1}/${flatTasks.length}] Would generate:`);
        console.log(`  Task: ${task.title}`);
        console.log(`  Feature: ${feature.title}`);
        console.log(`  Scope: ${task.scope}`);
        console.log(`  Output: ${outputPath}\n`);
        continue;
      }

      const success = generateConfig(task, feature, i, flatTasks.length, skipExisting);

      if (success) {
        successCount++;
      } else {
        failCount++;

        // Ask user if they want to continue on failure
        console.log(`\n⚠️  Generation failed for task ${i + 1}. Continue? (y/n/skip-feature)`);
        // For automation, we'll continue by default
        // You can add interactive prompts here if needed
      }

      // Small delay between requests to avoid rate limiting
      if (i < flatTasks.length - 1) {
        console.log(`\n⏳ Waiting 0.5 seconds before next generation...\n`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (dryRun) {
      console.log(`\n✅ Dry run complete. Would generate ${flatTasks.length} configs.`);
      process.exit(0);
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎉 Batch generation complete!`);
    console.log(`${'='.repeat(80)}`);
    console.log(`✅ Successful: ${successCount}/${flatTasks.length}`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount}/${flatTasks.length}`);
    }
    if (skipCount > 0) {
      console.log(`⏭️  Skipped: ${skipCount}/${flatTasks.length}`);
    }

    // Provide context-aware next steps
    console.log(`\n📋 Next steps:`);

    const hasSchema = flatTasks.some(({ task }) => task.scope === 'schema' && successCount > 0);
    const hasApi = flatTasks.some(({ task }) => task.scope === 'api' && successCount > 0);
    const hasPage = flatTasks.some(({ task }) => task.scope === 'page' && successCount > 0);
    const hasApp = flatTasks.some(({ task }) => task.scope === 'app' && successCount > 0);

    let step = 1;
    if (hasSchema) {
      console.log(`   ${step++}. Review generated schemas in config/schema/`);
      console.log(`   ${step++}. Run database migration: bun run db:migrate`);
    }
    if (hasApi) {
      console.log(`   ${step++}. Review generated APIs in config/api/`);
      console.log(`   ${step++}. Rebuild API index: bun run build:api-index`);
    }
    if (hasPage) {
      console.log(`   ${step++}. Review generated pages in config/pages/`);
    }
    if (hasApp) {
      console.log(`   ${step++}. Review app configuration in config/apps.json`);
    }
    console.log(`   ${step++}. Validate all configs: bun run validate:all`);
    console.log(`   ${step++}. Restart dev server: bun run dev\n`);

    // Show risk areas if present
    if (request.metadata?.riskAreas && request.metadata.riskAreas.length > 0) {
      console.log(`\n⚠️  Risk Areas to Review:`);
      request.metadata.riskAreas.forEach((risk, idx) => {
        console.log(`   ${idx + 1}. ${risk}`);
      });
      console.log();
    }

    process.exit(failCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Batch Config Generator - Generate multiple configs from request.json

Usage:
  tsx scripts/batch-generate.ts [options]

Options:
  --request, -r <path>    Path to request.json file (default: scripts/request.json)
  --dry-run               Show what would be generated without actually generating
  --skip-existing         Skip generation if output file already exists
  --help, -h              Show this help message

Request JSON Format (New Structure):
  {
    "summary": "Project description",
    "features": [
      {
        "title": "Feature name",
        "description": "Feature description",
        "priority": "critical|high|medium|low",
        "estimatedComplexity": "simple|moderate|complex",
        "order": 0,
        "tasks": [
          {
            "title": "Task title (used as feature description)",
            "description": "Detailed task description",
            "scope": "schema|api|page|app",
            "priority": "urgent|high|medium|low",
            "order": 0,
            "estimatedHours": 3
          }
        ],
        "dependencies": ["Other Feature Name"]
      }
    ],
    "metadata": {
      "totalEstimatedHours": 57,
      "riskAreas": ["Risk 1", "Risk 2"]
    }
  }

Examples:

  # Generate all configs from default request.json
  tsx scripts/batch-generate.ts

  # Dry run to see what would be generated
  tsx scripts/batch-generate.ts --dry-run

  # Generate from custom request file
  tsx scripts/batch-generate.ts --request my-feature-request.json

  # Or use npm script
  bun run ai:batch
  bun run ai:batch --dry-run

How it works:
  1. Reads the request.json file with features/tasks structure
  2. Flattens features and sorts by feature.order then task.order
  3. For each task:
     - Uses task.scope (schema/api/page/app) as the config type
     - Uses task.title as the feature name
     - Uses task.description as detailed requirements
     - Auto-generates output path based on scope and title
     - Calls ai-config-generator.ts with auto-context
  4. Reports progress and results
  5. Provides next steps based on what was generated

Notes:
  - Configs are generated sequentially with 2-second delays
  - Make sure ZAI_API_KEY is set in .env or environment
  - Failed generations are logged but don't stop the batch
  - Output paths are auto-generated:
    - schema: config/schema/{table-name}.json
    - api: config/api/{resource-name}.routes.ts
    - page: config/pages/{descriptive-name}.json
    - app: config/apps.json
  - Context is automatically included from existing configs
`);
}

// Run the batch generator
main();
