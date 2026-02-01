# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A JSON-driven full-stack application platform that generates APIs and UIs from declarative JSON configurations. The system supports operation-based APIs with workflow orchestration, data-driven UI rendering, and schema-driven database operations.

**Core Innovation:** Configuration-as-code approach where APIs, pages, and data schemas are defined in JSON files, then executed by engine components at runtime.

## Tech Stack

**Backend:** Cloudflare Workers, Hono, Blazorly Data API Client
**Frontend:** React 19, Vite 7, TypeScript, React Router 7, TailwindCSS 3, Radix UI
**Data Layer:** Blazorly Data Service (external API), JSON schema definitions

## Development Commands

```bash
# Development
npm run dev                    # Start Cloudflare Workers dev server (port 8001 by default)
npm run build                  # Build client + validate configs + generate API index
npm run build:client           # Build React frontend only
npm run build:api-index        # Generate API config index from config/api/*.json

# Database Operations
npm run db:migrate             # Run schema migration to Data API
npm run db:migrate:fresh       # Drop and recreate all tables

# Validation & Type Checking
npm run validate:config        # Validate single config file
npm run validate:all           # Validate all configs + cross-references
npm run typecheck              # TypeScript type checking

# Deployment
npm run deploy                 # Build and deploy to Cloudflare Workers
```

## Project Structure

```
jsondemo/
├── config/                    # Declarative configurations (the heart of the system)
│   ├── api/                  # API operation configs (projects.json, etc.)
│   ├── pages/                # Page UI configs (dashboard.json, etc.)
│   ├── schema/               # Database schema definitions (projects.json, users.json, etc.)
│   ├── apps.json             # App navigation and routing
│   ├── api-format.json       # JSON Schema for API configs
│   ├── page-format.json      # JSON Schema for page configs
│   └── schema-format.json    # JSON Schema for schema definitions
├── src/
│   ├── api/                  # Backend API layer
│   │   ├── engine/           # Core engines (route, action, schema)
│   │   ├── middleware/       # Auth, validation middleware
│   │   ├── routes/           # Manual routes (auth.ts)
│   │   ├── index.ts          # Main API router
│   │   └── configs.generated.ts  # Auto-generated API config imports
│   ├── client/               # React frontend
│   │   ├── layouts/          # PageRenderer - renders JSON configs
│   │   ├── pages/            # Static pages (login, signup)
│   │   ├── components/ui/    # Reusable UI components
│   │   └── lib/              # API client, auth context
│   ├── db/                   # Data layer
│   │   ├── BlazorlyDataServiceClient.ts  # Data API client
│   │   └── data-client.ts    # Factory for client instances
│   └── worker.ts             # Cloudflare Worker entry point
├── scripts/                   # Build and validation scripts
│   ├── build-api-index.ts    # Generates configs.generated.ts
│   ├── validate-config.ts    # Schema validation + cross-reference checking
│   └── schema/               # Schema migration scripts
└── wrangler.toml             # Cloudflare Workers configuration
```

## Core Architecture Patterns

### 1. Config-Driven API Engine

