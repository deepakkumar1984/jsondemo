# Config-Driven Database Schema Guide

This guide explains how to use the config-driven database schema system that allows you to define your database schema using JSON configuration files instead of TypeScript code.

## Overview

The config-driven schema system provides:

- **JSON-based schema definitions** - Define tables and columns in simple JSON files
- **Automatic TypeScript generation** - Generate Drizzle ORM schema from JSON configs
- **Schema diffing** - Compare schema versions to see what changed
- **Migration hints** - Get SQL migration suggestions based on schema changes
- **Bootstrap existing schemas** - Export current TypeScript schema to JSON format

## Architecture

```
config/schema/           # JSON schema definitions (source of truth)
  ├── users.json
  ├── departments.json
  └── employees.json

scripts/schema/          # Build-time schema tools
  ├── generator.ts       # Converts JSON → TypeScript
  ├── exporter.ts        # Converts TypeScript → JSON
  ├── differ.ts          # Compares schemas
  └── cli.ts             # CLI wrapper

src/db/
  ├── schema.ts          # Original TypeScript schema (legacy)
  └── schema.generated.ts # Generated from JSON configs (gitignored)

src/api/engine/
  └── schema-loader.ts   # Loads schema at runtime
```

## Quick Start

### 1. Initialize Config-Driven Schema

If you're starting with an existing TypeScript schema:

```bash
npm run schema:init
```

This will:
1. Export your current TypeScript schema to `config/schema/*.json`
2. Generate `src/db/schema.generated.ts` from the JSON configs

### 2. Enable Config-Driven Schema

Update `config/apps.json` to use the generated schema:

```json
{
  "apps": [
    {
      "id": "hrm",
      "schemaSource": "config/schema",
      ...
    }
  ]
}
```

### 3. Make Schema Changes

Edit the JSON files in `config/schema/`. For example, add a new column to `employees.json`:

```json
{
  "table": "employees",
  "columns": [
    ...
    {
      "name": "linkedinUrl",
      "type": "text",
      "description": "Employee LinkedIn profile"
    }
  ]
}
```

### 4. Regenerate Schema

```bash
npm run schema:generate
```

This creates/updates `src/db/schema.generated.ts` with your changes.

### 5. Generate and Apply Migrations

```bash
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations to database
```

## JSON Schema Format

### Basic Table Definition

```json
{
  "$schema": "../schema-format.json",
  "table": "departments",
  "description": "Organizational departments",
  "columns": [
    {
      "name": "id",
      "type": "text",
      "primaryKey": true,
      "defaultFn": "uuid"
    },
    {
      "name": "name",
      "type": "text",
      "notNull": true
    },
    {
      "name": "active",
      "type": "integer",
      "default": 1
    }
  ]
}
```

### Column Types

Supported SQLite column types:
- `text` - Text strings
- `integer` - Integers
- `real` - Floating point numbers
- `blob` - Binary data

### Column Modifiers

```json
{
  "name": "email",
  "type": "text",
  "primaryKey": true,      // PRIMARY KEY
  "notNull": true,          // NOT NULL
  "unique": true,           // UNIQUE
  "default": "active",      // Default value
  "defaultFn": "uuid"       // Default function (uuid = crypto.randomUUID())
}
```

### Enum Columns

```json
{
  "name": "status",
  "type": "text",
  "enum": ["active", "inactive", "pending"],
  "default": "active"
}
```

### Foreign Keys

```json
{
  "name": "departmentId",
  "type": "text",
  "references": {
    "table": "departments",
    "column": "id"
  }
}
```

### Self-Referencing Foreign Keys

```json
{
  "name": "managerId",
  "type": "text",
  "references": {
    "table": "employees",  // Same table
    "column": "id"
  }
}
```

### Timestamps

```json
{
  "name": "createdAt",
  "type": "text",
  "default": "CURRENT_TIMESTAMP"
}
```

## Available Commands

### `npm run schema:export`

Export current TypeScript schema to JSON configs.

```bash
npm run schema:export [outputDir]
```

Default output: `config/schema/`

### `npm run schema:generate`

Generate Drizzle TypeScript schema from JSON configs.

```bash
npm run schema:generate [schemaDir] [outputFile]
```

Defaults:
- Input: `config/schema/`
- Output: `src/db/schema.generated.ts`

### `npm run schema:diff`

Compare two schema directories and show changes.

```bash
npm run schema:diff [oldDir] [newDir]
```

Defaults:
- Old: `config/schema.backup/`
- New: `config/schema/`

Example output:

```
================================================================================
SCHEMA DIFF REPORT
================================================================================

📦 TABLES ADDED (1):
--------------------------------------------------------------------------------
  + projects

🔧 TABLES MODIFIED (1):
--------------------------------------------------------------------------------

  Table: employees
    Columns Added:
      + linkedinUrl (text)
      + githubUrl (text)
```

