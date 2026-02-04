/**
 * Tool Registry
 *
 * Central registry of all tools available to the agent.
 * Tools are defined using Vercel AI SDK's tool() function.
 */

import { getContextTool } from './context-tools.js';
import { globTool, listDirectoryTool } from './search-tools.js';
import { fileTools } from './file-tools.js';
import { configTools } from './config-tools.js';
import { completeTaskTool } from './completion-tool.js';

// Export all tools
// Tools are organized by category in separate files
export const allTools = {
  // File operations
  read_file: fileTools.read_file,
  write_file: fileTools.write_file,
  edit_file: fileTools.edit_file,

  // Config generation
  ...configTools,

  // Context retrieval
  get_context: getContextTool,

  // Search tools
  glob: globTool,
  list_directory: listDirectoryTool,

  // Completion (MUST be called when done - stops the loop)
  complete_task: completeTaskTool,
};