**How it works:**
- API endpoints are defined in `config/api/*.json` files using operation-based format
- Each operation specifies: method, path, request/response schemas, and **actions** (workflow)
- `scripts/build-api-index.ts` generates static imports at build time (Cloudflare Workers don't support dynamic imports)
- `RouteEngine` reads configs and dynamically creates Hono routes at runtime
- `ActionEngine` executes the workflow defined in the `actions` array

**Example flow:**
```
config/api/projects.json → build-api-index.ts → configs.generated.ts →
RouteEngine.createRouterFromConfig() → Hono route at /api/projects
```

**Key files:**
- `src/api/engine/route-engine.ts` - Converts API configs to Hono routes
- `src/api/engine/action-engine.ts` - Executes action workflows (db.query, transform, condition, etc.)
- `src/api/index.ts` - Auto-registers all API configs as routes

### 2. Action-Based Workflow Engine

**No static CRUD operations** - everything goes through the action workflow system.

**Available action types:**
- **Validation:** `validate` (required, email, min/max, etc.)
- **Transformation:** `transform` (set variables, interpolate templates)
- **Business Logic:** `calc` (sum, expressions), `condition` (if/then/else), `loop` (iterate arrays)
- **Data Access:** `db.query`, `db.insert`, `db.update`, `db.delete`, `db.bulkInsert`
- **Integration:** `http.call` (external API calls)
- **Flow Control:** `transaction`, `parallel`
- **Response Mapping:** `response.map`, `transform.array`
- **Error Handling:** `try/catch`

**Special features:**
- Template interpolation: `"{{body.fieldName}}"` resolves from context
- Special functions: `uuid()`, `now()`, `sum(array, field)`
- Nested context: `body`, `params`, `query`, `user`, runtime variables

**Example workflow:**
```json
{
  "actions": [
    { "type": "validate", "rules": [{"field": "body.name", "rule": "required"}] },
    { "type": "transform", "set": { "body.id": "uuid()", "body.createdAt": "now()" } },
    { "type": "db.insert", "table": "projects", "map": "{{body}}", "returning": "projectId" },
    { "type": "response.map", "fields": { "id": "{{projectId}}", "message": "Project created" } }
  ]
}
```

### 3. JSON Schema-Driven UI Rendering

**How it works:**
- Pages are defined in `config/pages/*.json` using component hierarchies
- `PageRenderer` (src/client/layouts/page-renderer.tsx) reads configs and renders React components
- Supports declarative data binding with `dataPath`, `valuePath`, template expressions
- Components are registered in PageRenderer's switch statement

**Data flow:**
```
Page config → dataSources (API URLs) → PageRenderer fetches data →
DataContext provides data to components → Components resolve paths (e.g., dataPath="projects")
```

**Component types:**
- Layout: `PageHeader`, `Card`, `Grid`, `Stack`, `Tabs`, `TabPanel`
- Data: `DataTable`, `StatCard`, `Badge`, `DetailRow`, `DetailSection`
- Forms: `Form`, `TextField`, `TextArea`, `SelectField`, `DateField`, `Button`
- Actions: `navigate`, `submit_form`, `delete_confirm`, `api_call`

**Key patterns:**
- `dataPath`: Points to data source (e.g., "projects" fetches from dataSources.projects)
- `valuePath`: Nested path within data (e.g., "employee.firstName")
- `template`: Mustache-style templates (e.g., "{{firstName}} {{lastName}}")
- `action`: Declarative actions triggered by buttons, forms, rows

### 4. Blazorly Data API Integration

**Abstraction layer over external data service:**
- `BlazorlyDataServiceClient` provides CRUD operations with typed responses
- `data-client.ts` factory creates clients from environment bindings
- Filter syntax: `{ field: { _eq: value } }`, `{ _gt, _lt, _in, _null, etc. }`
- Pagination: `limit`, `offset` in QueryParams

**Environment variables (wrangler.toml):**
```toml
DATA_API_URL = "http://localhost:8789"
DATA_API_KEY = "blz_..."
DATA_TENANT_ID = "uuid"
DATA_DATABASE = "bdk_prod"
```

**Usage in actions:**
```typescript
// ActionEngine automatically creates client from context.env
const result = await this.client.getItems('projects', { filter: { status: { _eq: 'active' } } });
```

### 5. Config Validation System

**Three layers of validation:**

1. **JSON Schema validation** (`scripts/validate-config.ts`)
   - Validates structure against format files (api-format.json, page-format.json, etc.)
   - Checks required fields, types, enums, patterns

2. **Cross-reference validation**
   - APIs → Schemas: Ensures referenced tables exist
   - Pages → APIs: Ensures dataSources reference valid API endpoints
   - Apps → Pages: Ensures navigation/routes reference valid pages

3. **Runtime validation**
   - ActionEngine validates request schemas before execution
   - Type coercion for numbers, booleans in route-engine.ts

**Run validation:**
```bash
npm run validate:all           # Full validation with cross-references
tsx scripts/validate-config.ts config/api/projects.json  # Single file
```

## Common Workflows

### Adding a New API Endpoint

1. **Create API config:** `config/api/my-resource.json`
```json
{
  "resource": "my-resource",
  "name": "My Resource API",
  "basePath": "/api/my-resource",
  "operations": [
    {
      "id": "listItems",
      "method": "GET",
      "path": "/",
      "actions": [
        { "type": "db.query", "table": "my_table", "into": "items" },
        { "type": "response.map", "fields": { "items": "{{items}}" } }
      ]
    }
  ]
}
```

2. **Rebuild API index:** `npm run build:api-index`
   - This regenerates `src/api/configs.generated.ts`
   - API is automatically registered in `src/api/index.ts` on next dev server restart

3. **Validate:** `npm run validate:config config/api/my-resource.json`

### Adding a New Page

1. **Create page config:** `config/pages/my-page.json`
```json
{
  "dataSources": {
    "items": { "url": "/api/my-resource" }
  },
  "children": [
    {
      "type": "PageHeader",
      "props": { "title": "My Page" }
    },
    {
      "type": "DataTable",
      "props": {
        "dataPath": "items",
        "columns": [
          { "key": "name", "header": "Name" },
          { "key": "status", "header": "Status" }
        ]
      }
    }
  ]
}
```

2. **Add route to apps.json:**
```json
{
  "apps": [{
    "routes": [
      { "path": "/my-page", "page": "my-page" }
    ],
    "navigation": {
      "categories": [{
        "items": [
          { "title": "My Page", "path": "/my-page", "page": "my-page" }
        ]
      }]
    }
  }]
}
```

3. **Validate:** `npm run validate:all`

### Migrating Database Schema

1. **Define schema:** `config/schema/my_table.json`
```json
{
  "table": "my_table",
  "columns": [
    { "name": "id", "type": "text", "primaryKey": true, "defaultFn": "uuid" },
    { "name": "name", "type": "text", "notNull": true }
  ]
}
```

2. **Run migration:** `npm run db:migrate`
   - Creates/updates table in Blazorly Data Service
   - For fresh start: `npm run db:migrate:fresh` (drops all tables)

## Important Implementation Rules

### When Writing API Configs

1. **Always use actions array** - Never assume CRUD endpoints exist
2. **Match schema field names exactly** - DB columns must match `body.fieldName` in transforms
3. **Use template syntax for dynamic values:** `"{{body.fieldName}}"` not `body.fieldName`
4. **Return responses with response.map** - Last action should map final response structure
5. **Validate before database operations** - Use `validate` action first in workflow

### When Writing Page Configs

1. **dataPath must match dataSources key** - If dataSource is "projects", use `dataPath: "projects"`
2. **Strip /api from URLs in dataSources** - Use `"/projects"` not `"/api/projects"` (api.ts client adds /api)
3. **Use consistent page naming** - Match file path structure (e.g., `config/pages/dashboard.json` → `page: "dashboard"`)
4. **Required form fields need validation** - PageRenderer validates based on `required: true` prop

### When Writing Actions

1. **db.query with limit: 1** returns single object, not array
2. **Template interpolation** happens in ActionEngine via `interpolateString()` and `interpolateObject()`
3. **Context variables persist** across actions in same workflow (e.g., `into: "variable"` makes it available to later actions)
4. **Special functions** are case-sensitive: `uuid()`, `now()`, `sum(array, field)`

## Error Handling Philosophy

**Critical requirement from global CLAUDE.md:** NEVER hide errors or pretend operations succeeded when they failed.

- ActionEngine returns `{ success: false, error: { message, status } }` on failure
- RouteEngine propagates errors to HTTP responses (400, 404, 500)
- PageRenderer shows error states in DataTable skeleton/empty states
- FormRenderer displays inline validation errors

**Example of correct error handling:**
```typescript
// GOOD - Propagates failure
const result = await this.executeDbInsert(action);
if (!result.success) {
  return result; // Contains error
}

// BAD - Hides failure
try {
  await this.executeDbInsert(action);
} catch {
  console.log('Failed but continuing');
}
return { success: true }; // WRONG - operation failed!
```

## Environment Configuration

**Required environment variables (wrangler.toml or .dev.vars):**
- `JWT_SECRET` - For authentication tokens
- `DATA_API_URL` - Blazorly Data Service endpoint
- `DATA_API_KEY` - API authentication key
- `DATA_TENANT_ID` - Tenant identifier
- `DATA_DATABASE` - Database name

**Development vs Production:**
- Dev: Uses `wrangler dev` with local vars from wrangler.toml
- Prod: Override with `wrangler secret put <KEY>` for sensitive values

## Key Debugging Commands

```bash
# Check if API configs are registered
npm run build:api-index && grep "export const apiConfigs" src/api/configs.generated.ts

# Validate specific config file
tsx scripts/validate-config.ts config/api/projects.json

# Check cross-references (APIs→Schemas, Pages→APIs, Apps→Pages)
npm run validate:all

# Type check without building
npm run typecheck

# See all available API routes
# Start dev server and check console logs for "Registering config-driven route:" messages
```

## Testing Changes

1. **After modifying API configs:** Run `npm run build:api-index` then restart dev server
2. **After modifying page configs:** No rebuild needed, just refresh browser
3. **After modifying schemas:** Run `npm run db:migrate` to sync changes
4. **Before committing:** Run `npm run validate:all` to catch config errors

## Common Pitfalls

1. **Dynamic imports don't work** - Always use `build-api-index.ts` to generate static imports for Cloudflare Workers
2. **API path confusion** - RouteEngine strips `/api` prefix from basePath since router is already mounted at `/api`
3. **Data binding case sensitivity** - `dataPath: "Projects"` won't match `dataSources.projects`
4. **Missing config rebuild** - Changes to API configs require running `build:api-index` and restarting server
5. **Type coercion edge cases** - Query params and form data arrive as strings, ActionEngine coerces based on requestSchema
6. **Empty string select values** - FormRenderer maps empty string to `__EMPTY__` to avoid Radix UI issues

## Reference Architecture

This project follows patterns from VibeSDK located at `/home/ubuntu/work/blazorly_vibe/vibesdk/` (see PROJECT_TRACKER_README.md for relationship to broader Blazorly platform).