### `npm run schema:init`

Bootstrap the config-driven schema system.

```bash
npm run schema:init
```

This command:
1. Exports current schema to JSON
2. Generates TypeScript from JSON
3. Provides next steps

## Workflow Examples

### Adding a New Table

1. Create `config/schema/projects.json`:

```json
{
  "$schema": "../schema-format.json",
  "table": "projects",
  "description": "Company projects",
  "columns": [
    {
      "name": "id",
      "type": "text",
      "primaryKey": true,
      "defaultFn": "uuid"
    },
    {
      "name": "name",
      "type": "text",
      "notNull": true
    },
    {
      "name": "description",
      "type": "text"
    },
    {
      "name": "status",
      "type": "text",
      "enum": ["planning", "active", "completed", "cancelled"],
      "default": "planning"
    },
    {
      "name": "createdAt",
      "type": "text",
      "default": "CURRENT_TIMESTAMP"
    }
  ]
}
```

2. Regenerate schema:

```bash
npm run schema:generate
```

3. Generate migration:

```bash
npm run db:generate
```

4. Apply migration:

```bash
npm run db:migrate
```

### Modifying an Existing Table

1. Edit `config/schema/employees.json` to add columns:

```json
{
  "columns": [
    ...existing columns...
    {
      "name": "linkedinUrl",
      "type": "text"
    },
    {
      "name": "skills",
      "type": "text",
      "description": "Comma-separated skills"
    }
  ]
}
```

2. Regenerate and migrate:

```bash
npm run schema:generate
npm run db:generate
npm run db:migrate
```

### Comparing Schema Changes

Before making changes, backup your current schema:

```bash
cp -r config/schema config/schema.backup
```

After making changes, compare:

```bash
npm run schema:diff
```

This shows exactly what changed and provides migration hints.

## Best Practices

### 1. Always Use Version Control

Commit your JSON schema files to git:

```bash
git add config/schema/
git commit -m "Add linkedinUrl column to employees"
```

### 2. Test Migrations Locally First

Always test migrations on local database before production:

```bash
npm run db:migrate  # Test locally
```

### 3. Review Generated Schema

After running `schema:generate`, review the generated TypeScript:

```bash
cat src/db/schema.generated.ts
```

### 4. Use Descriptive Names

Add descriptions to tables and complex columns:

```json
{
  "name": "effectiveDate",
  "type": "text",
  "description": "Date when this salary structure becomes active"
}
```

### 5. Keep JSON Configs Simple

Don't add complex logic to JSON. For advanced Drizzle features, use TypeScript schema directly.

## Integration with Existing System

### Schema Loading Priority

1. If `schemaSource: "config/schema"` in `apps.json` → Use generated schema
2. Otherwise → Use default TypeScript schema

### Switching Between Modes

**Use config-driven schema:**

```json
{
  "apps": [{
    "id": "hrm",
    "schemaSource": "config/schema"
  }]
}
```

**Use TypeScript schema:**

```json
{
  "apps": [{
    "id": "hrm",
    "schemaSource": "db/schema.ts"
  }]
}
```

Or simply omit `schemaSource` to use default.

## Troubleshooting

### Generated Schema Not Found

**Error:** "Generated schema not found. Run `npm run schema:generate`"

**Solution:**

```bash
npm run schema:generate
```

### Table Dependencies

If you get errors about undefined tables, ensure tables are defined before they're referenced. The generator automatically sorts tables by dependencies, but circular references may cause issues.

### Migration Conflicts

If Drizzle migrations conflict:

1. Check `src/db/migrations/` for existing migrations
2. Delete conflicting migration files
3. Regenerate migrations: `npm run db:generate`

## Advanced Usage

### Custom Schema Locations

Generate schema to a custom location:

```bash
npm run schema:generate config/custom-schema src/db/custom.generated.ts
```

### Export Subset of Tables

Edit `scripts/schema/exporter.ts` to customize which tables to export.

### Add Custom Validation

Edit `scripts/schema/generator.ts` to add custom validations or transformations.

## Limitations

Current limitations of the config-driven schema:

1. **No Indexes** - Index definitions not yet supported in JSON
2. **Limited Constraints** - Only basic foreign keys supported
3. **No Triggers** - SQL triggers must be defined separately
4. **No Views** - Database views not supported

For advanced features, use TypeScript schema directly.

## Future Enhancements

Planned features:

- [ ] Index definitions in JSON
- [ ] Composite primary keys
- [ ] Check constraints
- [ ] Automatic migration generation
- [ ] Schema validation on startup
- [ ] Multi-database support (PostgreSQL, MySQL)

## Support

For issues or questions:

1. Check this documentation
2. Review `config/schema-format.json` for JSON schema spec
3. Examine generated code in `src/db/schema.generated.ts`
4. Review schema generator code in `scripts/schema/generator.ts`
