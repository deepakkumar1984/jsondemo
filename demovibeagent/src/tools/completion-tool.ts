/**
 * Completion Tool
 *
 * This tool signals task completion. It has no execute function,
 * which stops the agent loop when called (per AI SDK loop control pattern).
 *
 * The agent MUST call this tool when done because toolChoice: 'required'
 * forces tool calling at every step.
 */

import { tool } from 'ai';
import { z } from 'zod';

export const completeTaskTool = tool({
  description: 'REQUIRED: Call this when you have completed the task. Explain what you did.',
  inputSchema: z.object({
    action: z.enum(['generated', 'skipped', 'updated', 'researched'])
      .describe('What action you took'),
    reason: z.string()
      .describe('Why you took this action (e.g., "Generated schema/vendors.json" or "File already exists")'),
    filesCreated: z.array(z.string()).optional()
      .describe('List of files you created'),
    filesModified: z.array(z.string()).optional()
      .describe('List of files you modified'),
  }),
  execute: async ({ action, reason, filesCreated, filesModified }) => {
    // Return completion signal
    // The loop may continue, but validation will check for this tool call
    return {
      success: true,
      completed: true,
      action,
      reason,
      filesCreated: filesCreated || [],
      filesModified: filesModified || [],
    };
  },
});
