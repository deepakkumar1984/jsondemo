# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A hybrid full-stack application platform combining TypeScript APIs with JSON-driven UIs. APIs are implemented as TypeScript route handlers using Hono framework, while pages and schemas are defined in declarative JSON configurations.

**Core Innovation:** TypeScript code for APIs (simplicity, type safety), JSON configs for UI/data (AI-friendly generation).

## Tech Stack

**Backend:** Cloudflare Workers, Hono, Blazorly Data API Client
**Frontend:** React 19, Vite 7, TypeScript, React Router 7, TailwindCSS 3, Radix UI
**Data Layer:** Blazorly Data Service (external API), JSON schema definitions

## Development Commands

```bash
# Development
bun run dev                    # Start Cloudflare Workers dev server (port 8001 by default)
bun run build                  # Build client + validate configs + generate routes index
bun run build:client           # Build React frontend only
bun run build:routes-index     # Generate routes index from config/api/*.routes.ts

# Database Operations
bun run db:migrate             # Run schema migration to Data API
bun run db:migrate:fresh       # Drop and recreate all tables

# Validation & Type Checking
bun run validate:config        # Validate single config file
bun run validate:all           # Validate all configs + cross-references
bun run typecheck              # TypeScript type checking

# Deployment
bun run deploy                 # Build and deploy to Cloudflare Workers
```

## Project Structure

```
jsondemo/
├── config/                    # API routes and declarative configurations
│   ├── api/                  # TypeScript route handlers (*.routes.ts)
│   ├── pages/                # Page UI configs (dashboard.json, etc.)
│   ├── schema/               # Database schema definitions (employees.json, departments.json, etc.)
│   ├── apps.json             # App navigation and routing
│   ├── page-format.json      # JSON Schema for page configs
│   └── schema-format.json    # JSON Schema for schema definitions
├── src/
│   ├── api/                  # Backend API layer
│   │   ├── middleware/       # Auth, validation middleware
│   │   ├── routes/           # Manual routes (auth.ts)
│   │   ├── index.ts          # Main API router
│   │   └── routes.generated.ts  # Auto-generated route imports
│   ├── client/               # React frontend
│   │   ├── layouts/          # JsonPageRenderer - renders JSON configs using json-render
│   │   ├── pages/            # Static pages (login, signup)
│   │   ├── components/
│   │   │   ├── ui/           # Reusable UI components (shadcn/ui)
│   │   │   └── json-render/  # json-render component wrappers & registry
│   │   └── lib/              # API client, auth context, action handlers
│   ├── db/                   # Data layer
│   │   ├── BlazorlyDataServiceClient.ts  # Data API client
│   │   └── data-client.ts    # Factory for client instances
│   └── worker.ts             # Cloudflare Worker entry point
├── scripts/                   # Build and validation scripts
│   ├── build-routes-index.ts # Generates routes.generated.ts
│   ├── validate-config.ts    # Schema validation + cross-reference checking
│   ├── ai-config-generator.ts # AI-powered code/config generator
│   └── schema/               # Schema migration scripts
└── wrangler.toml             # Cloudflare Workers configuration
```

## Core Architecture Patterns

### 1. TypeScript Route Handlers

**How it works:**
- API routes are TypeScript files in `config/api/*.routes.ts`
- Each file exports a Hono router named after the resource (e.g., `employeesRouter`)
- Routes use the Blazorly Data API client directly for database operations
- `scripts/build-routes-index.ts` generates static imports at build time
- Routes are auto-registered in `src/api/index.ts` at server startup

**Example flow:**
```
config/api/employees.routes.ts → build-routes-index.ts → routes.generated.ts →
src/api/index.ts auto-registers → Hono route at /api/employees
```

**Key patterns:**
- File naming: `{resource}.routes.ts`
- Export pattern: `export const {resource}Router = new Hono<{ Bindings: Env }>()`
- Request body fields: camelCase → Database columns: snake_case
- Response format: `{ success: boolean, data?: any, error?: { message, status }, message?: string }`

**Example route file:**
```typescript
import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const employeesRouter = new Hono<{ Bindings: Env }>();

employeesRouter.get('/', async (c) => {
  const client = createDataClient(c.env);
  try {
    const employees = await client.getItems('employees', {});
    return c.json({ success: true, data: employees.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

employeesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  // Validation
  if (!body.firstName || !body.lastName || !body.email) {
    return c.json({
      success: false,
      error: { message: 'Missing required fields', status: 400 }
    }, 400);
  }

  try {
    const employee = await client.createItem('employees', {
      id: crypto.randomUUID(),
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: employee.data,
      message: 'Employee created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});
```

### 2. json-render-Based UI Rendering

