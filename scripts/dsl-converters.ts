/**
 * DSL Converters
 *
 * Convert verbose JSON configs to compact DSL format for AI context.
 * This reduces token usage while providing essential information.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Convert schema configs to compact DSL
 * Format: TABLE table_name (column: type constraints, ...)
 */
export function schemaToDSL(schemaPath: string): string {
  try {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const lines: string[] = [];

    lines.push(`TABLE ${schema.table} {`);

    for (const col of schema.columns) {
      let line = `  ${col.name}: ${col.type}`;

      const constraints: string[] = [];
      if (col.primaryKey) constraints.push('PK');
      if (col.notNull) constraints.push('NOT NULL');
      if (col.unique) constraints.push('UNIQUE');
      if (col.defaultFn) constraints.push(`DEFAULT ${col.defaultFn}()`);
      else if (col.default) constraints.push(`DEFAULT ${col.default}`);
      if (col.enum) constraints.push(`ENUM(${col.enum.join(',')})`);
      if (col.references) {
        constraints.push(`FK->${col.references.table}.${col.references.column}`);
      }

      if (constraints.length > 0) {
        line += ` [${constraints.join(', ')}]`;
      }

      if (col.description) {
        line += ` // ${col.description}`;
      }

      lines.push(line);
    }

    if (schema.indexes && schema.indexes.length > 0) {
      lines.push('  // Indexes:');
      for (const idx of schema.indexes) {
        const unique = idx.unique ? 'UNIQUE ' : '';
        lines.push(`  // ${unique}INDEX ${idx.name} ON (${idx.columns.join(', ')})`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  } catch (error) {
    return `// Error reading schema: ${schemaPath}`;
  }
}

/**
 * Get all existing schemas as DSL
 */
export function getAllSchemasDSL(schemaDir: string = 'config/schema'): string {
  if (!existsSync(schemaDir)) {
    return '// No existing schemas';
  }

  const files = readdirSync(schemaDir).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    return '// No existing schemas';
  }

  const dslParts: string[] = ['// === EXISTING DATABASE SCHEMAS ===', ''];

  for (const file of files) {
    const schemaPath = join(schemaDir, file);
    dslParts.push(schemaToDSL(schemaPath));
    dslParts.push('');
  }

  return dslParts.join('\n');
}

/**
 * Convert API config to compact DSL
 * Format: API /base/path { GET /path -> description, POST /path -> description }
 */
export function apiToDSL(apiPath: string): string {
  try {
    const api = JSON.parse(readFileSync(apiPath, 'utf-8'));
    const lines: string[] = [];

    lines.push(`API ${api.basePath} {`);
    lines.push(`  name: "${api.name}"`);

    if (api.operations && api.operations.length > 0) {
      lines.push('  operations:');
      for (const op of api.operations) {
        const desc = op.description || op.id;
        lines.push(`    ${op.method} ${op.path} -> ${desc}`);

        // Show main action types
        if (op.actions && op.actions.length > 0) {
          const actionTypes = op.actions.map((a: any) => a.type).join(' > ');
          lines.push(`      flow: ${actionTypes}`);
        }
      }
    }

    lines.push('}');
    return lines.join('\n');
  } catch (error) {
    return `// Error reading API: ${apiPath}`;
  }
}

/**
 * Get all existing APIs as DSL
 */
export function getAllAPIsDSL(apiDir: string = 'config/api'): string {
  if (!existsSync(apiDir)) {
    return '// No existing APIs';
  }

  const files = readdirSync(apiDir).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    return '// No existing APIs';
  }

  const dslParts: string[] = ['// === EXISTING API ENDPOINTS ===', ''];

  for (const file of files) {
    const apiPath = join(apiDir, file);
    dslParts.push(apiToDSL(apiPath));
    dslParts.push('');
  }

  return dslParts.join('\n');
}

/**
 * Convert page config to compact DSL
 * Format: PAGE name { dataSources: [...], components: [...] }
 */
export function pageToDSL(pagePath: string): string {
  try {
    const page = JSON.parse(readFileSync(pagePath, 'utf-8'));
    const lines: string[] = [];

    const pageName = pagePath.split('/').pop()?.replace('.json', '') || 'unknown';
    lines.push(`PAGE ${pageName} {`);

    if (page.dataSources) {
      lines.push('  dataSources:');
      for (const [key, ds] of Object.entries(page.dataSources)) {
        const source = ds as any;
        lines.push(`    ${key}: ${source.method || 'GET'} ${source.url}`);
      }
    }

    if (page.children && page.children.length > 0) {
      lines.push('  components:');
      const componentTypes = page.children.map((c: any) => c.type);
      lines.push(`    ${componentTypes.join(', ')}`);
    }

    lines.push('}');
    return lines.join('\n');
  } catch (error) {
    return `// Error reading page: ${pagePath}`;
  }
}

/**
 * Get all existing pages as DSL
 */
export function getAllPagesDSL(pagesDir: string = 'config/pages'): string {
  if (!existsSync(pagesDir)) {
    return '// No existing pages';
  }

  const files = readdirSync(pagesDir).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    return '// No existing pages';
  }

  const dslParts: string[] = ['// === EXISTING PAGES ===', ''];

  for (const file of files) {
    const pagePath = join(pagesDir, file);
    dslParts.push(pageToDSL(pagePath));
    dslParts.push('');
  }

  return dslParts.join('\n');
}

/**
 * Get context for schema generation
 * Returns: all existing schemas in DSL format
 */
export function getSchemaContext(): string {
  return getAllSchemasDSL();
}

/**
 * Get context for API generation
 * Returns: relevant schema in DSL format + existing API if regenerating
 */
export function getAPIContext(resourceName: string, isRegenerate: boolean = false): string {
  const parts: string[] = [];

  // Add all schemas (API needs to know about all tables for foreign keys)
  parts.push(getAllSchemasDSL());
  parts.push('');

  // If regenerating, include current API config
  if (isRegenerate) {
    const apiPath = join('config/api', `${resourceName}.json`);
    if (existsSync(apiPath)) {
      parts.push('// === CURRENT API CONFIGURATION (for update) ===');
      parts.push(apiToDSL(apiPath));
      parts.push('');
    }
  }

  return parts.join('\n');
}

/**
 * Get context for page generation
 * Returns: all APIs in DSL format so page knows correct endpoints
 */
export function getPageContext(): string {
  const parts: string[] = [];

  // Add all APIs (pages need to know available endpoints)
  parts.push(getAllAPIsDSL());
  parts.push('');

  return parts.join('\n');
}

/**
 * Get context for app generation
 * Returns: all pages in DSL format so app knows what pages exist
 */
export function getAppContext(): string {
  const parts: string[] = [];

  // Add all pages (app needs to know available pages for routes/nav)
  parts.push(getAllPagesDSL());
  parts.push('');

  return parts.join('\n');
}

/**
 * Build context string based on config type
 */
export function buildContext(
  type: 'schema' | 'api' | 'page' | 'app',
  options: { resourceName?: string; isRegenerate?: boolean } = {}
): string {
  switch (type) {
    case 'schema':
      return getSchemaContext();
    case 'api':
      return getAPIContext(options.resourceName || '', options.isRegenerate || false);
    case 'page':
      return getPageContext();
    case 'app':
      return getAppContext();
    default:
      return '';
  }
}
