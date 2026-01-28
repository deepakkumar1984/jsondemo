/**
 * Cloudflare Worker: AI Config Generator
 *
 * Generates configs (schema/api/pages) from natural language descriptions
 * Model: @cf/openai/gpt-oss-120b
 */

interface Env {
  AI: any;
}

interface GenerateRequest {
  type: 'schema' | 'api' | 'pages' | 'apps';
  description: string;
  domain?: string;
  context?: {
    schemas?: Array<{
      table: string;
      columns: Array<{
        name: string;
        type: string;
        references?: { table: string; column: string };
      }>;
    }>;
    apis?: Array<{
      resource: string;
      basePath: string;
      operations: string[];
    }>;
    pages?: Array<{
      entity: string;
      pages: string[];
    }>;
    existingApps?: any;
  };
}

// Generate system prompt based on config type
function generateSystemPrompt(type: string, context?: any): string {
  if (type === 'schema') {
    return `You are a database schema generator. Convert natural language descriptions into database schema JSON configs.

## Output Format

Return a JSON array of schema objects. Each schema:
{
  "table": "table_name",
  "description": "Brief description",
  "columns": [
    {
      "name": "id",
      "type": "text",
      "primaryKey": true,
      "defaultFn": "uuid"
    },
    {
      "name": "fieldName",
      "type": "text|integer|real",
      "notNull": true,
      "unique": false,
      "default": "value",
      "enum": ["option1", "option2"],
      "references": {
        "table": "other_table",
        "column": "id"
      }
    },
    {
      "name": "createdAt",
      "type": "text",
      "default": "CURRENT_TIMESTAMP"
    },
    {
      "name": "updatedAt",
      "type": "text",
      "default": "CURRENT_TIMESTAMP"
    }
  ]
}

## Rules

1. **Output ONLY valid JSON array** - no markdown, no explanations
2. **Every table MUST have**: id (uuid), createdAt, updatedAt
3. **Types**: text, integer, real, blob
4. **Naming**: tables = snake_case, fields = camelCase
5. **Foreign keys**: use references object
6. **Enums**: use enum array

Return JSON array now.`;
  }

  if (type === 'api') {
    let schemasInfo = '';
    if (context?.schemas?.length) {
      schemasInfo = '\n## Available Schemas\n\n' + context.schemas.map((s: any) => {
        const cols = s.columns.map((c: any) => {
          let str = `${c.name}: ${c.type}`;
          if (c.references) str += ` → ${c.references.table}.${c.references.column}`;
          return str;
        });
        return `- ${s.table}: ${cols.join(', ')}`;
      }).join('\n');
    }

    return `You are a TypeScript API route generator. Create Hono-based REST API routes based on database schemas.

## Output Format

Return a JSON array with file path and code content:
[
  {
    "file": "src/api/routes/entities.ts",
    "code": "import { Hono } from 'hono';\\nimport { drizzle } from 'drizzle-orm/d1';\\nimport { eq, like, and, or, desc } from 'drizzle-orm';\\nimport { entities, users } from '../../db/schema';\\nimport { authMiddleware } from '../middleware/auth';\\nimport { success, handleError } from '../utils/response';\\n\\ntype Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };\\n\\nconst app = new Hono<Env>();\\napp.use('*', authMiddleware);\\n\\n// GET /api/entities - List all entities\\napp.get('/', async (c) => { ... });\\n\\n// GET /api/entities/:id - Get single entity\\napp.get('/:id', async (c) => { ... });\\n\\n// POST /api/entities - Create entity\\napp.post('/', async (c) => { ... });\\n\\n// PUT /api/entities/:id - Update entity\\napp.put('/:id', async (c) => { ... });\\n\\n// DELETE /api/entities/:id - Delete entity\\napp.delete('/:id', async (c) => { ... });\\n\\nexport default app;"
  },
  {
    "file": "src/api/index.ts",
    "action": "append",
    "content": "import entitiesRoutes from './routes/entities';\\napi.route('/entities', entitiesRoutes);"
  }
]

## Route Template Pattern

\`\`\`typescript
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, like, desc, asc } from 'drizzle-orm';
import { entities, users } from '../../db/schema';
import { authMiddleware } from '../middleware/auth';
import { success, handleError } from '../utils/response';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

const app = new Hono<Env>();
app.use('*', authMiddleware);

// GET /api/entities - List all with filters/search
app.get('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const { status, search } = c.req.query();

    let conditions = [];
    if (status) conditions.push(eq(entities.status, status));
    if (search) {
      conditions.push(or(
        like(entities.name, \`%\${search}%\`),
        like(entities.description || '', \`%\${search}%\`)
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const results = await db.select().from(entities).where(whereClause).orderBy(desc(entities.createdAt));

    return c.json(success(results));
  } catch (err) {
    const e = handleError('Fetch entities', err);
    return c.json(e.body, e.status);
  }
});

// GET /api/entities/:id - Get single with relations
app.get('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const [entity] = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
    if (!entity) return c.json({ success: false, error: 'Not found' }, 404);

    return c.json(success(entity));
  } catch (err) {
    const e = handleError('Fetch entity', err);
    return c.json(e.body, e.status);
  }
});

// POST /api/entities - Create
app.post('/', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const body = await c.req.json();
    const user = (c as any).get('user');

    const [newEntity] = await db.insert(entities).values({
      id: crypto.randomUUID(),
      ...body,
      createdById: user.id,
    }).returning();

    return c.json(success(newEntity), 201);
  } catch (err) {
    const e = handleError('Create entity', err);
    return c.json(e.body, e.status);
  }
});

// PUT /api/entities/:id - Update
app.put('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');
    const body = await c.req.json();

    const [updated] = await db.update(entities)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(entities.id, id))
      .returning();

    if (!updated) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json(success(updated));
  } catch (err) {
    const e = handleError('Update entity', err);
    return c.json(e.body, e.status);
  }
});

// DELETE /api/entities/:id - Delete
app.delete('/:id', async (c) => {
  try {
    const db = drizzle(c.env.DB);
    const id = c.req.param('id');

    const [deleted] = await db.delete(entities).where(eq(entities.id, id)).returning();
    if (!deleted) return c.json({ success: false, error: 'Not found' }, 404);

    return c.json(success({ message: 'Deleted successfully' }));
  } catch (err) {
    const e = handleError('Delete entity', err);
    return c.json(e.body, e.status);
  }
});

export default app;
\`\`\`

## Rules

1. **Output ONLY valid JSON array** with file objects
2. **Route file path**: \`src/api/routes/{plural}.ts\`
3. **Use table name** from schemas to generate routes
4. **Add filters** for enum/status columns in list endpoint
5. **Add search** for text columns (name, title, description)
6. **Handle relations**: for foreign keys, fetch related data in getById
7. **Use authMiddleware** on all routes
8. **Return proper errors** with 404/400 status codes
9. **Import from** \`../../db/schema\` using the table name
${schemasInfo}

Return JSON array now.`;
  }

  if (type === 'pages') {
    let contextInfo = '';

    if (context?.schemas?.length && context?.apis?.length) {
      contextInfo = '\n## Available Resources\n\n' + context.schemas.map((s: any) => {
        const api = context.apis.find((a: any) => a.resource === s.table);
        const mainCols = s.columns.filter((c: any) => !['id', 'createdAt', 'updatedAt'].includes(c.name)).slice(0, 5);
        return `- ${s.table}: ${api?.basePath || '/api/' + s.table} | Fields: ${mainCols.map((c: any) => c.name).join(', ')}`;
      }).join('\n');
    }

    return `You are a UI page config generator. Create page configs that use existing APIs and match database schemas.

## Output Format

Return a JSON array of page configs (list, create, detail for each entity).

**LIST PAGE:**
{
  "page": "entity/list",
  "dataSources": {
    "items": { "url": "/api/entity" }
  },
  "children": [
    {
      "type": "PageHeader",
      "props": {
        "title": "Entity List",
        "actions": [
          { "label": "Add New", "action": { "type": "navigate", "to": "/entity/create" } }
        ]
      }
    },
    {
      "type": "DataTable",
      "props": {
        "dataPath": "items",
        "columns": [
          { "key": "name", "header": "Name" },
          { "key": "status", "header": "Status", "render": { "type": "Badge", "props": { "colorMap": { "active": "default" } } } }
        ],
        "actions": [
          { "label": "View", "action": { "type": "navigate", "to": "/entity/:id" } }
        ]
      }
    }
  ]
}

**CREATE PAGE:**
{
  "page": "entity/create",
  "dataSources": {},
  "children": [
    {
      "type": "PageHeader",
      "props": { "title": "Create Entity" }
    },
    {
      "type": "Form",
      "props": {
        "action": {
          "type": "submit_form",
          "url": "/api/entity",
          "method": "POST",
          "redirectTo": "/entity"
        }
      },
      "children": [
        { "type": "TextField", "props": { "name": "name", "label": "Name", "required": true } },
        { "type": "TextArea", "props": { "name": "description", "label": "Description" } },
        { "type": "SelectField", "props": { "name": "status", "label": "Status", "options": [{ "label": "Active", "value": "active" }, { "label": "Inactive", "value": "inactive" }] } }
      ]
    }
  ]
}

**DETAIL PAGE:**
{
  "page": "entity/detail",
  "dataSources": {
    "item": { "url": "/api/entity/:id" }
  },
  "children": [
    {
      "type": "PageHeader",
      "props": {
        "title": "Entity Details",
        "actions": [
          { "label": "Edit", "action": { "type": "navigate", "to": "/entity/:id/edit" } }
        ]
      }
    },
    {
      "type": "Card",
      "props": { "title": "Information" },
      "children": [
        { "type": "DetailRow", "props": { "label": "Name", "valuePath": "item.name" } },
        { "type": "DetailRow", "props": { "label": "Status", "valuePath": "item.status", "render": { "type": "Badge" } } }
      ]
    }
  ]
}
${contextInfo}

## CRITICAL Rules

1. **Component property is "type"** - NEVER use "component"
2. **dataSources format**: { "items": { "url": "/api/entity" } } - nested object with url
3. **DataTable uses "dataPath"** - references the data key (e.g., "items")
4. **Column property is "header"** - NOT "label"
5. **Action property is "to"** - NOT "path"
6. **Badge render format**: { "type": "Badge", "props": { "colorMap": {...} } }
7. **Form fields use "name"** - not "field" or "key"
8. **DetailRow uses "valuePath"** - path to data (e.g., "item.name")

Return JSON array now.`;
  }

  if (type === 'apps') {
    let pagesInfo = '';

    if (context?.pages?.length) {
      pagesInfo = '\n## Available Pages\n\n' + context.pages.map((p: any) =>
        `- ${p.entity}: ${p.pages.join(', ')}`
      ).join('\n');
    }

    let existingInfo = '';
    if (context?.existingApps) {
      existingInfo = '\n## Existing App Config\n\nUpdate the existing config below:\n' +
        JSON.stringify(context.existingApps, null, 2);
    }

    return `You are an app config generator. Create or update the main app configuration.

## Output Format

Return a JSON object with apps array:
{
  "apps": [
    {
      "id": "app-id",
      "name": "App Name",
      "subtitle": "Subtitle",
      "shortName": "Short",
      "description": "Description",
      "prefix": "/",
      "branding": {
        "logo": "📱",
        "companyName": "Company",
        "tagline": "Tagline"
      },
      "theme": {
        "mode": "light",
        "allowModeToggle": true
      },
      "icons": {
        "library": "lucide",
        "size": "20px"
      },
      "navigation": {
        "categories": [
          {
            "id": "category-id",
            "title": "Category",
            "icon": "LayoutDashboard",
            "order": 1,
            "items": [
              { "title": "Item", "path": "/path", "page": "entity/list", "icon": "Icon" }
            ]
          }
        ]
      },
      "routes": [
        { "path": "/entity/new", "page": "entity/create" },
        { "path": "/entity/:id", "page": "entity/detail" },
        { "path": "/entity/:id/edit", "page": "entity/edit" }
      ]
    }
  ]
}
${pagesInfo}${existingInfo}

## Rules

1. **Output ONLY valid JSON object** (not array)
2. **Build navigation from available pages**
3. **Group entities into logical categories**
4. **Add routes for create, detail, edit pages**
5. **Use appropriate icons from lucide**
6. If updating existing config, preserve custom settings

Return JSON object now:`;
  }

  return '';
}

