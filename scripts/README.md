# Build Scripts

This directory contains build-time tools and utilities for the project.

## Schema Tools (`scripts/schema/`)

Tools for managing the config-driven database schema system:

- **`generator.ts`** - Converts JSON schema configs to Drizzle TypeScript
- **`exporter.ts`** - Exports TypeScript schema to JSON format
- **`differ.ts`** - Compares schema versions and generates migration hints
- **`cli.ts`** - CLI wrapper for all schema commands

### Usage

```bash
# Export TypeScript schema to JSON
npm run schema:export

# Generate TypeScript from JSON configs
npm run schema:generate

# Compare schema versions
npm run schema:diff

# Initialize schema system
npm run schema:init
```

### How It Works

1. **JSON configs** in `config/schema/*.json` define database tables
2. **Generator** reads JSON and generates `src/db/schema.generated.ts`
3. **Exporter** reads existing TypeScript schema and creates JSON configs
4. **Differ** compares two sets of JSON configs and shows changes

### Adding New Tools

When adding new build scripts:

1. Create TypeScript files in appropriate subdirectories
2. Add npm scripts to `package.json`
3. Document them in this README
4. Use TSX for TypeScript execution: `tsx scripts/your-tool.ts`

## File Organization

```
scripts/
├── README.md           # This file
└── schema/             # Database schema management tools
    ├── generator.ts    # JSON → TypeScript
    ├── exporter.ts     # TypeScript → JSON
    ├── differ.ts       # Schema comparison
    └── cli.ts          # CLI wrapper
```

## Running Scripts

All scripts are executed using TSX (TypeScript Execute):

```bash
# Via npm scripts (recommended)
npm run schema:generate

# Direct execution
tsx scripts/schema/generator.ts
```

## Dependencies

- **tsx** - TypeScript execution (installed as devDependency)
- **Node.js** built-in modules (fs, path, etc.)

## Documentation

See `docs/schema-config-guide.md` for comprehensive schema system documentation.
