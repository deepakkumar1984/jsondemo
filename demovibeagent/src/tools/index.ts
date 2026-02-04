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

// Export all tools
// Tools are organized by category in separate files
export const allTools = {
  // File operations (read & edit only - generate_config handles creation)
  read_file: fileTools.read_file,
  edit_file: fileTools.edit_file,
  // write_file removed - use generate_config to create files

  // Config generation
  ...configTools,

  // Context retrieval
  get_context: getContextTool,

  // Search tools
  glob: globTool,
  list_directory: listDirectoryTool,
};
