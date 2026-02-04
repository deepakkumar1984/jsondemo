/**
 * File Operation Tools
 *
 * Provides sandboxed file operations within the democonfig/config directory.
 * All operations are restricted to the config sandbox for security.
 *
 * CRITICAL: NO SILENT FAILURES
 * - All errors are reported honestly with details
 * - success:false means the operation actually failed
 * - success:true means the operation actually succeeded
 */

import { tool } from 'ai';
import { z } from 'zod';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { resolveSandboxPath, getDisplayPath } from '../utils/sandbox.js';
import * as logger from '../utils/logger.js';

/**
 * Read File Tool
 *
 * Reads file contents from the config directory with sandbox validation.
 */
export const readFileTool = tool({
  description: 'Read file contents from the config directory. Path must be relative to config directory.',
  inputSchema: z.object({
    path: z.string().describe('Path relative to config directory (e.g., "schemas/user.json")'),
  }),
  execute: async ({ path }) => {
    try {
      // Validate and resolve path within sandbox
      const fullPath = resolveSandboxPath(path);
      const displayPath = getDisplayPath(fullPath);

      logger.debug(`Reading file: ${displayPath}`);

      // Read file contents
      const content = await readFile(fullPath, 'utf-8');

      const result = {
        success: true,
        content,
        path: displayPath,
      };

      logger.logToolExecution('read_file', { path }, result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result = {
        success: false,
        error: errorMessage,
        path,
      };

      logger.error(`Failed to read file: ${path}`, { error: errorMessage });
      logger.logToolExecution('read_file', { path }, result);
      return result;
    }
  },
});

/**
 * Write File Tool
 *
 * Creates or overwrites a file in the config directory.
 * Creates parent directories if they don't exist.
 */
export const writeFileTool = tool({
  description: 'Create or overwrite a file in the config directory. Creates parent directories if needed. Path must be relative to config directory.',
  inputSchema: z.object({
    path: z.string().describe('Path relative to config directory (e.g., "schemas/user.json")'),
    content: z.string().describe('Content to write to the file'),
  }),
  execute: async ({ path, content }) => {
    try {
      // Validate and resolve path within sandbox
      const fullPath = resolveSandboxPath(path);
      const displayPath = getDisplayPath(fullPath);

      logger.debug(`Writing file: ${displayPath}`);

      // Create parent directories if they don't exist
      const dir = dirname(fullPath);
      await mkdir(dir, { recursive: true });

      // Write file contents
      await writeFile(fullPath, content, 'utf-8');

      const result = {
        success: true,
        path: displayPath,
        bytesWritten: Buffer.byteLength(content, 'utf-8'),
      };

      logger.logToolExecution('write_file', { path, contentLength: content.length }, result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result = {
        success: false,
        error: errorMessage,
        path,
      };

      logger.error(`Failed to write file: ${path}`, { error: errorMessage });
      logger.logToolExecution('write_file', { path }, result);
      return result;
    }
  },
});

/**
 * Edit File Tool
 *
 * Search and replace text in a file.
 * CRITICAL: Verifies old_string exists before replacing.
 * Returns error if search text not found - NO SILENT FAILURES.
 */
export const editFileTool = tool({
  description: 'Search and replace text in a file within the config directory. Returns error if search text not found. Path must be relative to config directory.',
  inputSchema: z.object({
    path: z.string().describe('Path relative to config directory (e.g., "schemas/user.json")'),
    old_string: z.string().describe('Exact text to search for (must exist in file)'),
    new_string: z.string().describe('Text to replace it with'),
  }),
  execute: async ({ path, old_string, new_string }) => {
    try {
      // Validate and resolve path within sandbox
      const fullPath = resolveSandboxPath(path);
      const displayPath = getDisplayPath(fullPath);

      logger.debug(`Editing file: ${displayPath}`);

      // Read current file contents
      let content: string;
      try {
        content = await readFile(fullPath, 'utf-8');
      } catch (readError) {
        const errorMessage = readError instanceof Error ? readError.message : String(readError);
        throw new Error(`Failed to read file for editing: ${errorMessage}`);
      }

      // CRITICAL: Verify old_string exists in file - NO SILENT FAILURES
      if (!content.includes(old_string)) {
        const result = {
          success: false,
          error: `Search text not found in file. The old_string does not exist in ${displayPath}.`,
          path: displayPath,
          searchText: old_string.length > 100 ? old_string.substring(0, 100) + '...' : old_string,
        };

        logger.warn(`Edit failed: search text not found in ${displayPath}`);
        logger.logToolExecution('edit_file', { path, old_string_length: old_string.length }, result);
        return result;
      }

      // Count occurrences to inform user
      const occurrences = content.split(old_string).length - 1;

      // Perform the replacement (replaces all occurrences)
      const newContent = content.replace(new RegExp(old_string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), new_string);

      // Write the updated content
      try {
        await writeFile(fullPath, newContent, 'utf-8');
      } catch (writeError) {
        const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
        throw new Error(`Failed to write edited file: ${errorMessage}`);
      }

      const result = {
        success: true,
        path: displayPath,
        occurrences,
        oldLength: old_string.length,
        newLength: new_string.length,
        changeDescription: `Replaced ${occurrences} occurrence(s) of text (${old_string.length} chars -> ${new_string.length} chars)`,
      };

      logger.logToolExecution('edit_file', { path, occurrences }, result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result = {
        success: false,
        error: errorMessage,
        path,
      };

      logger.error(`Failed to edit file: ${path}`, { error: errorMessage });
      logger.logToolExecution('edit_file', { path }, result);
      return result;
    }
  },
});

// Export all file operation tools
export const fileTools = {
  read_file: readFileTool,
  //write_file: writeFileTool,
  edit_file: editFileTool,
};
