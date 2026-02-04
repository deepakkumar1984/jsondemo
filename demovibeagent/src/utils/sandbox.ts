/**
 * Sandbox Utilities
 *
 * Provides path validation and security to ensure all file operations
 * stay within the democonfig/config directory.
 */

import { resolve, relative, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

// Get the project root (demovibeagent directory)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

// Config directory is ../democonfig/config relative to demovibeagent
export const CONFIG_ROOT = resolve(PROJECT_ROOT, '../democonfig/config');

/**
 * Resolve and validate that a path is within the config sandbox
 *
 * @param relativePath - Path relative to config directory
 * @returns Absolute path within sandbox
 * @throws Error if path is outside sandbox (security violation)
 */
export function resolveSandboxPath(relativePath: string): string {
  // Resolve the full path
  const fullPath = resolve(CONFIG_ROOT, relativePath);

  // Check if it's within the sandbox
  const relativeToRoot = relative(CONFIG_ROOT, fullPath);

  // If path starts with .. or /, it's outside the sandbox
  if (relativeToRoot.startsWith('..') || relativeToRoot.startsWith('/')) {
    throw new Error(
      `Security violation: Path "${relativePath}" is outside config directory. ` +
      `All operations must stay within: ${CONFIG_ROOT}`
    );
  }

  return fullPath;
}

/**
 * Get display path (relative to config root)
 *
 * @param fullPath - Absolute file path
 * @returns Path relative to config directory
 */
export function getDisplayPath(fullPath: string): string {
  return relative(CONFIG_ROOT, fullPath);
}

/**
 * Get the config root directory
 *
 * @returns Absolute path to config directory
 */
export function getConfigRoot(): string {
  return CONFIG_ROOT;
}

/**
 * Validate that a path is safe (no directory traversal attempts)
 *
 * @param path - Path to validate
 * @returns true if safe
 * @throws Error if path contains suspicious patterns
 */
export function validatePathSafety(path: string): boolean {
  // Check for directory traversal attempts
  if (path.includes('..')) {
    throw new Error(`Invalid path: contains directory traversal (..)`);
  }

  // Check for absolute paths
  if (path.startsWith('/')) {
    throw new Error(`Invalid path: must be relative, not absolute`);
  }

  // Check for null bytes (security vulnerability)
  if (path.includes('\0')) {
    throw new Error(`Invalid path: contains null byte`);
  }

  return true;
}

/**
 * Extract filename from path
 *
 * @param path - File path
 * @returns Filename without directory
 */
export function getFileName(path: string): string {
  return basename(path);
}

/**
 * Extract directory from path
 *
 * @param path - File path
 * @returns Directory portion of path
 */
export function getDirectory(path: string): string {
  return dirname(path);
}
