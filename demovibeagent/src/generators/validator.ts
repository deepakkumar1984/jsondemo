/**
 * Config Validator
 *
 * Validates generated configs against JSON schemas using AJV.
 * References patterns from democonfig/scripts/ai-config-generator.ts (lines 915-949)
 */

import Ajv from 'ajv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as logger from '../utils/logger.js';

const CONFIG_ROOT = resolve(process.cwd(), '../democonfig/config');

interface ValidationResult {
  valid: boolean;
  errors?: any[];
  errorSummary?: string;
}

// Cache for loaded schemas
const schemaCache = new Map<string, any>();

/**
 * Load format schema for a config type
 *
 * @param type - Config type (schema, app)
 * @returns JSON Schema object
 * @throws Error if schema file not found
 */
function loadFormatSchema(type: string): any {
  // Check cache first
  if (schemaCache.has(type)) {
    return schemaCache.get(type);
  }

  const schemaFileName = type === 'app' ? 'apps-format.json' : `${type}-format.json`;
  const schemaPath = resolve(CONFIG_ROOT, schemaFileName);

  if (!existsSync(schemaPath)) {
    throw new Error(`Format schema not found: ${schemaPath}`);
  }

  try {
    const content = readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);

    // Cache it
    schemaCache.set(type, schema);

    return schema;
  } catch (error) {
    throw new Error(`Failed to load format schema for ${type}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Validate config against its JSON Schema
 *
 * @param config - Config object to validate
 * @param type - Config type
 * @returns Validation result with errors if any
 */
export function validateConfig(config: any, type: 'schema' | 'api' | 'page' | 'app'): ValidationResult {
  // API and page types are TypeScript code, not JSON - skip validation
  if (type === 'api' || type === 'page') {
    return { valid: true };
  }

  try {
    // Load format schema
    const formatSchema = loadFormatSchema(type);

    // Create AJV instance
    const ajv = new Ajv({
      strict: false,
      allowUnionTypes: true,
      allErrors: true,
      verbose: true
    });

    // Compile validator
    const validate = ajv.compile(formatSchema);

    // Validate
    const isValid = validate(config);

    if (isValid) {
      logger.debug('Config validation passed', { type });
      return { valid: true };
    }

    // Validation failed - format error messages
    const errors = validate.errors || [];
    const errorSummary = errors.map((err: any) => {
      const path = err.instancePath || 'root';
      const message = err.message || 'validation error';
      const keyword = err.keyword;
      return `- ${path}: ${message} (${keyword})`;
    }).join('\n');

    logger.warn('Config validation failed', {
      type,
      errorCount: errors.length,
      errors: errors.slice(0, 5) // Log first 5 errors
    });

    return {
      valid: false,
      errors,
      errorSummary
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Validation error', { type, error: errorMessage });

    return {
      valid: false,
      errors: [{ message: errorMessage }],
      errorSummary: `Validation failed: ${errorMessage}`
    };
  }
}

/**
 * Strip markdown code blocks from generated code
 *
 * @param content - Generated content
 * @returns Cleaned content without markdown fences
 */
export function stripMarkdownCodeBlocks(content: string): string {
  let cleaned = content.trim();

  // Remove ```language ... ``` blocks
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');

    // Remove first line (```typescript, ```json, etc.)
    lines.shift();

    // Remove last line if it's ```
    if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
      lines.pop();
    }

    cleaned = lines.join('\n').trim();
  }

  return cleaned;
}

/**
 * Parse config response from AI
 *
 * Handles both JSON configs and TypeScript/React code
 *
 * @param content - Raw AI response
 * @param type - Config type
 * @returns Parsed config (object or string)
 * @throws Error if JSON parsing fails for schema/app types
 */
export function parseConfigResponse(content: string, type: 'schema' | 'api' | 'page' | 'app'): any {
  // Strip markdown code blocks
  const cleaned = stripMarkdownCodeBlocks(content);

  // For API/page types, content IS the code
  if (type === 'api' || type === 'page') {
    return cleaned;
  }

  // For schema/app types, parse JSON
  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    logger.error('Failed to parse JSON config', {
      type,
      error: parseError instanceof Error ? parseError.message : parseError,
      contentPreview: cleaned.substring(0, 200)
    });

    throw new Error(
      `Failed to parse ${type} config as JSON: ${parseError instanceof Error ? parseError.message : parseError}`
    );
  }
}

/**
 * Validate TypeScript/React code syntax (basic check)
 *
 * Does basic syntax validation for generated code
 *
 * @param code - TypeScript/React code
 * @param type - Type (api or page)
 * @returns Validation result
 */
export function validateCodeSyntax(code: string, type: 'api' | 'page'): ValidationResult {
  // Basic checks
  const checks = {
    api: {
      hasExport: /export\s+const\s+\w+Router\s*=/.test(code),
      hasHono: /new\s+Hono/.test(code),
      hasImports: /^import\s+/m.test(code)
    },
    page: {
      hasExport: /export\s+default\s+function/.test(code),
      hasReact: /from\s+['"]react['"]/.test(code),
      hasImports: /^import\s+/m.test(code)
    }
  };

  const typeChecks = checks[type];
  const failures: string[] = [];

  if (!typeChecks.hasExport) {
    failures.push(`Missing expected export pattern for ${type}`);
  }

  if (!typeChecks.hasImports) {
    failures.push('Missing import statements');
  }

  if (type === 'api' && 'hasHono' in typeChecks && !typeChecks.hasHono) {
    failures.push('Missing Hono router initialization');
  }

  if (type === 'page' && 'hasReact' in typeChecks && !typeChecks.hasReact) {
    failures.push('Missing React import');
  }

  if (failures.length > 0) {
    return {
      valid: false,
      errorSummary: failures.join('; ')
    };
  }

  return { valid: true };
}