// Generate user prompt
function generateUserPrompt(type: string, description: string, context?: any): string {
  if (type === 'schema') {
    return `Generate database schemas for: ${description}

Include appropriate fields, relationships, and data types.
Output JSON array:`;
  }

  if (type === 'api') {
    let instruction = `Generate TypeScript API route files for: ${description}\n\n`;

    if (context?.schemas?.length) {
      instruction += `Use the schemas listed above to generate complete route files.\n\n`;
    }

    instruction += `For each table:
1. Generate a complete TypeScript route file at src/api/routes/{table}.ts
2. Include: list, getById, create, update, delete endpoints
3. Add filters for enum/status columns
4. Add search for text columns
5. Handle foreign key relations in getById
6. Provide the import statements to add to src/api/index.ts

Output JSON array with file objects:`;

    return instruction;
  }

  if (type === 'pages') {
    return `Generate page configs for: ${description}

Create list, create, and detail pages for each entity.
Use the API endpoints and fields from resources listed above.
Keep configs simple and focused.

Output JSON array:`;
  }

  if (type === 'apps') {
    let instruction = '';

    if (context?.existingApps) {
      instruction = `Update the app config for: ${description}\n\n`;
      instruction += 'Update navigation to include all available pages listed above.\n';
      instruction += 'Preserve existing branding and theme settings.\n';
    } else {
      instruction = `Create app config for: ${description}\n\n`;
      instruction += 'Build navigation categories from available pages.\n';
      instruction += 'Group related entities together.\n';
      instruction += 'Add routes for all page types (list, create, detail, edit).\n';
    }

    instruction += '\nOutput JSON object:';
    return instruction;
  }

  return '';
}

