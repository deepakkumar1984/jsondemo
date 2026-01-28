# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **100% config-driven application framework** built on Cloudflare Workers, D1 database, and React. The core principle: **everything is controlled by JSON configs - zero hardcoded routes, schemas, or pages**. Users describe what they want in natural language, AI generates the configs, and the app adapts automatically.

## Critical Architecture Principles

### 1. Config-Driven Everything

**NEVER hardcode table names, routes, or component references.** The system uses dynamic discovery:

- **Database Schema**: JSON configs in `config/schema/` → TypeScript via `npm run schema:generate` → `src/db/schema.ts`
- **API Endpoints**: JSON configs in `config/api/` → Auto-discovered at build time → `src/api/configs.generated.ts`
- **UI Pages**: JSON configs in `config/pages/` → Bundled by Vite → Lazy-loaded at runtime
- **Navigation**: JSON config in `config/apps.json` → Rendered dynamically

### 2. Dual Build System

This project has TWO separate build pipelines that must stay in sync:

**Client (Vite):**
- Entry: `src/client/index.html`
- Output: `dist/client/`
- Bundles: React app + page configs (JSON → JavaScript)
- Command: `npm run build:client`

**Worker (esbuild via Wrangler):**
- Entry: `src/worker.ts`
- Output: `.wrangler/` (ephemeral)
- Bundles: Hono API + Cloudflare Worker runtime
- Command: `wrangler dev` or `wrangler deploy`

**IMPORTANT:**
- Client config changes require `npm run build:client`
- API config changes require restarting `npm run dev` (build-api-index runs automatically)
- Schema changes require `npm run schema:generate` then `npm run db:generate`

### 3. Dynamic Schema Registry

The schema registry (`src/api/engine/schema-registry.ts`) **automatically discovers all tables** from `src/db/schema.ts`. When you add a new table:

```typescript
// ✅ CORRECT: Dynamic discovery
export const schemaRegistry: Record<string, any> = {};
for (const [key, value] of Object.entries(schema)) {
  if (value && typeof value === 'object' && '_' in value) {
    schemaRegistry[key] = value;
  }
}

// ❌ WRONG: Hardcoded references
export const schemaRegistry = {
  users: schema.users,
  tasks: schema.tasks,
  // Don't do this!
};
```

Same pattern applies to `src/api/engine/schema-loader.ts` and custom handlers.

## Development Workflow

### Starting Development

```bash
npm run dev              # Starts both client dev server (Vite proxy) and Worker
```

This runs `scripts/build-api-index.ts` automatically before starting Wrangler, ensuring API configs are bundled.

### Adding New Features

**New Database Table:**
```bash
# 1. Create config/schema/new-table.json (see config/schema-format.json)
# 2. Generate TypeScript schema
npm run schema:generate
# 3. Generate migration
npm run db:generate
# 4. Apply migration
npm run db:migrate
```

**New API Endpoint:**
```bash
# 1. Create config/api/new-resource.json (see config/api-format.json)
# 2. Restart dev server (build-api-index runs automatically)
npm run dev
```

**New UI Page:**
```bash
# 1. Create config/pages/entity/page-name.json (see config/page-format.json)
# 2. Rebuild client
npm run build:client
# 3. Add route to config/apps.json navigation
```

### Using AI to Generate Configs

```bash
# 1. Start AI worker (separate from main app)
npm run ai:dev

# 2. Use CLI tool to generate configs
npm run generate

# Follow prompts - describe what you want in natural language
# AI generates: schema → API → pages → apps navigation
```

The AI worker uses Cloudflare Workers AI (`@cf/openai/gpt-oss-120b` model) to convert natural language descriptions into properly formatted JSON configs.

## Database Management

```bash
npm run db:generate    # Create migration from schema changes
npm run db:migrate     # Apply migrations to local D1 database
npm run db:seed        # Run seed.sql (if exists)
npm run db:setup       # migrate + seed
```

**Local D1 database:** `.wrangler/state/v3/d1/`

To reset database completely:
```bash
rm -rf .wrangler/state/v3/d1/
npm run db:migrate
```

## Config Formats Reference

All configs have corresponding `-format.json` files in `config/` that define their schemas:

- `config/schema-format.json` - Database table definitions
- `config/api-format.json` - REST API endpoint configs
- `config/page-format.json` - UI page layouts
- `config/apps-format.json` - App-level settings (navigation, theme, branding)
- `config/requirements-format.json` - Natural language requirements for AI

See `docs/configuration-guide.md` and `docs/schema-config-guide.md` for detailed format specifications.

## Key Files & Their Roles

### Config Discovery & Loading

- `src/api/config-loader.ts` - Loads API configs from generated index
- `scripts/build-api-index.ts` - Generates `src/api/configs.generated.ts` with static imports
- `src/client/lib/config-loader.tsx` - Loads page configs via Vite's `import.meta.glob`

### Schema Generation

- `scripts/schema/generator.ts` - Converts JSON configs → Drizzle TypeScript
- `scripts/schema/exporter.ts` - Exports existing Drizzle schema → JSON
- `scripts/schema/differ.ts` - Compares schemas to detect drift

### Dynamic Engines

- `src/api/engine/route-engine.ts` - Generic CRUD router (list, get, create, update, delete)
- `src/api/engine/schema-registry.ts` - Dynamically discovers all tables
- `src/client/layouts/page-renderer.tsx` - Renders any page config dynamically

### Build Artifacts (Auto-generated)

- `src/api/configs.generated.ts` - API config imports (regenerated on each build)
- `src/db/schema.ts` - Drizzle schema (regenerated by `schema:generate`)
- `src/db/migrations/` - Drizzle migrations
- `dist/client/` - Vite build output

## Common Pitfalls

1. **Don't hardcode table/resource names** - Use dynamic discovery patterns
2. **Client changes need rebuild** - Page config changes won't show until `npm run build:client`
3. **Page dataSources format** - Must be `{ "items": { "url": "/api/tasks" } }` not `{ "items": "/api/tasks" }`
4. **Schema changes require 3 steps** - generate → db:generate → db:migrate
5. **Two separate servers** - Main app (port 8787) and AI worker (port 8787, separate process)

## Testing Changes

After making config changes:

1. **Schema changes:**
   ```bash
   npm run schema:generate && npm run db:generate && npm run db:migrate
   ```

2. **API changes:**
   ```bash
   # Automatically handled by npm run dev
   # Or manually: npx tsx scripts/build-api-index.ts
   ```

3. **Page/UI changes:**
   ```bash
   npm run build:client
   # Then hard refresh browser (Ctrl+Shift+R)
   ```

## Deployment

```bash
npm run deploy    # Builds client, generates API index, deploys to Cloudflare
```

This runs: `build-api-index → vite build → wrangler deploy`

## Validation

```bash
npm run validate:config      # Validate single config file
npm run validate:all         # Validate all configs in config/
```

Uses JSON Schema validation against format files.
