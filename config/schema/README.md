# Database Schema Configuration

This directory contains JSON-based database schema definitions that serve as the source of truth for the application's database structure.

## What is This?

Instead of defining your database schema in TypeScript code, you can now define it using simple JSON configuration files. The system automatically generates Drizzle ORM TypeScript code from these JSON configs.

## Quick Start

### View Current Schema

All database tables are defined as JSON files in this directory:

```bash
ls config/schema/
# Output:
# users.json
# departments.json
# employees.json
# ...
```

### Make Schema Changes

1. Edit any JSON file to modify a table (e.g., `employees.json`)
2. Run `npm run schema:generate` to regenerate TypeScript
3. Run `npm run db:generate` to create migrations
4. Run `npm run db:migrate` to apply changes

### Add a New Table

1. Create a new JSON file: `config/schema/my_table.json`
2. Define the table structure (see examples below)
3. Run `npm run schema:generate`
4. Run `npm run db:generate && npm run db:migrate`

## JSON Schema Format

### Basic Example

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
      "defaultFn": "uuid",
      "description": "Unique project identifier"
    },
    {
      "name": "name",
      "type": "text",
      "notNull": true
    },
    {
      "name": "status",
      "type": "text",
      "enum": ["active", "completed", "cancelled"],
      "default": "active"
    },
    {
      "name": "departmentId",
      "type": "text",
      "references": {
        "table": "departments",
        "column": "id"
      }
    },
    {
      "name": "createdAt",
      "type": "text",
      "default": "CURRENT_TIMESTAMP"
    }
  ]
}
```

### Column Types

- `text` - Text strings
- `integer` - Integers
- `real` - Floating point numbers
- `blob` - Binary data

### Column Options

```json
{
  "name": "email",
  "type": "text",
  "primaryKey": true,     // PRIMARY KEY
  "notNull": true,        // NOT NULL constraint
  "unique": true,         // UNIQUE constraint
  "default": "value",     // Default value
  "defaultFn": "uuid",    // Default function (uuid = crypto.randomUUID())
  "enum": ["a", "b"],     // Enum values
  "references": {         // Foreign key
    "table": "users",
    "column": "id"
  },
  "description": "User email address"
}
```

## Available Commands

```bash
# Export current TypeScript schema to JSON
npm run schema:export

# Generate TypeScript from JSON configs
npm run schema:generate

# Compare two schema versions
npm run schema:diff

# Initialize schema system (export + generate)
npm run schema:init
```

## Workflow

### Daily Development

1. Edit JSON files in `config/schema/`
2. Run `npm run schema:generate`
3. Run `npm run db:generate` (create migration)
4. Run `npm run db:migrate` (apply migration)

### Adding a Column

Edit the table's JSON file:

```json
{
  "table": "employees",
  "columns": [
    ...existing columns...,
    {
      "name": "linkedinUrl",
      "type": "text",
      "description": "Employee LinkedIn profile URL"
    }
  ]
}
```

Then regenerate and migrate:

```bash
npm run schema:generate
npm run db:generate
npm run db:migrate
```

### Removing a Column

Remove the column from the JSON file, then regenerate and migrate.

### Changing a Column

Modify the column definition in JSON, then regenerate and migrate.

**Note:** Some changes (like changing column type) may require manual migration editing.

## File Organization

Current schema files:

- `users.json` - User accounts and authentication
- `departments.json` - Organizational departments
- `positions.json` - Job positions
- `employees.json` - Employee records
- `employee_documents.json` - Employee document uploads
- `salary_structures.json` - Salary structure templates
- `pay_components.json` - Pay components (earnings/deductions)
- `employee_salaries.json` - Employee salary assignments
- `payroll_runs.json` - Payroll processing runs
- `payslips.json` - Individual payslips
- `job_postings.json` - Job recruitment postings
- `applicants.json` - Job applicants
- `performance_reviews.json` - Performance reviews
- `leave_types.json` - Leave type definitions
- `leave_balances.json` - Employee leave balances
- `leave_requests.json` - Leave requests
- `attendance.json` - Attendance records

## Generated Files

The schema generator creates:

- `src/db/schema.generated.ts` - Generated Drizzle schema

**Do not edit `schema.generated.ts` directly** - your changes will be overwritten. Edit JSON files instead.

## Schema Format Reference

See `config/schema-format.json` for the complete JSON schema specification.

## Documentation

Full documentation: `docs/schema-config-guide.md`

## Tips

1. **Always backup before major changes:**
   ```bash
   cp -r config/schema config/schema.backup
   ```

2. **Use descriptive column names:**
   - Good: `dateOfJoining`, `employmentType`
   - Bad: `doj`, `type`

3. **Add descriptions for clarity:**
   ```json
   {
     "name": "effectiveFrom",
     "description": "Date when this salary structure becomes active"
   }
   ```

4. **Test locally first:**
   - Always run migrations on local database before production
   - Use `npm run schema:diff` to review changes

5. **Commit JSON configs to git:**
   - These files are your source of truth
   - Include them in version control

## Troubleshooting

**"Generated schema not found"**
- Run: `npm run schema:generate`

**Type errors after schema change**
- Restart TypeScript server
- Run: `npm run typecheck`

**Migration conflicts**
- Check `src/db/migrations/` for conflicting migrations
- May need to manually edit or delete conflicting files

## Support

For issues or questions:

1. See full documentation in `docs/schema-config-guide.md`
2. Check `config/schema-format.json` for JSON schema spec
3. Review generated code in `src/db/schema.generated.ts`
4. Review schema tools in `scripts/schema/`