**How it works:**
- Pages are defined in `config/pages/*.json` using nested component hierarchies
- `JsonPageRenderer` (src/client/layouts/json-page-renderer.tsx) uses the [@json-render](https://github.com/vercel-labs/json-render) library
- Page configs are converted from nested format to flat UITree structure transparently
- Component wrappers in `src/client/components/json-render/wrappers/` bridge json-render to shadcn/ui components
- Supports declarative data binding with `dataPath`, `valuePath`, template expressions (`{{variable}}`)

**Data flow:**
```
Page config (nested) → JsonPageRenderer fetches data from dataSources →
  convertToUITree() → Flat UITree → json-render Renderer →
  ComponentRegistry → Wrapper Components → shadcn/ui Components
```

**Key architecture:**
- `JsonPageRenderer` - Main entry point, handles data fetching and setup
- `ComponentRegistry` - Maps component type names to wrapper components
- `Wrapper Components` - Adapt json-render props to shadcn/ui components, handle template interpolation
- `Action Handlers` - Execute actions (navigate, submit_form, api_call, etc.)
- `Utility Functions` - convertToUITree, interpolateTemplate, resolveDataPath

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

### 3. Blazorly Data API Integration

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

**Available Data API client methods:**
```typescript
const client = createDataClient(env);

// CRUD operations
await client.createItem(collection, data)
await client.getItems(collection, params)
await client.getItemById(collection, id)
await client.updateItem(collection, id, data)
await client.deleteItem(collection, id)

// Query parameters for getItems
{
  filter: { field: { _eq, _ne, _gt, _lt, _gte, _lte, _in, _null } },
  limit: number,
  offset: number,
  sort: string[],  // e.g., ['-created_at']
  fields: string[]  // columns to return
}
```

### 4. Config Validation System

**Two layers of validation:**

1. **JSON Schema validation** (`scripts/validate-config.ts`)
   - Validates structure against format files (page-format.json, schema-format.json)
   - Checks required fields, types, enums, patterns
   - **Note:** API routes are TypeScript code, not validated by JSON schema

2. **Cross-reference validation**
   - Pages → APIs: Ensures dataSources reference valid API endpoints
   - Apps → Pages: Ensures navigation/routes reference valid pages
   - Schemas → Tables: Ensures table names are valid

**Run validation:**
```bash
bun run validate:all           # Full validation with cross-references
tsx scripts/validate-config.ts config/pages/employees-list.json  # Single file
```

## Common Workflows

### Adding a New API Endpoint

1. **Create TypeScript route file:** `config/api/tasks.routes.ts`
```typescript
import { Hono } from 'hono';
import type { Env } from '../../src/types';
import { createDataClient } from '../../src/db/data-client';

export const tasksRouter = new Hono<{ Bindings: Env }>();

// List tasks
tasksRouter.get('/', async (c) => {
  const client = createDataClient(c.env);

  try {
    const tasks = await client.getItems('tasks', {
      sort: ['-created_at']
    });
    return c.json({ success: true, data: tasks.data });
  } catch (error: any) {
    return c.json({ success: false, error: { message: error.message, status: 500 } }, 500);
  }
});

// Create task
tasksRouter.post('/', async (c) => {
  const body = await c.req.json();
  const client = createDataClient(c.env);

  if (!body.title) {
    return c.json({
      success: false,
      error: { message: 'Title is required', status: 400 }
    }, 400);
  }

  try {
    const task = await client.createItem('tasks', {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description,
      status: body.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return c.json({
      success: true,
      data: task.data,
      message: 'Task created successfully'
    }, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      error: { message: error.message, status: 500 }
    }, 500);
  }
});
```

2. **Rebuild routes index:** `bun run build:routes-index`
   - This regenerates `src/api/routes.generated.ts`
   - Route is automatically registered in `src/api/index.ts` on next dev server restart

3. **Restart dev server:** API is ready to use at `/api/tasks`

### Adding a New Page

1. **Create page config:** `config/pages/tasks-list.json`
```json
{
  "dataSources": {
    "tasks": { "url": "/api/tasks" }
  },
  "children": [
    {
      "type": "PageHeader",
      "props": { "title": "Tasks" }
    },
    {
      "type": "DataTable",
      "props": {
        "dataPath": "tasks",
        "columns": [
          { "key": "title", "header": "Title" },
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
      { "path": "/tasks", "page": "tasks-list" }
    ],
    "navigation": {
      "categories": [{
        "items": [
          { "title": "Tasks", "path": "/tasks", "page": "tasks-list" }
        ]
      }]
    }
  }]
}
```

3. **Validate:** `bun run validate:all`
4. **Refresh browser:** Page is ready at `/tasks`

### Migrating Database Schema

1. **Define schema:** `config/schema/tasks.json`
```json
{
  "table": "tasks",
  "columns": [
    { "name": "id", "type": "text", "primaryKey": true, "defaultFn": "uuid" },
    { "name": "title", "type": "text", "notNull": true },
    { "name": "description", "type": "text" },
    { "name": "status", "type": "text", "notNull": true, "default": "pending" },
    { "name": "created_at", "type": "timestamp", "notNull": true },
    { "name": "updated_at", "type": "timestamp", "notNull": true }
  ]
}
```

2. **Run migration:** `bun run db:migrate`
   - Creates/updates table in Blazorly Data Service
   - For fresh start: `bun run db:migrate:fresh` (drops all tables)

## Important Implementation Rules

### When Writing API Routes

1. **Use Hono router pattern** - Export as `{resource}Router`
2. **Map field names correctly** - Request body camelCase → Database snake_case
3. **Always validate input** - Check required fields before database operations
4. **Use Data API client methods** - `createItem`, `getItems`, `updateItem`, `deleteItem`
5. **Return consistent responses** - `{ success, data?, error?, message? }`
6. **Set proper HTTP status codes** - 200, 201, 400, 404, 500
7. **Use crypto.randomUUID()** for generating IDs
8. **Use new Date().toISOString()** for timestamps
9. **Implement business logic** - Duplicate prevention, referential integrity checks
10. **Handle errors with try/catch** - Return error details in response

### When Writing Page Configs

1. **dataPath must match dataSources key** - If dataSource is "projects", use `dataPath: "projects"`
2. **Strip /api from URLs in dataSources** - Use `"/projects"` not `"/api/projects"` (api.ts client adds /api)
3. **Use consistent page naming** - Match file path structure (e.g., `config/pages/dashboard.json` → `page: "dashboard"`)
4. **Required form fields need validation** - json-render's ValidationProvider validates based on `required: true` prop
5. **Use nested format** - Component children are nested arrays, not flat UITree (conversion is automatic)
6. **Template syntax** - Use `{{path}}` for interpolation (e.g., `{{employee.firstName}}`)

## Error Handling Philosophy

**Critical requirement from global CLAUDE.md:** NEVER hide errors or pretend operations succeeded when they failed.

- Routes return `{ success: false, error: { message, status } }` on failure
- Proper HTTP status codes propagated (400, 404, 500)
- PageRenderer shows error states in DataTable skeleton/empty states
- FormRenderer displays inline validation errors

**Example of correct error handling:**
```typescript
try {
  await client.createItem('employees', data);
  return c.json({ success: true, data: result }, 201);
} catch (error: any) {
  return c.json({
    success: false,
    error: { message: error.message, status: 500 }
  }, 500);
}
```

**In json-render components:**
- ActionProvider handles action errors automatically
- Components show loading states via the `loading` prop
- Form validation errors display inline via useFieldValidation hook

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
# Check if routes are registered
bun run build:routes-index && grep "export const apiRoutes" src/api/routes.generated.ts

# Validate configs
bun run validate:all

# Type check without building
bun run typecheck

# See all available API routes
# Start dev server and check console logs for "Registering TypeScript route:" messages
```

## Testing Changes

1. **After modifying route files:** Run `bun run build:routes-index` then restart dev server
2. **After modifying page configs:** No rebuild needed, just refresh browser
3. **After modifying schemas:** Run `bun run db:migrate` to sync changes
4. **Before committing:** Run `bun run validate:all` to catch config errors

## Common Pitfalls

1. **Dynamic imports don't work** - Always use `build-routes-index.ts` to generate static imports for Cloudflare Workers
2. **API path confusion** - Routes are mounted at `/api/{resource}` automatically
3. **Data binding case sensitivity** - `dataPath: "Projects"` won't match `dataSources.projects`
4. **Missing routes rebuild** - Changes to route files require running `build:routes-index` and restarting server
5. **Field name mismatches** - Request body fields (camelCase) must map to database columns (snake_case)
6. **Empty string select values** - FormRenderer maps empty string to `__EMPTY__` to avoid Radix UI issues

## AI Code Generation

The project includes an AI-powered code generator at `scripts/ai-config-generator.ts`:

```bash
# Generate TypeScript API routes
tsx scripts/ai-config-generator.ts \
  --type api \
  --feature "Task management CRUD operations" \
  --tasks "Create, read, update, delete tasks with priority and status"

# Generate page configuration
tsx scripts/ai-config-generator.ts \
  --type page \
  --feature "Task list with filters and search"

# Generate database schema
tsx scripts/ai-config-generator.ts \
  --type schema \
  --feature "Task tracking system"
```

**Output:**
- `api` type: Generates TypeScript route files (*.routes.ts)
- `page` type: Generates JSON page configs
- `schema` type: Generates JSON schema definitions

## Reference Architecture

This project follows patterns from VibeSDK located at `/home/ubuntu/work/blazorly_vibe/vibesdk/` (see PROJECT_TRACKER_README.md for relationship to broader Blazorly platform).
