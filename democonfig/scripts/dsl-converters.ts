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
 * Convert API TypeScript route file to compact DSL
 * Extracts route definitions from TypeScript code
 */
export function apiToDSL(apiPath: string): string {
  try {
    const content = readFileSync(apiPath, 'utf-8');
    const lines: string[] = [];

    // Extract resource name from filename (e.g., employees.routes.ts -> employees)
    const resourceName = apiPath.split('/').pop()?.replace('.routes.ts', '') || 'unknown';

    lines.push(`API /${resourceName} {`);

    // Extract route definitions using regex
    const routePattern = /(?:router|Router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const routes: Array<{method: string, path: string}> = [];

    let match;
    while ((match = routePattern.exec(content)) !== null) {
      routes.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }

    if (routes.length > 0) {
      lines.push('  operations:');
      for (const route of routes) {
        const fullPath = route.path === '/' ? `/${resourceName}` : `/${resourceName}${route.path}`;
        lines.push(`    ${route.method} ${fullPath}`);
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

  const files = readdirSync(apiDir).filter(f => f.endsWith('.routes.ts'));

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
 * Returns: schemas + existing route file content if regenerating + other APIs summary
 */
export function getAPIContext(resourceName: string, isRegenerate: boolean = false): string {
  const parts: string[] = [];

  // Add all schemas (API needs to know about all tables for foreign keys)
  parts.push(getAllSchemasDSL());
  parts.push('');

  // Add summary of other existing APIs
  parts.push(getAllAPIsDSL());
  parts.push('');

  // If regenerating, include full current TypeScript file content
  if (isRegenerate) {
    const apiPath = join('config/api', `${resourceName}.routes.ts`);
    if (existsSync(apiPath)) {
      const currentContent = readFileSync(apiPath, 'utf-8');
      parts.push('// === CURRENT ROUTE FILE (for update/modification) ===');
      parts.push('// Review this code and make necessary changes based on user requirements');
      parts.push('');
      parts.push(currentContent);
      parts.push('');
    }
  }

  return parts.join('\n');
}

/**
 * Extract request/response info from TypeScript route file
 */
function extractAPIRequestResponse(apiPath: string): string {
  try {
    const content = readFileSync(apiPath, 'utf-8');
    const lines: string[] = [];

    const resourceName = apiPath.split('/').pop()?.replace('.routes.ts', '') || 'unknown';
    lines.push(`API /${resourceName} {`);

    // Extract route methods and analyze request/response patterns
    const routePattern = /(?:router|Router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`][^{]*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;

    let match;
    while ((match = routePattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      const body = match[3];

      const fullPath = path === '/' ? `/${resourceName}` : `/${resourceName}${path}`;
      lines.push(`  ${method} ${fullPath}`);

      // Extract request body fields (look for body.fieldName patterns)
      const bodyFields = new Set<string>();
      const bodyPattern = /body\.(\w+)/g;
      let bodyMatch;
      while ((bodyMatch = bodyPattern.exec(body)) !== null) {
        bodyFields.add(bodyMatch[1]);
      }

      if (bodyFields.size > 0) {
        lines.push(`    Request: { ${Array.from(bodyFields).join(', ')} }`);
      }

      // Extract response structure (look for c.json patterns)
      const jsonPattern = /c\.json\s*\(\s*\{([^}]+)\}/g;
      const jsonMatch = jsonPattern.exec(body);
      if (jsonMatch) {
        const responseFields = jsonMatch[1]
          .split(',')
          .map(s => s.trim().split(':')[0].trim())
          .filter(s => s.length > 0);
        lines.push(`    Response: { ${responseFields.join(', ')} }`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  } catch (error) {
    return `// Error parsing API: ${apiPath}`;
  }
}

/**
 * Get context for page generation
 * Returns: all APIs with request/response info so pages know how to call them
 */
export function getPageContext(): string {
  const parts: string[] = [];

  parts.push('// === AVAILABLE API ENDPOINTS ===');
  parts.push('// Use these endpoints in dataSources');
  parts.push('');

  const apiDir = 'config/api';
  if (!existsSync(apiDir)) {
    parts.push('// No existing APIs');
    return parts.join('\n');
  }

  const files = readdirSync(apiDir).filter(f => f.endsWith('.routes.ts'));

  if (files.length === 0) {
    parts.push('// No existing APIs');
    return parts.join('\n');
  }

  for (const file of files) {
    const apiPath = join(apiDir, file);
    parts.push(extractAPIRequestResponse(apiPath));
    parts.push('');
  }

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
