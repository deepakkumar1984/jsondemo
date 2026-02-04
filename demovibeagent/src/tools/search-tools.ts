/**
 * Search Operation Tools
 *
 * Provides tools for finding and listing files within the config directory:
 * - glob: Find files by pattern
 * - list_directory: List files/directories in a path
 */

import { tool } from 'ai';
import { z } from 'zod';
import glob from 'fast-glob';
import { readdir } from 'fs/promises';
import { resolveSandboxPath, getConfigRoot, getDisplayPath } from '../utils/sandbox.js';
import * as logger from '../utils/logger.js';

/**
 * Glob Tool - Find files by pattern
 *
 * Searches for files matching a glob pattern within the config directory.
 * Supports glob patterns for file matching.
 */
export const globTool = tool({
  description: 'Find files by glob pattern in the config directory. Supports patterns like "**/*.ts", "api/*.routes.ts", etc.',
  inputSchema: z.object({
    pattern: z.string().describe('Glob pattern (e.g., "**/*.ts", "api/*.routes.ts")'),
  }),
  execute: async ({ pattern }) => {
    try {
      logger.debug('Executing glob tool', { pattern });

      const configRoot = getConfigRoot();

      // Execute glob search within config directory
      const matches = await glob(pattern, {
        cwd: configRoot,
        onlyFiles: true,
        dot: false, // Don't include hidden files
        absolute: false, // Return relative paths
      });

      // Sort results for consistent output
      const sortedMatches = matches.sort();

      const result = {
        success: true,
        files: sortedMatches,
        count: sortedMatches.length,
        pattern,
      };

      logger.logToolExecution('glob', { pattern }, result);

      return result;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result = {
        success: false,
        error: `Failed to execute glob pattern: ${errorMessage}`,
      };

      logger.error('Glob tool failed', { pattern, error: errorMessage });
      logger.logToolExecution('glob', { pattern }, result);

      return result;
    }
  },
});

/**
 * List Directory Tool - List files and directories
 *
 * Lists all files and directories in a specified path within the config directory.
 * Returns structured results with file/directory type indicators.
 */
export const listDirectoryTool = tool({
  description: 'List files and directories in a path within the config directory. Returns structured list with file/directory indicators.',
  inputSchema: z.object({
    path: z.string().default('.').describe('Path to list (relative to config root, defaults to ".")'),
  }),
  execute: async ({ path }) => {
    try {
      logger.debug('Executing list_directory tool', { path });

      // Resolve and validate the path within sandbox
      const fullPath = resolveSandboxPath(path);

      // Read directory with file type information
      const dirEntries = await readdir(fullPath, { withFileTypes: true });

      // Convert to structured format
      const entries = dirEntries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' as const : 'file' as const,
      }));

      // Sort: directories first, then files, alphabetically within each group
      entries.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });

      const result = {
        success: true,
        entries,
        path: getDisplayPath(fullPath),
        count: entries.length,
      };

      logger.logToolExecution('list_directory', { path }, result);

      return result;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a "not found" error
      if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
        const result = {
          success: false,
          error: `Directory not found: ${path}`,
        };

        logger.warn('Directory not found', { path });
        logger.logToolExecution('list_directory', { path }, result);

        return result;
      }

      // Check if it's a security violation (outside sandbox)
      if (errorMessage.includes('Security violation')) {
        const result = {
          success: false,
          error: errorMessage,
        };

        logger.error('Security violation in list_directory', { path, error: errorMessage });
        logger.logToolExecution('list_directory', { path }, result);

        return result;
      }

      // Generic error
      const result = {
        success: false,
        error: `Failed to list directory: ${errorMessage}`,
      };

      logger.error('List directory tool failed', { path, error: errorMessage });
      logger.logToolExecution('list_directory', { path }, result);

      return result;
    }
  },
});
