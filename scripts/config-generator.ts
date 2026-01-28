/**
 * Unified Config Generator
 *
 * Generates all application configs from structured requirements.
 * This is the SINGLE METHOD for config generation across the framework.
 *
 * Input: Structured requirements (from your requirement generator)
 * Output: Complete config set (schema, API, UI, validation)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StructuredRequirements {
  version: string;
  domain: string;
  description?: string;
  entities: Entity[];
  workflows?: Workflow[];
  ui?: UIConfig;
}

export interface Entity {
  name: string;
  label: string;
  description?: string;
  fields: Field[];
  relationships?: Relationship[];
  displayField?: string; // Which field to use for display (default: 'name')
}

export interface Field {
  name: string;
  type: FieldType;
  label?: string;
  description?: string;
  required?: boolean;
  unique?: boolean;
  default?: any;
  reference?: string; // For type='reference'
  options?: string[]; // For type='enum'
  validation?: FieldValidation;
  autoUpdate?: boolean; // For timestamps
}

export type FieldType =
  | 'string'
  | 'text'      // Long text
  | 'number'
  | 'integer'
  | 'boolean'
  | 'timestamp'
  | 'date'
  | 'reference'
  | 'enum';

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: string;
}

export interface Relationship {
  type: 'hasMany' | 'belongsTo' | 'hasOne';
  entity: string;
  foreignKey: string;
}

export interface Workflow {
  name: string;
  description?: string;
  trigger: 'manual' | 'automatic' | 'scheduled';
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  action: string;
  entity?: string;
  rules?: string[];
}

export interface UIConfig {
  navigation?: NavigationSection[];
  dashboards?: Dashboard[];
}

export interface NavigationSection {
  section: string;
  items: string[];
}

export interface Dashboard {
  name: string;
  widgets: Widget[];
}

export interface Widget {
  type: 'metric' | 'chart' | 'table' | 'list';
  label: string;
  query?: string;
  entity?: string;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export interface GeneratedConfigs {
  schemas: Record<string, any>[];
  apis: Record<string, any>[];
  pages: Record<string, any>[];
  validation: Record<string, any>[];
  navigation: any;
}

export function generateAllConfigs(
  requirements: StructuredRequirements,
  outputDir: string = 'config'
): GeneratedConfigs {
  console.log('🚀 Starting unified config generation...');
  console.log(`📦 Domain: ${requirements.domain}`);
  console.log(`📊 Entities: ${requirements.entities.length}`);

  const configs: GeneratedConfigs = {
    schemas: [],
    apis: [],
    pages: [],
    validation: [],
    navigation: null
  };

  // Step 1: Generate database schemas
  console.log('\n📋 Generating database schemas...');
  configs.schemas = generateSchemas(requirements.entities);
  writeSchemas(configs.schemas, path.join(outputDir, 'schema'));

  // Step 2: Generate API configs
  console.log('\n🔌 Generating API configs...');
  configs.apis = generateAPIs(requirements.entities);
  writeAPIs(configs.apis, path.join(outputDir, 'apis'));

  // Step 3: Generate UI pages
  console.log('\n🎨 Generating UI pages...');
  configs.pages = generatePages(requirements.entities);
  writePages(configs.pages, path.join(outputDir, 'pages'));

  // Step 4: Generate validation rules
  console.log('\n✅ Generating validation rules...');
  configs.validation = generateValidation(requirements.entities);
  writeValidation(configs.validation, path.join(outputDir, 'validation'));

  // Step 5: Generate navigation
  console.log('\n🧭 Generating navigation...');
  configs.navigation = generateNavigation(requirements);
  writeNavigation(configs.navigation, path.join(outputDir, 'navigation.json'));

  console.log('\n✅ Config generation complete!');
  console.log(`📁 Output directory: ${outputDir}`);

  return configs;
}

// ============================================================================
// SCHEMA GENERATION
// ============================================================================

function generateSchemas(entities: Entity[]): Record<string, any>[] {
  return entities.map(entity => {
    const schema = {
      $schema: '../schema-format.json',
      table: entity.name,
      description: entity.description || `${entity.label} table`,
      columns: [
        // Always add ID field
        {
          name: 'id',
          type: 'text',
          primaryKey: true,
          defaultFn: 'uuid',
          description: `Unique ${entity.label.toLowerCase()} identifier`
        },
        // Convert entity fields to schema columns
        ...entity.fields.map(field => fieldToColumn(field, entity)),
        // Always add timestamps
        {
          name: 'createdAt',
          type: 'text',
          default: 'CURRENT_TIMESTAMP',
          description: 'Record creation timestamp'
        },
        {
          name: 'updatedAt',
          type: 'text',
          default: 'CURRENT_TIMESTAMP',
          description: 'Record last update timestamp'
        }
      ]
    };

    console.log(`  ✓ ${entity.name} (${entity.fields.length} fields)`);
    return schema;
  });
}

function fieldToColumn(field: Field, entity: Entity): any {
  const column: any = {
    name: field.name,
    description: field.description || field.label
  };

  // Map field type to column type
  switch (field.type) {
    case 'string':
      column.type = 'text';
      break;

    case 'text':
      column.type = 'text';
      break;

    case 'integer':
      column.type = 'integer';
      break;

    case 'number':
      column.type = 'real';
      break;

    case 'boolean':
      column.type = 'integer';
      column.default = 0;
      break;

    case 'timestamp':
    case 'date':
      column.type = 'text';
      if (field.autoUpdate) {
        column.default = 'CURRENT_TIMESTAMP';
      }
      break;

    case 'reference':
      column.type = 'text';
      if (field.reference) {
        column.references = {
          table: field.reference,
          column: 'id'
        };
      }
      break;

    case 'enum':
      column.type = 'text';
      if (field.options) {
        column.enum = field.options;
      }
      break;
  }

  // Add constraints
  if (field.required) {
    column.notNull = true;
  }

  if (field.unique) {
    column.unique = true;
  }

  if (field.default !== undefined && field.type !== 'boolean') {
    column.default = field.default;
  }

  return column;
}

// ============================================================================
// API GENERATION
// ============================================================================

function generateAPIs(entities: Entity[]): Record<string, any>[] {
  return entities.map(entity => {
    const displayField = entity.displayField || 'name';

    // Identify searchable fields (text fields)
    const searchableFields = entity.fields
      .filter(f => f.type === 'string' || f.type === 'text')
      .map(f => f.name)
      .slice(0, 3); // Limit to 3 search fields

    // Identify filterable fields (enums, references, booleans)
    const filterableFields = entity.fields
      .filter(f => f.type === 'enum' || f.type === 'reference' || f.type === 'boolean')
      .map(f => f.name);

    const apiConfig = {
      entity: entity.name,
      label: entity.label,
      description: entity.description,
      endpoints: [
        {
          path: `/api/${entity.name}`,
          method: 'GET',
          action: 'list',
          description: `List all ${entity.label.toLowerCase()}`,
          features: {
            pagination: true,
            search: searchableFields.length > 0 ? searchableFields : undefined,
            filters: filterableFields.length > 0 ? filterableFields : undefined,
            sort: true
          }
        },
        {
          path: `/api/${entity.name}/:id`,
          method: 'GET',
          action: 'get',
          description: `Get ${entity.label.toLowerCase()} by ID`
        },
        {
          path: `/api/${entity.name}`,
          method: 'POST',
          action: 'create',
          description: `Create new ${entity.label.toLowerCase()}`,
          validation: 'auto'
        },
        {
          path: `/api/${entity.name}/:id`,
          method: 'PUT',
          action: 'update',
          description: `Update ${entity.label.toLowerCase()}`,
          validation: 'auto'
        },
        {
          path: `/api/${entity.name}/:id`,
          method: 'DELETE',
          action: 'delete',
          description: `Delete ${entity.label.toLowerCase()}`
        }
      ]
    };

    console.log(`  ✓ ${entity.name} (${apiConfig.endpoints.length} endpoints)`);
    return apiConfig;
  });
}

// ============================================================================
// UI PAGE GENERATION
// ============================================================================

function generatePages(entities: Entity[]): Record<string, any>[] {
  const pages: Record<string, any>[] = [];

  entities.forEach(entity => {
    const displayField = entity.displayField || 'name';

    // Generate list page
    const listPage = generateListPage(entity);
    pages.push(listPage);

    // Generate form page (create/edit)
    const formPage = generateFormPage(entity);
    pages.push(formPage);

    // Generate detail page
    const detailPage = generateDetailPage(entity);
    pages.push(detailPage);

    console.log(`  ✓ ${entity.name} (list, form, detail)`);
  });

  return pages;
}

function generateListPage(entity: Entity): any {
  // Select key fields for list view (max 5 columns)
  const listFields = entity.fields
    .filter(f => !['text', 'blob'].includes(f.type)) // Exclude long text
    .slice(0, 5);

  const columns = listFields.map(field => ({
    field: field.name,
    label: field.label || formatLabel(field.name),
    sortable: true,
    format: getFieldFormat(field)
  }));

  // Add filters for enum and reference fields
  const filters = entity.fields
    .filter(f => f.type === 'enum' || f.type === 'reference')
    .map(field => ({
      field: field.name,
      type: field.type === 'enum' ? 'select' : 'reference',
      label: field.label || formatLabel(field.name),
      options: field.type === 'enum' ? field.options : undefined,
      source: field.type === 'reference' ? `/api/${field.reference}` : undefined
    }));

  return {
    id: `${entity.name}-list`,
    path: `/${entity.name}`,
    title: entity.label,
    type: 'list',
    entity: entity.name,
    api: `/api/${entity.name}`,
    columns,
    filters: filters.length > 0 ? filters : undefined,
    actions: [
      {
        label: `Add ${entity.label}`,
        action: 'navigate',
        path: `/${entity.name}/new`,
        icon: 'plus',
        primary: true
      },
      {
        label: 'Edit',
        action: 'navigate',
        path: `/${entity.name}/:id/edit`,
        icon: 'edit',
        scope: 'row'
      },
      {
        label: 'Delete',
        action: 'delete',
        icon: 'trash',
        scope: 'row',
        confirm: true,
        confirmMessage: `Are you sure you want to delete this ${entity.label.toLowerCase()}?`
      }
    ]
  };
}

function generateFormPage(entity: Entity): any {
  // Group fields into sections
  const sections = [{
    title: 'Details',
    fields: entity.fields.map(field => ({
      name: field.name,
      type: getInputType(field),
      label: field.label || formatLabel(field.name),
      required: field.required,
      placeholder: field.description,
      validation: field.validation,
      options: field.options,
      source: field.type === 'reference' ? `/api/${field.reference}` : undefined,
      default: field.default
    }))
  }];

  return {
    id: `${entity.name}-form`,
    path: `/${entity.name}/:id?/(new|edit)`,
    title: entity.label,
    type: 'form',
    entity: entity.name,
    api: `/api/${entity.name}`,
    sections,
    actions: [
      {
        label: 'Save',
        action: 'submit',
        variant: 'primary'
      },
      {
        label: 'Cancel',
        action: 'navigate',
        path: `/${entity.name}`,
        variant: 'secondary'
      }
    ]
  };
}

function generateDetailPage(entity: Entity): any {
  const fields = entity.fields.map(field => ({
    name: field.name,
    label: field.label || formatLabel(field.name),
    format: getFieldFormat(field)
  }));

  return {
    id: `${entity.name}-detail`,
    path: `/${entity.name}/:id`,
    title: entity.label,
    type: 'detail',
    entity: entity.name,
    api: `/api/${entity.name}/:id`,
    fields,
    actions: [
      {
        label: 'Edit',
        action: 'navigate',
        path: `/${entity.name}/:id/edit`,
        icon: 'edit',
        variant: 'primary'
      },
      {
        label: 'Delete',
        action: 'delete',
        icon: 'trash',
        variant: 'danger',
        confirm: true
      },
      {
        label: 'Back to List',
        action: 'navigate',
        path: `/${entity.name}`,
        variant: 'secondary'
      }
    ]
  };
}

// ============================================================================
// VALIDATION GENERATION
// ============================================================================

function generateValidation(entities: Entity[]): Record<string, any>[] {
  return entities.map(entity => {
    const rules = entity.fields.map(field => {
      const rule: any = {
        field: field.name,
        type: field.type,
        required: field.required || false
      };

      if (field.unique) {
        rule.unique = true;
      }

      if (field.validation) {
        Object.assign(rule, field.validation);
      }

      // Add type-specific validation
      if (field.type === 'enum' && field.options) {
        rule.enum = field.options;
      }

      if (field.type === 'reference' && field.reference) {
        rule.exists = {
          table: field.reference,
          column: 'id'
        };
      }

      return rule;
    });

    console.log(`  ✓ ${entity.name} (${rules.length} rules)`);

    return {
      entity: entity.name,
      label: entity.label,
      rules
    };
  });
}

// ============================================================================
// NAVIGATION GENERATION
// ============================================================================

function generateNavigation(requirements: StructuredRequirements): any {
  // Use UI config if provided, otherwise auto-generate
  if (requirements.ui?.navigation) {
    return {
      sections: requirements.ui.navigation.map(section => ({
        label: section.section,
        items: section.items.map(entityName => {
          const entity = requirements.entities.find(e => e.name === entityName);
          return {
            label: entity?.label || formatLabel(entityName),
            path: `/${entityName}`,
            icon: getEntityIcon(entityName)
          };
        })
      }))
    };
  }

  // Auto-generate: one section with all entities
  return {
    sections: [
      {
        label: requirements.domain.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        items: requirements.entities.map(entity => ({
          label: entity.label,
          path: `/${entity.name}`,
          icon: getEntityIcon(entity.name)
        }))
      }
    ]
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function getFieldFormat(field: Field): string | undefined {
  switch (field.type) {
    case 'timestamp':
    case 'date':
      return 'datetime';
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'enum':
      return 'badge';
    case 'reference':
      return 'reference';
    default:
      return undefined;
  }
}

function getInputType(field: Field): string {
  switch (field.type) {
    case 'text':
      return 'textarea';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'checkbox';
    case 'timestamp':
    case 'date':
      return 'datetime';
    case 'enum':
      return 'select';
    case 'reference':
      return 'select';
    default:
      return 'text';
  }
}

function getEntityIcon(entityName: string): string {
  // Simple icon mapping based on entity name
  const iconMap: Record<string, string> = {
    users: 'user',
    employees: 'users',
    departments: 'building',
    products: 'package',
    categories: 'tag',
    warehouses: 'warehouse',
    stock: 'inventory',
    orders: 'shopping-cart',
    customers: 'user-group',
    invoices: 'receipt',
    reports: 'chart-bar'
  };

  return iconMap[entityName] || 'folder';
}

// ============================================================================
// FILE WRITERS
// ============================================================================

function writeSchemas(schemas: Record<string, any>[], outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  schemas.forEach(schema => {
    const filename = path.join(outputDir, `${schema.table}.json`);
    fs.writeFileSync(filename, JSON.stringify(schema, null, 2));
  });

  console.log(`  📁 Written ${schemas.length} schema files to ${outputDir}`);
}

function writeAPIs(apis: Record<string, any>[], outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  apis.forEach(api => {
    const filename = path.join(outputDir, `${api.entity}.json`);
    fs.writeFileSync(filename, JSON.stringify(api, null, 2));
  });

  console.log(`  📁 Written ${apis.length} API files to ${outputDir}`);
}

function writePages(pages: Record<string, any>[], outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  pages.forEach(page => {
    const filename = path.join(outputDir, `${page.id}.json`);
    fs.writeFileSync(filename, JSON.stringify(page, null, 2));
  });

  console.log(`  📁 Written ${pages.length} page files to ${outputDir}`);
}

function writeValidation(validation: Record<string, any>[], outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  validation.forEach(val => {
    const filename = path.join(outputDir, `${val.entity}.json`);
    fs.writeFileSync(filename, JSON.stringify(val, null, 2));
  });

  console.log(`  📁 Written ${validation.length} validation files to ${outputDir}`);
}

function writeNavigation(navigation: any, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(navigation, null, 2));
  console.log(`  📁 Written navigation to ${outputPath}`);
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx scripts/config-generator.ts <requirements-file.json> [output-dir]');
    process.exit(1);
  }

  const requirementsFile = args[0];
  const outputDir = args[1] || 'config';

  if (!fs.existsSync(requirementsFile)) {
    console.error(`Error: Requirements file not found: ${requirementsFile}`);
    process.exit(1);
  }

  const requirements = JSON.parse(fs.readFileSync(requirementsFile, 'utf-8'));
  generateAllConfigs(requirements, outputDir);
}
