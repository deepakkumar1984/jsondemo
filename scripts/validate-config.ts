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
  console.log(`\n📊 Validation Summary:`);
  console.log(`   ✅ Valid: ${validCount}`);
  console.log(`   ❌ Invalid: ${invalidCount}`);
  console.log(`   📁 Total: ${files.length}\n`);

  if (invalidCount > 0) {
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
