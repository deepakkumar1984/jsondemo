/**
 * Unified DSL Parser Interface
 *
 * Converts DSL → JSON for all config types (Schema, API, Page, Apps)
 *
 * Usage:
 *   import { parseDSL } from './dsl';
 *   const config = parseDSL('schema', dslText);
 */

import { parseSchema } from './schema-parser';
import { parseApi } from './api-parser';
import { parsePage } from './page-parser';
import { parseApp } from './app-parser';

export type DSLType = 'schema' | 'api' | 'page' | 'app';

/**
 * Parse DSL text into JSON config
 *
 * @param type - Config type (schema, api, page, app)
 * @param dsl - DSL text to parse
 * @returns JSON config object
 */
export function parseDSL(type: DSLType, dsl: string): any {
  // Strip markdown code blocks if present
  let cleanDSL = dsl.trim();

  if (cleanDSL.startsWith('```')) {
    const lines = cleanDSL.split('\n');
    lines.shift(); // Remove ```
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop(); // Remove closing ```
    }
    cleanDSL = lines.join('\n').trim();
  }

  try {
    switch (type) {
      case 'schema':
        return parseSchema(cleanDSL);

      case 'api':
        return parseApi(cleanDSL);

      case 'page':
        return parsePage(cleanDSL);

      case 'app':
        return parseApp(cleanDSL);

      default:
        throw new Error(`Unknown DSL type: ${type}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(`DSL Parse Error (${type}): ${err.message}\n\nDSL:\n${cleanDSL.split('\n').slice(0, 10).join('\n')}${cleanDSL.split('\n').length > 10 ? '\n...' : ''}`);
  }
}

/**
 * Validate DSL syntax without full parsing
 * Returns array of syntax errors, empty if valid
 */
export function validateDSL(type: DSLType, dsl: string): string[] {
  const errors: string[] = [];

  try {
    parseDSL(type, dsl);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    errors.push(err.message);
  }

  return errors;
}

// Export individual parsers
export { parseSchema, parseApi, parsePage, parseApp };
export { DSLType as ConfigType };