// Parse AI response
function parseAIResponse(response: string, expectObject = false): any {
  let jsonStr = response.trim();

  // Remove markdown code blocks
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) jsonStr = match[1].trim();
  }

  if (expectObject) {
    // Find JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
  } else {
    // Find JSON array
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
    }
  }

  return JSON.parse(jsonStr);
}

// Validate and enhance schemas
function enhanceSchemas(schemas: any[]): any[] {
  return schemas.map(schema => {
    const columns = schema.columns || [];

    // Ensure standard fields
    const hasId = columns.some((col: any) => col.name === 'id');
    const hasCreatedAt = columns.some((col: any) => col.name === 'createdAt');
    const hasUpdatedAt = columns.some((col: any) => col.name === 'updatedAt');

    if (!hasId) {
      columns.unshift({
        name: 'id',
        type: 'text',
        primaryKey: true,
        defaultFn: 'uuid'
      });
    }

    if (!hasCreatedAt) {
      columns.push({
        name: 'createdAt',
        type: 'text',
        default: 'CURRENT_TIMESTAMP'
      });
    }

    if (!hasUpdatedAt) {
      columns.push({
        name: 'updatedAt',
        type: 'text',
        default: 'CURRENT_TIMESTAMP'
      });
    }

    return { ...schema, columns };
  });
}

