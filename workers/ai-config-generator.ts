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
          let str = c.name;
          if (c.references) str += `→${c.references.table}`;
          return str;
        });
        return `- ${s.table}: ${cols.join(', ')}`;
      }).join('\n');
    }

    return `You are an API config generator. Create REST API endpoint configs based on database schemas.

## Output Format

Return a JSON array of API configs:
{
  "resource": "entity_name",
  "table": "table_name",
  "basePath": "/api/entity",
  "list": {
    "enabled": true,
    "defaultLimit": 50,
    "filters": [
      { "param": "status", "field": "status", "cast": "text" }
    ],
    "search": {
      "fields": ["name", "description"]
    }
  },
  "getById": {
    "enabled": true,
    "lookups": [
      {
        "name": "owner",
        "condition": "ownerId IS NOT NULL",
        "table": "users",
        "where": { "id": "{{ownerId}}" },
        "select": ["id", "name", "email"],
        "format": "single"
      }
    ]
  },
  "create": {
    "enabled": true
  },
  "update": {
    "enabled": true
  },
  "delete": {
    "enabled": true,
    "mode": "soft"
  },
  "customEndpoints": [
    {
      "method": "GET",
      "path": "/by-status/:status",
      "handler": "getByStatus"
    }
  ]
}
${schemasInfo}

## Rules

1. **Output ONLY valid JSON array**
2. **Match table names from schemas**
3. **Add filters for enum columns**
4. **Add search for text columns**
5. **Add lookups for foreign key relationships**
6. **Add custom endpoints for common queries** (by name, by status, search, etc)
7. **Use soft delete** by default

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
    let instruction = `Generate API endpoint configs for: ${description}\n\n`;

    if (context?.schemas?.length) {
      instruction += `Use the schemas listed above. `;
    }

    instruction += `For each table, create:
- CRUD operations (list, getById, create, update, delete)
- Filters for enum/status columns
- Search for text columns (name, title, description)
- Lookups for foreign key relationships
- Custom endpoints for common queries (e.g., /by-status/:status, /search)

Output JSON array:`;

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

      // Call AI with reduced token limit for faster response
      const maxTokens = type === 'pages' ? 4096 : 8192;

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

      const count = type === 'apps' ? (result.apps?.length || 0) : result.length;
      console.log(`Generated ${count} ${type} config(s)`);

      // Return format depends on type
      const responseData: any = {
        success: true,
        type,
        generated: count
      };

      if (type === 'apps') {
        responseData.config = result; // Return the apps object
      } else {
        responseData.configs = result; // Return array of configs
      }

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
