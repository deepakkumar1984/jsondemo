#!/usr/bin/env node
/**
 * Request Processor
 *
 * Autonomously processes tasks from democonfig/config/request.json
 * using the Vibe Agent, updating status as tasks are completed.
 */

import 'dotenv/config';
import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { VibeAgent } from './agent.js';
import * as logger from './utils/logger.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REQUEST_FILE = resolve(__dirname, '../../democonfig/config/request.json');

interface Subtask {
  title: string;
  description: string;
  scope: string;
  estimatedHours: number;
  status: 'pending' | 'in_progress' | 'completed';
  completedAt: string | null;
}

interface Task {
  title: string;
  description: string;
  type: string;
  scope: string;
  priority: string;
  order: number;
  estimatedHours: number;
  subtasks: Subtask[];
  status: 'pending' | 'in_progress' | 'completed';
  completedAt: string | null;
}

interface Feature {
  title: string;
  description: string;
  priority: string;
  estimatedComplexity: string;
  order: number;
  tasks: Task[];
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed';
  completedAt: string | null;
}

interface RequestData {
  summary: string;
  features: Feature[];
  metadata: any;
  tracking: {
    startedAt: string;
    lastUpdatedAt: string;
    overallStatus: string;
    completedFeatures: number;
    totalFeatures: number;
    completedTasks: number;
    totalTasks: number;
  };
}

/**
 * Validation error types we can auto-fix
 */
interface ValidationError {
  type: 'cross-reference' | 'missing-page' | 'invalid-route' | 'other';
  file: string;
  message: string;
  details?: any;
}

/**
 * Run validation build and return errors
 */
async function runValidation(): Promise<{ success: boolean; errors: ValidationError[] }> {
  const allErrors: ValidationError[] = [];
  const configPath = resolve(__dirname, '../../democonfig');

  // Step 1: Run config validation
  try {
    logger.info('Running config validation...');
    const { stdout, stderr } = await execAsync('bun run validate', {
      cwd: configPath,
      timeout: 60000,
    });

    const output = stdout + stderr;
    const configErrors = parseValidationErrors(output);
    allErrors.push(...configErrors);
  } catch (error) {
    logger.warn('Config validation script failed (non-blocking)');
  }

  // Step 2: Run build to catch import/syntax errors
  try {
    logger.info('Running build to check imports...');
    const { stdout, stderr } = await execAsync('bun run build', {
      cwd: configPath,
      timeout: 120000, // 2 minute timeout for build
    });

    const output = stdout + stderr;
    const buildErrors = parseBuildErrors(output);
    allErrors.push(...buildErrors);
  } catch (error) {
    // Build failed - parse errors from the output
    const errorOutput = error instanceof Error && 'stdout' in error
      ? (error as any).stdout + (error as any).stderr
      : String(error);

    const buildErrors = parseBuildErrors(errorOutput);
    allErrors.push(...buildErrors);
  }

  if (allErrors.length === 0) {
    logger.info('✅ Validation passed - no errors found');
    return { success: true, errors: [] };
  }

  logger.warn(`⚠️  Found ${allErrors.length} error(s)`);
  allErrors.forEach(err => {
    logger.warn(`   - ${err.type}: ${err.message}`);
  });

  return { success: false, errors: allErrors };
}

/**
 * Parse validation output to extract errors
 */