// Main worker handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body: GenerateRequest = await request.json();
      const { type, description, context } = body;

      if (!type || !description) {
        throw new Error('Missing type or description');
      }

      console.log(`Generating ${type} for: ${description}`);
      if (context?.schemas?.length) {
        console.log(`  With ${context.schemas.length} schemas`);
      }
      if (context?.apis?.length) {
        console.log(`  With ${context.apis.length} APIs`);
      }

      // Generate prompts
      const systemPrompt = generateSystemPrompt(type, context);
      const userPrompt = generateUserPrompt(type, description, context);

      // Call AI with appropriate token limit based on type
      const maxTokens = type === 'api' ? 16384 : type === 'pages' ? 6144 : 8192;

      const aiResponse = await env.AI.run('@cf/openai/gpt-oss-120b', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.1
      });

      // Parse response - OpenAI chat completion format
      let responseText: string = '';

      if (typeof aiResponse === 'string') {
        responseText = aiResponse;
      } else if (aiResponse?.choices?.[0]?.message?.content) {
        // OpenAI-style chat completion format
        responseText = aiResponse.choices[0].message.content;
      } else if (aiResponse?.response) {
        responseText = aiResponse.response;
      } else if (aiResponse?.text) {
        responseText = aiResponse.text;
      } else {
        throw new Error('Unable to extract text from AI response');
      }

      console.log('Response text length:', responseText.length);
      console.log('Response preview:', responseText.substring(0, 150));

      let result: any;

      if (type === 'apps') {
        // Apps returns an object, not an array
        result = parseAIResponse(responseText, true);
      } else {
        // Schema, API, Pages return arrays
        result = parseAIResponse(responseText, false);

        // Enhance schemas with standard fields
        if (type === 'schema') {
          result = enhanceSchemas(result);
        }
      }

      let count = 0;
      let responseData: any = {
        success: true,
        type,
        generated: 0
      };

      if (type === 'apps') {
        count = result.apps?.length || 0;
        responseData.config = result;
      } else if (type === 'api') {
        // APIs return file objects
        count = result.length;
        responseData.files = result;
        responseData.instructions = 'Copy the code to the specified files and add the imports to src/api/index.ts';
      } else {
        // Schema, Pages return configs
        count = result.length;
        responseData.configs = result;
      }

      console.log(`Generated ${count} ${type} config(s)`);

      return new Response(JSON.stringify(responseData, null, 2), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });

    } catch (error: any) {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }
} satisfies ExportedHandler<Env>;
