#!/usr/bin/env node
/**
 * Request Processor
 *
 * Autonomously processes tasks from democonfig/config/request.json
 * using the Vibe Agent, updating status as tasks are completed.
 */

import 'dotenv/config';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { VibeAgent } from './agent.js';
import * as logger from './utils/logger.js';

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

        // Check for pending subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          const pendingSubtask = task.subtasks.find(st => st.status === 'pending');
          if (pendingSubtask) {
            return { feature, task, subtask: pendingSubtask };
          }
        }

        // If no subtasks or all subtasks done, return the task
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
      prompt += `3. Create a summary file at democonfig/config/expense-audit-findings.md\n\n`;
    } else if (task.scope === 'schema') {
      prompt += `This is a schema task. Please:\n`;
      prompt += `1. Review existing schema files to understand conventions\n`;
      prompt += `2. Create the schema file as specified\n`;
      prompt += `3. Follow existing patterns for field types, indexes, etc.\n\n`;
    } else if (task.scope === 'api') {
      prompt += `This is an API task. Please:\n`;
      prompt += `1. Review existing API routes to understand patterns\n`;
      prompt += `2. Create the API route file as specified\n`;
      prompt += `3. Use createDataClient and follow existing error handling patterns\n\n`;
    } else if (task.scope === 'page') {
      prompt += `This is a page task. Please:\n`;
      prompt += `1. Review existing page files to understand the json-render patterns\n`;
      prompt += `2. Create the page file as specified\n`;
      prompt += `3. Follow existing component usage and action patterns\n\n`;
    } else if (task.scope === 'app') {
      prompt += `This is an app configuration task. Please:\n`;
      prompt += `1. Review the existing apps.json structure\n`;
      prompt += `2. Make the updates as specified\n`;
      prompt += `3. Follow existing navigation and routing patterns\n\n`;
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
      for await (const chunk of this.agent.chat(prompt)) {
        if (chunk.type === 'text' && chunk.content) {
          process.stdout.write(chunk.content);
          responseText += chunk.content;
        } else if (chunk.type === 'tool-call' && chunk.toolName) {
          console.log(`\n🔧 Using tool: ${chunk.toolName}`);
        } else if (chunk.type === 'tool-result') {
          console.log(`✓ Tool completed\n`);
        }
      }

      console.log('\n');

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
      console.error(`\n❌ Error processing task: ${error}`);
      workItem.status = 'pending'; // Reset to pending on error
      await this.saveRequest();
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