function parseValidationErrors(output: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Match cross-reference errors
  // Format: "apps.json: Route "/path" references non-existent page "page/name""
  const crossRefRegex = /Route "([^"]+)" references non-existent page "([^"]+)"/g;
  let match;

  while ((match = crossRefRegex.exec(output)) !== null) {
    errors.push({
      type: 'cross-reference',
      file: 'apps.json',
      message: `Route "${match[1]}" references non-existent page "${match[2]}"`,
      details: {
        route: match[1],
        page: match[2],
      },
    });
  }

  // Could add more error pattern matchers here:
  // - Missing page references
  // - Invalid field references
  // - Schema validation errors

  return errors;
}

/**
 * Parse build errors to extract import/resolution errors
 */
function parseBuildErrors(output: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Match import resolution errors
  // Format: 'Could not resolve "../../../path" from "file.tsx"'
  const importRegex = /Could not resolve "([^"]+)" from "([^"]+)"/g;
  let match;

  while ((match = importRegex.exec(output)) !== null) {
    const importPath = match[1];
    const file = match[2];
    const fileName = file.split('/').pop() || file;

    errors.push({
      type: 'missing-page',
      file: fileName,
      message: `Import error in ${fileName}: Cannot resolve "${importPath}"`,
      details: {
        importPath,
        file,
      },
    });
  }

  return errors;
}

/**
 * Attempt to auto-fix validation errors
 */
async function autoFixValidationErrors(
  errors: ValidationError[],
  agent: VibeAgent
): Promise<{ fixed: number; remaining: ValidationError[] }> {
  let fixed = 0;
  const remaining: ValidationError[] = [];

  for (const error of errors) {
    try {
      if (error.type === 'cross-reference' && error.file === 'apps.json') {
        // Fix cross-reference errors by removing invalid routes
        logger.info(`🔧 Auto-fixing: ${error.message}`);

        const prompt = `URGENT FIX NEEDED:

Validation found an error in apps.json:
${error.message}

Route "${error.details.route}" points to page "${error.details.page}" which doesn't exist.

**YOUR TASK:** Fix this by removing the invalid route from apps.json.

**REQUIRED WORKFLOW:**
1. Call read_file to read apps.json
2. Call edit_file to remove the route entry for "${error.details.route}"
3. Call complete_task with action "updated" and reason "Removed invalid route"

⚠️ You MUST call complete_task when done!`;

        // Let agent fix it
        let completed = false;
        for await (const chunk of agent.chat(prompt)) {
          if (chunk.type === 'tool-result' && chunk.toolName === 'complete_task') {
            completed = true;
          }
        }

        if (completed) {
          fixed++;
          logger.info(`✅ Fixed: ${error.message}`);
        } else {
          remaining.push(error);
          logger.warn(`⚠️  Could not auto-fix: ${error.message}`);
        }
      } else if (error.type === 'missing-page') {
        // Fix import errors by having agent analyze and fix the imports
        logger.info(`🔧 Auto-fixing import error: ${error.message}`);

        const configRoot = resolve(__dirname, '../../democonfig/config');
        const filePath = error.details.file.replace('config/', '');

        const prompt = `URGENT FIX NEEDED:

Build found an import error:
${error.message}

File: ${filePath}
Import that cannot be resolved: "${error.details.importPath}"

**YOUR TASK:** Fix this import error in the file.

**AVAILABLE UI COMPONENTS:**
The project has these UI components in src/client/components/ui/:
- alert, avatar, badge, button, card, data-table, date-picker
- dialog, dropdown-menu, form, input, pagination, search
- select, sidebar, stat-card, table, tabs, textarea, toast

**REQUIRED WORKFLOW:**
1. Call read_file to read "${filePath}"
2. Identify the broken import and its usage
3. Options to fix:
   a) If importing a component that doesn't exist (like "switch"), replace with:
      - A checkbox input: <input type="checkbox" className="h-4 w-4" />
      - Or remove the import and usage if not critical
   b) If importing from wrong path, correct the path
4. Call edit_file to fix the import and any component usage
5. Call complete_task with action "updated" and reason "Fixed import error"

⚠️ You MUST call complete_task when done!
⚠️ Make sure to update BOTH the import statement AND where it's used in the file!`;

        // Let agent fix it
        let completed = false;
        for await (const chunk of agent.chat(prompt)) {
          if (chunk.type === 'tool-result' && chunk.toolName === 'complete_task') {
            completed = true;
          }
        }

        if (completed) {
          fixed++;
          logger.info(`✅ Fixed import error: ${error.message}`);
        } else {
          remaining.push(error);
          logger.warn(`⚠️  Could not auto-fix import error: ${error.message}`);
        }
      } else {
        // Other error types - can't auto-fix yet
        remaining.push(error);
        logger.warn(`⚠️  No auto-fix available for: ${error.type}`);
      }
    } catch (fixError) {
      logger.error(`Failed to fix error: ${error.message}`, {
        error: fixError instanceof Error ? fixError.message : String(fixError),
      });
      remaining.push(error);
    }
  }

  return { fixed, remaining };
}

class RequestProcessor {
  private agent: VibeAgent;
  private requestData: RequestData | null = null;

  constructor() {
    this.agent = new VibeAgent();
  }

  async loadRequest(): Promise<void> {
    try {
      const content = await readFile(REQUEST_FILE, 'utf-8');
      this.requestData = JSON.parse(content);
      console.log('✅ Loaded request.json');
      console.log(`   Features: ${this.requestData!.tracking.totalFeatures}`);
      console.log(`   Tasks: ${this.requestData!.tracking.totalTasks}`);
      console.log(`   Completed: ${this.requestData!.tracking.completedTasks}\n`);
    } catch (error) {
      throw new Error(`Failed to load request.json: ${error}`);
    }
  }

  async saveRequest(): Promise<void> {
    if (!this.requestData) {
      throw new Error('No request data to save');
    }

    try {
      await writeFile(REQUEST_FILE, JSON.stringify(this.requestData, null, 2), 'utf-8');
      logger.debug('Saved request.json with updated status');
    } catch (error) {
      throw new Error(`Failed to save request.json: ${error}`);
    }
  }

  getNextTask(): { feature: Feature; task: Task; subtask?: Subtask } | null {
    if (!this.requestData) return null;

    // Find first feature with pending tasks
    for (const feature of this.requestData.features) {
      if (feature.status === 'completed') continue;

      // Check if dependencies are met
      if (feature.dependencies.length > 0) {
        const unmetDeps = feature.dependencies.filter(depName => {
          const depFeature = this.requestData!.features.find(f => f.title === depName);
          return !depFeature || depFeature.status !== 'completed';
        });

        if (unmetDeps.length > 0) {
          continue; // Skip this feature until dependencies are met
        }
      }

      // Find first pending task in this feature
      for (const task of feature.tasks) {
        if (task.status === 'completed') continue;

        // If task itself is pending (not started), do it first before subtasks
        if (task.status === 'pending') {
          return { feature, task };
        }

        // Task is in_progress, check for pending subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          const pendingSubtask = task.subtasks.find(st => st.status === 'pending');
          if (pendingSubtask) {
            return { feature, task, subtask: pendingSubtask };
          }
        }

        // All subtasks done, return task to complete it
        return { feature, task };
      }
    }

    return null;
  }

  buildPromptForTask(feature: Feature, task: Task, subtask?: Subtask): string {
    const workItem = subtask || task;

    let prompt = `# Task from request.json\n\n`;
    prompt += `**Feature:** ${feature.title}\n`;
    prompt += `**Task:** ${task.title}\n`;
    if (subtask) {
      prompt += `**Subtask:** ${subtask.title}\n`;
    }
    prompt += `\n**Description:**\n${workItem.description}\n\n`;
    prompt += `**Scope:** ${workItem.scope}\n`;
    prompt += `**Type:** ${task.type}\n\n`;

    // Add context-specific instructions
    if (task.type === 'research') {
      prompt += `This is a research task. Please:\n`;
      prompt += `1. Investigate the codebase as described\n`;
      prompt += `2. Document your findings\n`;
      prompt += `3. Create a summary file at democonfig/config/docs/research-findings.md`;
    } else if (task.scope === 'schema') {
      prompt += `**YOUR TASK:** Generate a database schema.\n\n`;
      prompt += `**REQUIRED WORKFLOW:**\n\n`;
      prompt += `1. Call glob with "schema/*.json" to list existing schemas\n`;
      prompt += `2. Check if the EXACT file you need exists (e.g., "schema/expense_categories.json")\n`;
      prompt += `3. If file MISSING → Call generate_config to create it\n`;
      prompt += `4. If file EXISTS → Skip generation\n`;
      prompt += `5. **MUST call complete_task** with action ('generated' or 'skipped') and reason\n\n`;
      prompt += `⚠️ You MUST call complete_task when done! This is required.\n`;
      prompt += `⚠️ Only skip if THE EXACT FILE exists! Other schemas is OK.\n\n`;
    } else if (task.scope === 'api') {
      prompt += `**YOUR TASK:** Generate API routes.\n\n`;
      prompt += `**REQUIRED WORKFLOW (must complete both steps):**\n\n`;
      prompt += `STEP 1: Check for existing file\n`;
      prompt += `  - Determine exact resource name from task (e.g., "expenses")\n`;
      prompt += `  - Call glob tool with pattern "api/*.routes.ts"\n`;
      prompt += `  - Wait for glob results\n\n`;
      prompt += `STEP 2: After seeing glob results, YOU MUST do ONE of:\n`;
      prompt += `  a) If "api/[exact_resource].routes.ts" EXISTS in results:\n`;
      prompt += `     → State: "API [name].routes.ts already exists, skipping"\n`;
      prompt += `  b) If "api/[exact_resource].routes.ts" DOES NOT exist:\n`;
      prompt += `     → Call generate_config tool to create it\n\n`;
      prompt += `⚠️ CRITICAL: Only skip if THE EXACT FILE exists! Other APIs being present is OK - you must still create this one.\n`;
      prompt += `⚠️ DO NOT finish this task until you complete BOTH steps!\n\n`;
    } else if (task.scope === 'page') {
      prompt += `**YOUR TASK:** Generate page component(s).\n\n`;
      prompt += `**REQUIRED WORKFLOW (must complete both steps):**\n\n`;
      prompt += `STEP 1: Check for existing file\n`;
      prompt += `  - Determine exact page path from task (e.g., "pages/expenses/list.tsx")\n`;
      prompt += `  - Call glob tool with pattern "pages/**/*.tsx"\n`;
      prompt += `  - Wait for glob results\n\n`;
      prompt += `STEP 2: After seeing glob results, YOU MUST do ONE of:\n`;
      prompt += `  a) If exact page file EXISTS in results:\n`;
      prompt += `     → State: "Page [path] already exists, skipping"\n`;
      prompt += `  b) If exact page file DOES NOT exist:\n`;
      prompt += `     → Call generate_config tool to create it\n\n`;
      prompt += `⚠️ CRITICAL: Only skip if THE EXACT FILE exists! Other pages being present is OK - you must still create this one.\n`;
      prompt += `⚠️ DO NOT finish this task until you complete BOTH steps!\n\n`;
    } else if (task.scope === 'app') {
      prompt += `**YOUR TASK:** Generate or update app configuration (apps.json).\n\n`;
      prompt += `**REQUIRED WORKFLOW:**\n\n`;
      prompt += `1. Call read_file with "apps.json" to check if it exists\n`;
      prompt += `2. If file EXISTS → Call edit_file to update navigation/routes\n`;
      prompt += `3. If file MISSING → Call generate_config with type="app" to create it\n`;
      prompt += `4. **MUST call complete_task** with action ('generated' or 'updated') and reason\n\n`;
      prompt += `⚠️ You MUST call complete_task when done! This is required.\n`;
      prompt += `⚠️ If you call complete_task with action="generated", you MUST have called generate_config first.\n\n`;
    }

    prompt += `**Important:**\n`;
    prompt += `- Follow existing patterns in democonfig/config\n`;
    prompt += `- Check existing files to understand conventions\n`;
    prompt += `- NEVER use mock/dummy data - only real database operations\n`;
    prompt += `- Be honest about errors - no silent failures\n\n`;

    prompt += `Please complete this task now.`;

    return prompt;
  }

  async processTask(feature: Feature, task: Task, subtask?: Subtask): Promise<boolean> {
    const workItem = subtask || task;
    const workTitle = subtask ? `${task.title} > ${subtask.title}` : task.title;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Processing: ${workTitle}`);
    console.log(`   Scope: ${workItem.scope} | Type: ${task.type}`);
    console.log(`${'='.repeat(80)}\n`);

    // Mark as in progress
    workItem.status = 'in_progress';
    await this.saveRequest();

    // Build prompt
    const prompt = this.buildPromptForTask(feature, task, subtask);

    // Run agent
    try {
      console.log('🤖 Agent working...\n');

      let responseText = '';
      let lastError: any = null;
      const toolsCalled = new Set<string>();
      let completeTaskResult: any = null;

      for await (const chunk of this.agent.chat(prompt)) {
        if (chunk.type === 'text' && chunk.content) {
          process.stdout.write(chunk.content);
          responseText += chunk.content;
        } else if (chunk.type === 'tool-call' && chunk.toolName) {
          console.log(`\n🔧 Using tool: ${chunk.toolName}`);
          toolsCalled.add(chunk.toolName);
        } else if (chunk.type === 'tool-result') {
          // Capture complete_task result for validation
          if (chunk.toolName === 'complete_task' && chunk.toolResult) {
            completeTaskResult = chunk.toolResult;
          }

          // Check if tool result indicates an error
          if (chunk.toolResult && typeof chunk.toolResult === 'object') {
            if (chunk.toolResult.success === false || chunk.toolResult.error) {
              lastError = chunk.toolResult.error || chunk.toolResult;
              console.log(`✗ Tool failed: ${JSON.stringify(chunk.toolResult, null, 2)}\n`);
            } else {
              console.log(`✓ Tool completed\n`);
            }
          } else {
            console.log(`✓ Tool completed\n`);
          }
        } else if (chunk.type === 'error') {
          // Handle error chunks
          lastError = chunk.error || 'Unknown error';
          console.log(`\n✗ Error: ${chunk.error}\n`);
        }
      }

      console.log('\n');

      // If there was a tool error, throw it
      if (lastError) {
        throw new Error(`Tool execution failed: ${JSON.stringify(lastError)}`);
      }

      // CRITICAL: Verify agent called complete_task
      // With toolChoice: 'required', agent must call complete_task to signal done
      if (workItem.scope === 'schema' || workItem.scope === 'api' || workItem.scope === 'page' || workItem.scope === 'app') {
        const calledCompletion = toolsCalled.has('complete_task');

        if (!calledCompletion) {
          throw new Error(
            `Agent did not call complete_task!

With toolChoice: 'required', the agent must call complete_task when done.
Tools called: ${Array.from(toolsCalled).join(', ') || 'none'}

The agent should follow the workflow and finish by calling complete_task.`
          );
        }

        // For config generation tasks, verify generate_config was called if action is "generated"
        if (completeTaskResult?.action === 'generated' && !toolsCalled.has('generate_config')) {
          throw new Error(
            `Agent claimed action "generated" but did not call generate_config!

Tools called: ${Array.from(toolsCalled).join(', ')}
Action reported: ${completeTaskResult.action}
Reason: ${completeTaskResult.reason}

The agent must actually call generate_config to create the ${workItem.scope} config file.`
          );
        }

        logger.info(`Agent completed ${workItem.scope} task`);
      }

      // Mark as completed
      workItem.status = 'completed';
      workItem.completedAt = new Date().toISOString();

      // Update tracking
      this.requestData!.tracking.completedTasks++;
      this.requestData!.tracking.lastUpdatedAt = new Date().toISOString();

      // Check if task is fully completed (all subtasks done)
      if (!subtask && task.subtasks && task.subtasks.length > 0) {
        const allSubtasksDone = task.subtasks.every(st => st.status === 'completed');
        if (allSubtasksDone) {
          task.status = 'completed';
          task.completedAt = new Date().toISOString();
        }
      }

      // Check if feature is fully completed (all tasks done)
      const allTasksDone = feature.tasks.every(t => t.status === 'completed');
      if (allTasksDone) {
        console.log(`\n🔍 Feature completed - running validation...`);

        // Auto-validation and self-healing loop (max 2 attempts)
        let validationAttempt = 0;
        const maxValidationAttempts = 2;
        let validationResult = await runValidation();

        while (!validationResult.success && validationAttempt < maxValidationAttempts) {
          validationAttempt++;
          console.log(`\n🔧 Validation attempt ${validationAttempt}/${maxValidationAttempts}`);

          if (validationResult.errors.length > 0) {
            console.log(`   Found ${validationResult.errors.length} error(s), attempting auto-fix...`);

            const fixResult = await autoFixValidationErrors(validationResult.errors, this.agent);

            console.log(`   Fixed: ${fixResult.fixed}, Remaining: ${fixResult.remaining.length}`);

            if (fixResult.fixed > 0) {
              // Re-run validation to check if fixes worked
              validationResult = await runValidation();
            } else {
              // No fixes applied, stop trying
              break;
            }
          } else {
            break;
          }
        }

        // Report final validation status
        if (validationResult.success) {
          console.log(`\n✅ Validation passed for feature: ${feature.title}`);
        } else {
          console.log(`\n⚠️  Validation completed with ${validationResult.errors.length} remaining error(s)`);
          validationResult.errors.forEach(err => {
            console.log(`   - ${err.message}`);
          });
          console.log(`   Feature marked complete, but manual fixes may be needed.\n`);
        }

        feature.status = 'completed';
        feature.completedAt = new Date().toISOString();
        this.requestData!.tracking.completedFeatures++;
      }

      // Check if everything is done
      const allFeaturesDone = this.requestData!.features.every(f => f.status === 'completed');
      if (allFeaturesDone) {
        this.requestData!.tracking.overallStatus = 'completed';
      }

      await this.saveRequest();

      console.log(`\n✅ Completed: ${workTitle}`);
      console.log(`   Progress: ${this.requestData!.tracking.completedTasks}/${this.requestData!.tracking.totalTasks} tasks\n`);

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Error processing task:`);
      console.error(`   ${errorMessage}`);

      if (error instanceof Error && error.stack) {
        logger.error('Task processing error', {
          task: workTitle,
          error: errorMessage,
          stack: error.stack
        });
      }

      workItem.status = 'pending'; // Reset to pending on error
      await this.saveRequest();

      console.log(`\n⚠️  Task reset to pending. Fix the error and retry later.\n`);
      return false;
    }
  }

  async processAll(options: { pauseBetweenTasks?: number; maxTasks?: number } = {}): Promise<void> {
    const { pauseBetweenTasks = 2000, maxTasks } = options;

    console.log('\n🚀 Starting request processor...\n');
    console.log(`Summary: ${this.requestData!.summary}\n`);

    let tasksProcessed = 0;
    let next = this.getNextTask();

    while (next) {
      const success = await this.processTask(next.feature, next.task, next.subtask);

      if (!success) {
        console.log('\n⚠️  Task failed. Stopping processor.');
        break;
      }

      tasksProcessed++;
      if (maxTasks && tasksProcessed >= maxTasks) {
        console.log(`\n⏸️  Reached max tasks limit (${maxTasks}). Stopping.`);
        break;
      }

      // Pause between tasks
      if (pauseBetweenTasks > 0) {
        await new Promise(resolve => setTimeout(resolve, pauseBetweenTasks));
      }

      next = this.getNextTask();
    }

    if (!next && tasksProcessed > 0) {
      console.log('\n🎉 All tasks completed!\n');
      console.log(`Total features completed: ${this.requestData!.tracking.completedFeatures}/${this.requestData!.tracking.totalFeatures}`);
      console.log(`Total tasks completed: ${this.requestData!.tracking.completedTasks}/${this.requestData!.tracking.totalTasks}\n`);
    } else if (!next && tasksProcessed === 0) {
      console.log('\n✓ No pending tasks found. All work is complete!\n');
    }
  }

  async processOne(): Promise<boolean> {
    const next = this.getNextTask();

    if (!next) {
      console.log('\n✓ No pending tasks found.\n');
      return false;
    }

    return await this.processTask(next.feature, next.task, next.subtask);
  }

  showStatus(): void {
    if (!this.requestData) {
      console.log('❌ No request data loaded');
      return;
    }

    console.log('\n📊 Request Status\n');
    console.log(`Overall: ${this.requestData.tracking.overallStatus}`);
    console.log(`Features: ${this.requestData.tracking.completedFeatures}/${this.requestData.tracking.totalFeatures}`);
    console.log(`Tasks: ${this.requestData.tracking.completedTasks}/${this.requestData.tracking.totalTasks}\n`);

    console.log('Features:\n');
    for (const feature of this.requestData.features) {
      const icon = feature.status === 'completed' ? '✅' :
                   feature.status === 'in_progress' ? '🔄' : '⏳';
      console.log(`${icon} ${feature.title} (${feature.status})`);

      for (const task of feature.tasks) {
        const taskIcon = task.status === 'completed' ? '  ✅' :
                         task.status === 'in_progress' ? '  🔄' : '  ⏳';
        console.log(`${taskIcon} ${task.title}`);
      }
      console.log();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  const processor = new RequestProcessor();
  await processor.loadRequest();

  try {
    switch (command) {
      case 'all':
        // Process all tasks
        const maxTasks = args[1] ? parseInt(args[1]) : undefined;
        await processor.processAll({ maxTasks });
        break;

      case 'one':
        // Process just the next task
        await processor.processOne();
        break;

      case 'status':
        // Show current status
        processor.showStatus();
        break;

      default:
        console.log(`
Usage: npm run process-request [command] [options]

Commands:
  all [max]    Process all pending tasks (optionally limit to max tasks)
  one          Process just the next pending task
  status       Show current status

Examples:
  npm run process-request all       # Process all tasks
  npm run process-request all 5     # Process next 5 tasks
  npm run process-request one       # Process next task only
  npm run process-request status    # Show status
        `);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
