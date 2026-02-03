/**
 * Config Validation Utility
 *
 * Validates configuration files against their JSON Schema definitions.
 * Supports API, Page, Apps, Schema, and Requirements configs.
 *
 * Usage:
 *   tsx scripts/validate-config.ts <config-file>
 *   tsx scripts/validate-config.ts config/api/employees.json
 *   tsx scripts/validate-config.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';

// Simple JSON Schema validator (no external dependencies)
interface ValidationError {
  path: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Detect config type from file path
function detectConfigType(filePath: string): string | null {
  if (filePath.includes('/api/')) return 'api';
  if (filePath.includes('/pages/')) return 'page';
  if (filePath.includes('/schema/') && !filePath.endsWith('schema-format.json')) return 'schema';
  if (filePath.endsWith('apps.json')) return 'apps';
  if (filePath.includes('requirements')) return 'requirements';
  return null;
}

// Get schema file path for config type
function getSchemaPath(configType: string): string {
  const schemaMap: Record<string, string> = {
    'api': 'config/api-format.json',
    'page': 'config/page-format.json',
    'apps': 'config/apps-format.json',
    'schema': 'config/schema-format.json',
    'requirements': 'config/requirements-format.json'
  };

  return schemaMap[configType];
}

// Simple schema validation (checks required fields and types)
function validateConfig(config: any, schema: any, path: string = ''): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (!(requiredField in config)) {
        errors.push({
          path: path ? `${path}.${requiredField}` : requiredField,
          message: `Missing required field`
        });
      }
    }
  }

  // Check types
  if (schema.type === 'object' && schema.properties) {
    for (const [key, value] of Object.entries(config)) {
      const propSchema = schema.properties[key];
      if (!propSchema && schema.additionalProperties === false) {
        errors.push({
          path: path ? `${path}.${key}` : key,
          message: `Unexpected property`
        });
      } else if (propSchema) {
        const propPath = path ? `${path}.${key}` : key;
        errors.push(...validateConfig(value, propSchema, propPath));
      }
    }
  }

  // Check array items
  if (schema.type === 'array' && Array.isArray(config) && schema.items) {
    config.forEach((item, index) => {
      const itemPath = `${path}[${index}]`;
      errors.push(...validateConfig(item, schema.items, itemPath));
    });
  }

  // Check enums
  if (schema.enum && !schema.enum.includes(config)) {
    errors.push({
      path,
      message: `Value '${config}' is not in allowed values: ${schema.enum.join(', ')}`
    });
  }

  // Check patterns
  if (schema.pattern && typeof config === 'string') {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(config)) {
      errors.push({
        path,
        message: `Value does not match pattern: ${schema.pattern}`
      });
    }
  }

  return errors;
}

// Validate a single config file
function validateFile(filePath: string): boolean {
  console.log(`\n🔍 Validating: ${filePath}`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  // Detect config type
  const configType = detectConfigType(filePath);
  if (!configType) {
    console.error(`❌ Could not detect config type from path: ${filePath}`);
    return false;
  }

  console.log(`   Type: ${configType}`);

  // Load schema
  const schemaPath = getSchemaPath(configType);
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema not found: ${schemaPath}`);
    return false;
  }

  let schema: any;
  let config: any;

  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  } catch (error) {
    console.error(`❌ Failed to parse schema: ${error}`);
    return false;
  }

  try {
    config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error(`❌ Failed to parse config: ${error}`);
    return false;
  }

  // Validate
  const errors = validateConfig(config, schema);

  if (errors.length === 0) {
    console.log(`✅ Valid`);
    return true;
  } else {
    console.log(`❌ Validation failed with ${errors.length} error(s):`);
    errors.forEach(error => {
      console.log(`   - ${error.path}: ${error.message}`);
    });
    return false;
  }
}

// ===========================================
// CROSS-REFERENCE VALIDATION
// ===========================================

interface ConfigRegistry {
  schemas: Map<string, any>;     // table name -> schema config
  apis: Map<string, any>;        // resource name -> api config
  pages: Map<string, any>;       // page id -> page config
  pagePathMismatch: Array<{ file: string; pageField: string; expectedId: string }>;
  apps: any | null;              // apps.json content
  apiOperations: Map<string, any>; // operation path -> operation config
}

// Load all configs into registry
function loadConfigRegistry(): ConfigRegistry {
  const registry: ConfigRegistry = {
    schemas: new Map(),
    apis: new Map(),
    pages: new Map(),
    pagePathMismatch: [],
    apps: null,
    apiOperations: new Map(),
  };

  // Load schemas
  const schemaDir = 'config/schema';
  if (fs.existsSync(schemaDir)) {
    fs.readdirSync(schemaDir).forEach(file => {
      if (file.endsWith('.json') && !file.endsWith('-format.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(schemaDir, file), 'utf-8'));
          const tableName = content.table || file.replace('.json', '');
          registry.schemas.set(tableName, content);
        } catch {}
      }
    });
  }

  // Load APIs
  const apiDir = 'config/api';
  if (fs.existsSync(apiDir)) {
    fs.readdirSync(apiDir).forEach(file => {
      if (file.endsWith('.json') && !file.endsWith('-format.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(path.join(apiDir, file), 'utf-8'));
          const resource = content.resource || file.replace('.json', '');
          registry.apis.set(resource, content);

          // Index operations by their full path (normalized without trailing slash)
          const basePath = content.basePath || `/api/${resource}`;
          if (content.operations && Array.isArray(content.operations)) {
            for (const op of content.operations) {
              const opPath = basePath + (op.path || '');
              const normalizedPath = opPath.replace(/\/$/, '');
              const key = `${op.method} ${normalizedPath}`;
              registry.apiOperations.set(key, { ...op, apiResource: resource, apiBasePath: basePath });
            }
          }
        } catch {}
      }
    });
  }

  // Load pages (recursive for folder structure)
  function loadPagesRecursive(dir: string, prefix: string = '') {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        loadPagesRecursive(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith('.json') && !entry.name.endsWith('-format.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          // Expected page ID from file path (folder structure)
          const expectedId = prefix ? `${prefix}/${entry.name.replace('.json', '')}` : entry.name.replace('.json', '');
          // Actual page ID from content.page field
          const actualId = content.page || expectedId;

          // Track mismatch between file path and page field
          if (content.page && content.page !== expectedId) {
            registry.pagePathMismatch.push({
              file: fullPath,
              pageField: content.page,
              expectedId: expectedId,
            });
          }

          registry.pages.set(actualId, content);
        } catch {}
      }
    });
  }
  loadPagesRecursive('config/pages');

  // Load apps.json
  const appsPath = 'config/apps.json';
  if (fs.existsSync(appsPath)) {
    try {
      registry.apps = JSON.parse(fs.readFileSync(appsPath, 'utf-8'));
    } catch {}
  }

  return registry;
}

// ===========================================
// ENHANCED VALIDATION FUNCTIONS
// ===========================================

// Validate action workflow schemas
function validateActionSchemas(registry: ConfigRegistry): ValidationError[] {
  const errors: ValidationError[] = [];

  console.log('   Validating action workflows...');

  const ACTION_SCHEMAS: Record<string, { required: string[]; optional: string[] }> = {
    'validate': { required: ['rules'], optional: [] },
    'transform': { required: ['set'], optional: [] },
    'calc': { required: ['set'], optional: [] },
    'condition': { required: ['if'], optional: ['then', 'else'] },
    'loop': { required: ['over', 'actions'], optional: ['as'] },
    'db.query': { required: ['table'], optional: ['where', 'limit', 'into', 'orderBy'] },
    'db.execute': { required: ['sql'], optional: ['params', 'into'] },
    'db.insert': { required: ['table', 'map'], optional: ['returning'] },
    'db.update': { required: ['table', 'where', 'map'], optional: [] },
    'db.delete': { required: ['table', 'where'], optional: [] },
    'db.bulkInsert': { required: ['table', 'items'], optional: [] },
    'http.call': { required: ['url'], optional: ['method', 'body', 'headers'] },
    'response.map': { required: ['fields'], optional: ['status'] },
    'transform.array': { required: ['from', 'fieldMap'], optional: [] },
    'transaction': { required: ['actions'], optional: [] },
    'parallel': { required: ['actions'], optional: [] },
    'error': { required: ['message'], optional: ['status', 'code'] },
  };

  for (const [resource, api] of registry.apis) {
    if (!api.operations || !Array.isArray(api.operations)) continue;

    for (const operation of api.operations) {
      const opId = operation.id || 'unknown';
      const actions = operation.actions || [];

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const actionType = action.type;

        if (!actionType) {
          errors.push({
            path: `api/${resource}.operations[${opId}].actions[${i}]`,
            message: `Action missing 'type' field`,
          });
          continue;
        }

        const schema = ACTION_SCHEMAS[actionType];
        if (!schema) {
          errors.push({
            path: `api/${resource}.operations[${opId}].actions[${i}]`,
            message: `Unknown action type '${actionType}'. Valid types: ${Object.keys(ACTION_SCHEMAS).join(', ')}`,
          });
          continue;
        }

        // Check required fields
        for (const reqField of schema.required) {
          if (!(reqField in action)) {
            errors.push({
              path: `api/${resource}.operations[${opId}].actions[${i}]`,
              message: `Action '${actionType}' missing required field '${reqField}'`,
            });
          }
        }
      }
    }
  }

  return errors;
}

// Helper: Convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Validate SQL type casts in db.execute actions
function validateSqlTypeCasts(registry: ConfigRegistry): ValidationError[] {
  const errors: ValidationError[] = [];

  console.log('   Validating SQL type casts...');

  for (const [resource, api] of registry.apis) {
    if (!api.operations || !Array.isArray(api.operations)) continue;

    for (const operation of api.operations) {
      const opId = operation.id || 'unknown';
      const actions = operation.actions || [];

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        if (action.type === 'db.execute' && action.sql) {
          const sql = action.sql;

          // Check for incomplete type casts in WHERE clauses
          // Wrong pattern: ($N::type IS NULL OR column = $N) - cast only on NULL check
          const incompleteCastPattern = /\(\$(\d+)::(text|uuid|integer|timestamp|timestamptz|boolean)\s+IS\s+NULL\s+OR\s+(\w+\.)?(\w+)\s*=\s*\$\1(?!::)\)/gi;
          const incompleteCastMatches = sql.matchAll(incompleteCastPattern);

          for (const match of incompleteCastMatches) {
            const paramNum = match[1];
            const castType = match[2].toLowerCase();
            const columnName = match[4];

            errors.push({
              path: `api/${resource}.operations[${opId}].actions[${i}]`,
              message: `SQL uses incomplete cast pattern '($${paramNum}::${castType} IS NULL OR ${columnName} = $${paramNum})'. PostgreSQL will cause type mismatch errors. Use '($${paramNum}::${castType} IS NULL OR ${columnName} = $${paramNum}::${castType})' to cast both sides.`,
            });
          }

          // Check for correct pattern with type mismatches
          // Pattern: ($N::type IS NULL OR column = $N::type) - both sides cast
          const completeCastPattern = /\(\$(\d+)::(text|uuid|integer|timestamp|timestamptz|boolean)\s+IS\s+NULL\s+OR\s+(\w+\.)?(\w+)\s*=\s*\$\1::(text|uuid|integer|timestamp|timestamptz|boolean)\)/gi;
          const completeCastMatches = sql.matchAll(completeCastPattern);

          for (const match of completeCastMatches) {
            const paramNum = match[1];
            const castType1 = match[2].toLowerCase();
            const columnName = match[4];
            const castType2 = match[5].toLowerCase();

            // Verify both casts match
            if (castType1 !== castType2) {
              errors.push({
                path: `api/${resource}.operations[${opId}].actions[${i}]`,
                message: `SQL has inconsistent casts: $${paramNum}::${castType1} in NULL check but $${paramNum}::${castType2} in comparison. Both should be the same type.`,
              });
              continue;
            }

            // Find the column in schemas and verify type matches
            for (const [tableName, schema] of registry.schemas) {
              const column = (schema.columns || []).find((col: any) => col.name === columnName);

              if (column) {
                const expectedType = column.type;

                // Check for type mismatches
                const typeMap: Record<string, string[]> = {
                  'uuid': ['uuid'],
                  'text': ['text', 'varchar', 'char'],
                  'integer': ['integer', 'int', 'smallint', 'bigint'],
                  'timestamp': ['timestamp'],
                  'timestamptz': ['timestamptz', 'timestamp'],
                  'boolean': ['boolean', 'bool'],
                };

                const validCasts = typeMap[expectedType] || [expectedType];

                if (!validCasts.includes(castType1)) {
                  errors.push({
                    path: `api/${resource}.operations[${opId}].actions[${i}]`,
                    message: `SQL casts parameter $${paramNum} to '${castType1}' but column '${columnName}' in table '${tableName}' has type '${expectedType}'. Change to '::${expectedType}' to match column type.`,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return errors;
}

// Validate database insert/update compliance with schema
function validateDatabaseCompliance(registry: ConfigRegistry): ValidationError[] {
  const errors: ValidationError[] = [];

  console.log('   Validating database schema compliance...');

  for (const [resource, api] of registry.apis) {
    if (!api.operations || !Array.isArray(api.operations)) continue;

    for (const operation of api.operations) {
      const opId = operation.id || 'unknown';
      const actions = operation.actions || [];

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        // Validate db.insert
        if (action.type === 'db.insert' && action.table && action.map) {
          const schema = registry.schemas.get(action.table);
          if (!schema) {
            errors.push({
              path: `api/${resource}.operations[${opId}].actions[${i}]`,
              message: `db.insert references non-existent table '${action.table}'`,
            });
            continue;
          }

          const notNullColumns = (schema.columns || [])
            .filter((col: any) => col.notNull && !col.default && !col.defaultFn && !col.primaryKey)
            .map((col: any) => col.name);

          const providedFields = Object.keys(action.map);

          for (const required of notNullColumns) {
            // Check both camelCase and snake_case versions
            const snakeCase = camelToSnake(required);
            if (!providedFields.includes(required) && !providedFields.includes(snakeCase)) {
              errors.push({
                path: `api/${resource}.operations[${opId}].actions[${i}]`,
                message: `db.insert missing required NOT NULL field '${required}' (or '${snakeCase}') for table '${action.table}'. Provided: ${providedFields.join(', ')}`,
              });
            }
          }
        }

        // Validate db.update
        if (action.type === 'db.update' && action.table) {
          const schema = registry.schemas.get(action.table);
          if (!schema) {
            errors.push({
              path: `api/${resource}.operations[${opId}].actions[${i}]`,
              message: `db.update references non-existent table '${action.table}'`,
            });
          }
        }

        // Validate db.query
        if (action.type === 'db.query' && action.table) {
          const schema = registry.schemas.get(action.table);
          if (!schema) {
            errors.push({
              path: `api/${resource}.operations[${opId}].actions[${i}]`,
              message: `db.query references non-existent table '${action.table}'`,
            });
          }
        }
      }
    }
  }

  return errors;
}

// Validate schema type consistency (UUID columns, foreign key types)
function validateSchemaTypes(registry: ConfigRegistry): ValidationError[] {
  const errors: ValidationError[] = [];

  console.log('   Validating schema type consistency...');

  for (const [tableName, schema] of registry.schemas) {
    const columns = schema.columns || [];

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];

      // Check 1: UUID primary keys should use type 'uuid' not 'text'
      if (col.primaryKey && col.defaultFn === 'uuid' && col.type !== 'uuid') {
        errors.push({
          path: `schema/${tableName}.columns[${i}]`,
          message: `Column '${col.name}' is a UUID primary key but uses type '${col.type}'. Should be 'uuid'`,
        });
      }

      // Check 2: Foreign key columns should match the referenced column type
      if (col.references) {
        const refTable = col.references.table;
        const refColumn = col.references.column;
        const refSchema = registry.schemas.get(refTable);

        if (refSchema) {
          const refCol = (refSchema.columns || []).find((c: any) => c.name === refColumn);

          if (refCol && refCol.type !== col.type) {
            errors.push({
              path: `schema/${tableName}.columns[${i}]`,
              message: `Foreign key '${col.name}' has type '${col.type}' but references ${refTable}.${refColumn} which has type '${refCol.type}'. Types must match`,
            });
          }
        }
      }
    }
  }

  return errors;
}

// Validate page data paths and API endpoints
function validatePageDataPaths(registry: ConfigRegistry): ValidationError[] {
  const errors: ValidationError[] = [];

  console.log('   Validating page data paths and endpoints...');

  for (const [pageId, page] of registry.pages) {
    const dataSources = page.dataSources || {};

    // Check if dataSources URLs map to actual operations
    for (const [dsName, ds] of Object.entries(dataSources) as [string, any][]) {
      let url = ds.url || '';

      // Strip query parameters for validation
      const urlWithoutQuery = url.split('?')[0];

      // Strip /api prefix if present (api.ts client adds it automatically)
      // Standard format: /employees/:id
      // Also accept: /api/employees/:id (for backward compatibility)
      const normalizedUrl = urlWithoutQuery.startsWith('/api/')
        ? urlWithoutQuery.slice(4)
        : urlWithoutQuery;

      // Parse URL: /projects/:id/time-entries or /auth/me
      const match = normalizedUrl.match(/^\/([^/]+)(\/.*)?$/);
      if (!match) {
        errors.push({
          path: `page/${pageId}.dataSources.${dsName}`,
          message: `Invalid API URL format: '${url}'. Expected: /{resource}/{path} (without /api prefix)`,
        });
        continue;
      }

      const resource = match[1];
      const apiPath = match[2] || '';

      // Check if API resource exists
      if (!registry.apis.has(resource)) {
        errors.push({
          path: `page/${pageId}.dataSources.${dsName}`,
          message: `Data source references non-existent API resource '${resource}'. Available: ${[...registry.apis.keys()].join(', ')}`,
        });
        continue;
      }

      // Check if specific endpoint exists (GET by default)
      const api = registry.apis.get(resource);
      const basePath = api.basePath || `/api/${resource}`;
      const fullPath = basePath + apiPath;

      // Normalize path by removing trailing slash for comparison
      const normalizedFullPath = fullPath.replace(/\/$/, '');
      const operationKey = `GET ${normalizedFullPath}`;

      // Try both with and without trailing slash
      const operationKeyAlt = `GET ${normalizedFullPath}/`;

      if (!registry.apiOperations.has(operationKey) && !registry.apiOperations.has(operationKeyAlt)) {
        // Try to find similar operations
        const similarOps = [...registry.apiOperations.keys()].filter(k => k.includes(resource));
        errors.push({
          path: `page/${pageId}.dataSources.${dsName}`,
          message: `No GET operation found for '${fullPath}'. Available for ${resource}: ${similarOps.join(', ') || 'none'}`,
        });
      }
    }

    // Recursively check components for data path references
    function checkComponentPaths(children: any[], componentPath: string) {
      for (let i = 0; i < (children || []).length; i++) {
        const child = children[i];
        const childPath = `${componentPath}.children[${i}]`;

        // Check valuePath, dataPath, textPath, contentPath, labelPath
        const pathProps = ['valuePath', 'dataPath', 'textPath', 'contentPath', 'labelPath'];
        for (const prop of pathProps) {
          if (child.props?.[prop]) {
            const pathValue = child.props[prop];
            const rootKey = pathValue.split('.')[0];

            // Check if root key exists in dataSources
            if (!dataSources[rootKey]) {
              errors.push({
                path: `page/${pageId}${childPath}.props.${prop}`,
                message: `References non-existent data source '${rootKey}'. Available: ${Object.keys(dataSources).join(', ') || 'none'}. Path: ${pathValue}`,
              });
            }
          }
        }

        // Check form actions
        if (child.type === 'Form' && child.props?.action?.url) {
          const formUrl = child.props.action.url;
          const method = child.props.action.method || 'POST';

          const match = formUrl.match(/^\/api\/([^/]+)(\/.*)?$/);
          if (match) {
            const resource = match[1];
            const apiPath = match[2] || '';
            const api = registry.apis.get(resource);

            if (api) {
              const basePath = api.basePath || `/api/${resource}`;
              const fullPath = basePath + apiPath;

              // Normalize path by removing trailing slash
              const normalizedFullPath = fullPath.replace(/\/$/, '');
              const operationKey = `${method} ${normalizedFullPath}`;
              const operationKeyAlt = `${method} ${normalizedFullPath}/`;

              if (!registry.apiOperations.has(operationKey) && !registry.apiOperations.has(operationKeyAlt)) {
                const similarOps = [...registry.apiOperations.keys()].filter(k => k.includes(resource) && k.startsWith(method));
                errors.push({
                  path: `page/${pageId}${childPath}`,
                  message: `Form action ${method} '${fullPath}' not found. Available ${method} for ${resource}: ${similarOps.join(', ') || 'none'}`,
                });
              }
            }
          }
        }

        // Recurse
        if (child.children) {
          checkComponentPaths(child.children, childPath);
        }
      }
    }

    checkComponentPaths(page.children || [], '');
  }

  return errors;
}

// Validate template interpolation references
function validateTemplates(registry: ConfigRegistry): ValidationError[] {
  const errors: ValidationError[] = [];

  console.log('   Validating template interpolation...');

  for (const [pageId, page] of registry.pages) {
    const dataSources = page.dataSources || {};

    function checkTemplates(children: any[], componentPath: string) {
      for (let i = 0; i < (children || []).length; i++) {
        const child = children[i];
        const childPath = `${componentPath}.children[${i}]`;

        // Check text properties for {{templates}}
        const textProps = ['title', 'subtitle', 'text', 'content', 'message', 'label', 'template'];
        for (const prop of textProps) {
          const value = child.props?.[prop];
          if (typeof value === 'string' && value.includes('{{')) {
            const templates = value.match(/\{\{([^}]+)\}\}/g) || [];

            for (const template of templates) {
              const varPath = template.replace(/\{\{|\}\}/g, '').trim();
              const rootKey = varPath.split('.')[0];

              // Check if root references a data source
              if (!dataSources[rootKey] && !['params', 'query', 'user', 'body', 'response'].includes(rootKey)) {
                errors.push({
                  path: `page/${pageId}${childPath}.props.${prop}`,
                  message: `Template '${template}' references unknown data source '${rootKey}'. Available: ${Object.keys(dataSources).join(', ')}, params, query, user`,
                });
              }
            }
          }
        }

        // Check action URLs for templates
        if (child.props?.action?.to) {
          const to = child.props.action.to;
          if (typeof to === 'string' && to.includes('{{')) {
            const templates = to.match(/\{\{([^}]+)\}\}/g) || [];

            for (const template of templates) {
              const varPath = template.replace(/\{\{|\}\}/g, '').trim();

              // Check for common mistakes like {{response.data.id}} in navigation
              if (varPath.startsWith('response.')) {
                errors.push({
                  path: `page/${pageId}${childPath}.props.action.to`,
                  message: `Template '${template}' in navigation uses 'response' which is only available in form redirectTo, not button actions`,
                });
              }
            }
          }
        }

        // Check redirectTo for templates
        if (child.props?.action?.redirectTo) {
          const redirectTo = child.props.action.redirectTo;
          if (typeof redirectTo === 'string' && redirectTo.includes('{{')) {
            const templates = redirectTo.match(/\{\{([^}]+)\}\}/g) || [];

            for (const template of templates) {
              const varPath = template.replace(/\{\{|\}\}/g, '').trim();

              // response.data.* is valid in form redirectTo
              if (!varPath.startsWith('response.') && !varPath.startsWith('params.')) {
                errors.push({
                  path: `page/${pageId}${childPath}.props.action.redirectTo`,
                  message: `Template '${template}' should reference 'response.data.*' or 'params.*' in form redirectTo`,
                });
              }
            }
          }
        }

        // Recurse
        if (child.children) {
          checkTemplates(child.children, childPath);
        }
      }
    }

    checkTemplates(page.children || [], '');
  }

  return errors;
}

// Validate cross-references
function validateCrossReferences(registry: ConfigRegistry): ValidationError[] {
  const errors: ValidationError[] = [];

  console.log('\n🔗 Cross-Reference Validation\n');
  console.log(`   Schemas: ${registry.schemas.size}`);
  console.log(`   APIs: ${registry.apis.size}`);
  console.log(`   Pages: ${registry.pages.size}`);
  console.log(`   Apps: ${registry.apps ? 'loaded' : 'not found'}\n`);

  // Report page field mismatches (page field doesn't match file path)
  if (registry.pagePathMismatch.length > 0) {
    console.log('   ⚠️  Page naming inconsistencies:');
    for (const mismatch of registry.pagePathMismatch) {
      errors.push({
        path: mismatch.file,
        message: `Page field "${mismatch.pageField}" doesn't match expected "${mismatch.expectedId}". Update "page" field to match file path convention.`,
      });
      console.log(`      ${mismatch.file}: "${mismatch.pageField}" should be "${mismatch.expectedId}"`);
    }
    console.log('');
  }

  // 1. Validate APIs reference valid schemas/tables
  console.log('   Checking APIs → Schemas...');
  for (const [resource, api] of registry.apis) {
    const table = api.table;
    if (table && !registry.schemas.has(table)) {
      errors.push({
        path: `api/${resource}`,
        message: `API references non-existent table "${table}". Available: ${[...registry.schemas.keys()].join(', ') || 'none'}`,
      });
    }

    // Check if API fields match schema columns
    if (table && registry.schemas.has(table)) {
      const schema = registry.schemas.get(table);
      const schemaColumns = new Set((schema.columns || []).map((c: any) => c.name));

      // Check search fields
      const searchFields = api.operations?.list?.search?.fields || [];
      for (const field of searchFields) {
        if (!schemaColumns.has(field)) {
          errors.push({
            path: `api/${resource}`,
            message: `Search field "${field}" not in schema "${table}". Available: ${[...schemaColumns].join(', ')}`,
          });
        }
      }

      // Check required fields in create validation
      const requiredFields = api.operations?.create?.validation?.required || [];
      for (const field of requiredFields) {
        if (!schemaColumns.has(field)) {
          errors.push({
            path: `api/${resource}`,
            message: `Required field "${field}" not in schema "${table}". Available: ${[...schemaColumns].join(', ')}`,
          });
        }
      }
    }

    // Check workflow field references against schema
    const operations = api.operations || {};
    for (const [opName, opConfig] of Object.entries(operations) as [string, any][]) {
      // Skip custom operations array
      if (opName === 'custom') continue;

      const opTable = opConfig.table || table;
      if (!opTable || !registry.schemas.has(opTable)) continue;

      const schema = registry.schemas.get(opTable);
      const schemaColumns = new Set((schema.columns || []).map((c: any) => c.name));

      // Helper to extract field names from workflow steps
      function extractWorkflowFields(steps: any[]): Set<string> {
        const fields = new Set<string>();
        if (!steps || !Array.isArray(steps)) return fields;

        for (const step of steps) {
          // set_variable: { name: "body.fieldName", value: ... }
          if (step.type === 'set_variable' && step.set_variable?.name) {
            const match = step.set_variable.name.match(/^body\.([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (match) {
              // Use exact field name - workflow must match DB schema exactly
              fields.add(match[1]);
            }
          }

          // db_query: { data: { fieldName: ..., ... } }
          if (step.type === 'db_query' && step.db_query?.data) {
            for (const key of Object.keys(step.db_query.data)) {
              fields.add(key);
            }
          }

          // Recurse into conditional/foreach/while
          if (step.conditional?.then) {
            extractWorkflowFields(step.conditional.then).forEach(f => fields.add(f));
          }
          if (step.conditional?.else) {
            extractWorkflowFields(step.conditional.else).forEach(f => fields.add(f));
          }
          if (step.foreach?.steps) {
            extractWorkflowFields(step.foreach.steps).forEach(f => fields.add(f));
          }
          if (step.while?.steps) {
            extractWorkflowFields(step.while.steps).forEach(f => fields.add(f));
          }
        }
        return fields;
      }

      // Check beforeExecute workflow
      if (opConfig.beforeExecute?.steps) {
        const workflowFields = extractWorkflowFields(opConfig.beforeExecute.steps);
        for (const field of workflowFields) {
          if (!schemaColumns.has(field)) {
            errors.push({
              path: `api/${resource}.operations.${opName}.beforeExecute`,
              message: `Workflow sets field "body.${field}" which doesn't exist in schema "${opTable}". Schema fields: ${[...schemaColumns].join(', ')}. Either add to schema or this is a temporary workflow variable that will be filtered out.`,
            });
          }
        }
      }
    }
  }

  // 2. Validate Pages reference valid APIs
  console.log('   Checking Pages → APIs...');
  for (const [pageId, page] of registry.pages) {
    const dataSources = page.dataSources || {};
    for (const [dsName, ds] of Object.entries(dataSources) as [string, any][]) {
      const url = ds.url || '';
      // Extract resource from URL like /api/expenses or /api/expenses/:id
      const match = url.match(/\/api\/([^/:\s?]+)/);
      if (match) {
        const resource = match[1];
        if (!registry.apis.has(resource)) {
          errors.push({
            path: `page/${pageId}`,
            message: `Data source "${dsName}" references non-existent API "/api/${resource}". Available APIs: ${[...registry.apis.keys()].join(', ') || 'none'}`,
          });
        }
      }
    }

    // Check form actions
    function checkFormActions(children: any[], pagePath: string) {
      for (const child of children || []) {
        if (child.type === 'Form' && child.props?.action?.url) {
          const url = child.props.action.url;
          const match = url.match(/\/api\/([^/:\s?]+)/);
          if (match) {
            const resource = match[1];
            if (!registry.apis.has(resource)) {
              errors.push({
                path: pagePath,
                message: `Form action references non-existent API "/api/${resource}". Available: ${[...registry.apis.keys()].join(', ')}`,
              });
            }
          }
        }
        // Recurse into children
        if (child.children) {
          checkFormActions(child.children, pagePath);
        }
      }
    }
    checkFormActions(page.children || [], `page/${pageId}`);
  }

  // 3. Validate Apps reference valid pages (STRICT - no fuzzy matching)
  console.log('   Checking Apps → Pages...');
  if (registry.apps?.apps) {
    for (const app of registry.apps.apps) {
      // Check navigation items
      const categories = app.navigation?.categories || [];
      for (const category of categories) {
        for (const item of category.items || []) {
          const pageName = item.page;
          if (pageName && !registry.pages.has(pageName)) {
            // Check if a similar page exists with different naming convention
            const altFormats = [
              pageName.replace(/-/g, '/'),  // expenses-list -> expenses/list
              pageName.replace(/\//g, '-'), // expenses/list -> expenses-list
            ];
            const foundAlt = altFormats.find(f => registry.pages.has(f));
            if (foundAlt) {
              errors.push({
                path: `apps.json`,
                message: `Navigation "${item.title}" uses "${pageName}" but page is named "${foundAlt}". Update apps.json to use correct name.`,
              });
            } else {
              errors.push({
                path: `apps.json`,
                message: `Navigation "${item.title}" references non-existent page "${pageName}". Available: ${[...registry.pages.keys()].slice(0, 10).join(', ')}${registry.pages.size > 10 ? '...' : ''}`,
              });
            }
          }
        }
      }

      // Check routes
      for (const route of app.routes || []) {
        const pageName = route.page;
        if (pageName && !registry.pages.has(pageName)) {
          // Check if a similar page exists with different naming convention
          const altFormats = [
            pageName.replace(/-/g, '/'),
            pageName.replace(/\//g, '-'),
          ];
          const foundAlt = altFormats.find(f => registry.pages.has(f));
          if (foundAlt) {
            errors.push({
              path: `apps.json`,
              message: `Route "${route.path}" uses "${pageName}" but page is named "${foundAlt}". Update apps.json to use correct name.`,
            });
          } else {
            errors.push({
              path: `apps.json`,
              message: `Route "${route.path}" references non-existent page "${pageName}". Available: ${[...registry.pages.keys()].slice(0, 10).join(', ')}${registry.pages.size > 10 ? '...' : ''}`,
            });
          }
        }
      }
    }
  }

  return errors;
}

// Find and validate all config files
function validateAll(): void {
  const configDirs = [
    'config/api',
    'config/pages',
    'config/schema',
    'config'
  ];

  const files: string[] = [];

  // Recursively find all JSON files
  function findJsonFiles(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        findJsonFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.endsWith('-format.json')) {
        files.push(fullPath);
      }
    }
  }

  configDirs.forEach(dir => findJsonFiles(dir));

  console.log(`\n📋 Found ${files.length} config files to validate\n`);
  console.log('='.repeat(80));
  console.log('\n📄 Schema Validation\n');

  let validCount = 0;
  let invalidCount = 0;

  files.forEach(file => {
    if (validateFile(file)) {
      validCount++;
    } else {
      invalidCount++;
    }
  });

  console.log('\n' + '='.repeat(80));

  // Load config registry for advanced validation
  const registry = loadConfigRegistry();

  // Run all enhanced validations
  console.log('\n🔍 Enhanced Validation\n');

  const actionErrors = validateActionSchemas(registry);
  const schemaTypeErrors = validateSchemaTypes(registry);
  const sqlTypeCastErrors = validateSqlTypeCasts(registry);
  const dbErrors = validateDatabaseCompliance(registry);
  const pathErrors = validatePageDataPaths(registry);
  const templateErrors = validateTemplates(registry);
  const crossRefErrors = validateCrossReferences(registry);

  const allEnhancedErrors = [
    ...actionErrors,
    ...schemaTypeErrors,
    ...sqlTypeCastErrors,
    ...dbErrors,
    ...pathErrors,
    ...templateErrors,
    ...crossRefErrors,
  ];

  if (allEnhancedErrors.length > 0) {
    console.log(`\n❌ Enhanced validation errors (${allEnhancedErrors.length}):\n`);

    // Group errors by category
    if (actionErrors.length > 0) {
      console.log(`\n   🔧 Action Schema Errors (${actionErrors.length}):`);
      for (const error of actionErrors) {
        console.log(`      ${error.path}: ${error.message}`);
      }
    }

    if (schemaTypeErrors.length > 0) {
      console.log(`\n   🗂️  Schema Type Errors (${schemaTypeErrors.length}):`);
      for (const error of schemaTypeErrors) {
        console.log(`      ${error.path}: ${error.message}`);
      }
    }

    if (sqlTypeCastErrors.length > 0) {
      console.log(`\n   🔤 SQL Type Cast Errors (${sqlTypeCastErrors.length}):`);
      for (const error of sqlTypeCastErrors) {
        console.log(`      ${error.path}: ${error.message}`);
      }
    }

    if (dbErrors.length > 0) {
      console.log(`\n   💾 Database Compliance Errors (${dbErrors.length}):`);
      for (const error of dbErrors) {
        console.log(`      ${error.path}: ${error.message}`);
      }
    }

    if (pathErrors.length > 0) {
      console.log(`\n   🔗 Data Path Errors (${pathErrors.length}):`);
      for (const error of pathErrors) {
        console.log(`      ${error.path}: ${error.message}`);
      }
    }

    if (templateErrors.length > 0) {
      console.log(`\n   📝 Template Errors (${templateErrors.length}):`);
      for (const error of templateErrors) {
        console.log(`      ${error.path}: ${error.message}`);
      }
    }

    if (crossRefErrors.length > 0) {
      console.log(`\n   🔗 Cross-reference Errors (${crossRefErrors.length}):`);
      for (const error of crossRefErrors) {
        console.log(`      ${error.path}: ${error.message}`);
      }
    }
  } else {
    console.log('\n✅ All enhanced validations passed\n');
  }

  console.log('='.repeat(80));
  console.log(`\n📊 Validation Summary:`);
  console.log(`   ✅ Schema Valid: ${validCount}`);
  console.log(`   ❌ Schema Invalid: ${invalidCount}`);
  console.log(`   🔧 Action Errors: ${actionErrors.length}`);
  console.log(`   🗂️  Schema Type Errors: ${schemaTypeErrors.length}`);
  console.log(`   🔤 SQL Type Cast Errors: ${sqlTypeCastErrors.length}`);
  console.log(`   💾 Database Errors: ${dbErrors.length}`);
  console.log(`   🔗 Path Errors: ${pathErrors.length}`);
  console.log(`   📝 Template Errors: ${templateErrors.length}`);
  console.log(`   🔗 Cross-ref Errors: ${crossRefErrors.length}`);
  console.log(`   📁 Total Files: ${files.length}\n`);

  if (invalidCount > 0 || allEnhancedErrors.length > 0) {
    process.exit(1);
  }
}

// Main CLI
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx scripts/validate-config.ts <config-file>');
    console.error('       tsx scripts/validate-config.ts --all');
    process.exit(1);
  }

  if (args[0] === '--all') {
    validateAll();
  } else {
    const filePath = args[0];
    const isValid = validateFile(filePath);
    process.exit(isValid ? 0 : 1);
  }
}

// Run if executed directly (ES module check)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main();
}

export { validateFile, validateAll };
