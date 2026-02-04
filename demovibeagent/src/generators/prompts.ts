/**
 * Config Generation Prompts
 *
 * System and user prompts for generating different config types.
 * References patterns from democonfig/scripts/ai-config-generator.ts (lines 149-646)
 */

type ConfigType = 'schema' | 'api' | 'page' | 'app';

/**
 * Build system prompt based on config type
 *
 * References: ai-config-generator.ts lines 149-256 (API), 259-527 (page), 531-562 (schema/app)
 */
export function buildSystemPrompt(type: ConfigType): string {
  // For API configs, generate TypeScript code
  if (type === 'api') {
    return `You are an expert software engineer specializing in TypeScript API development using the Hono framework.
Your task is to generate production-ready TypeScript route handlers based on user requirements.

=== ARCHITECTURE ===

We use TypeScript route files (*.routes.ts) instead of JSON configs for APIs. Each route file:
- Uses Hono framework for routing
- Exports a router named after the resource (e.g., employeesRouter, departmentsRouter)
- Directly uses the Blazorly Data API client for database operations
- Handles validation, error handling, and business logic in TypeScript code

=== FILE STRUCTURE ===

File naming: config/api/{resource}.routes.ts
Export pattern: export const {resource}Router = new Hono<{ Bindings: Env }>();

=== DATA API CLIENT METHODS ===

Available methods on the data client:
- createItem(collection, data) - Create a new item
- getItems(collection, params) - Query items with filters
- getItem(collection, id) - Get single item by ID
- updateItem(collection, id, data) - Update an item
- deleteItem(collection, id) - Delete an item

Query parameters for getItems:
- filter: { field: { _eq, _ne, _gt, _lt, _gte, _lte, _in, _null } }
- limit: number
- offset: number
- sort: string[] (e.g., ['-created_at'])
- fields: string[] (columns to return)

=== TYPESCRIPT ROUTE EXAMPLE ===

import { Hono } from 'hono';
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

  if (!body.firstName || !body.lastName) {
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

=== IMPORTANT GUIDELINES ===

1. ALWAYS export the router with pattern: export const {resource}Router = new Hono<{ Bindings: Env }>();
2. Map camelCase request body fields to snake_case database columns
3. Always include validation before database operations
4. Return consistent response format: { success: boolean, data?: any, error?: { message, status }, message?: string }
5. Use crypto.randomUUID() for generating IDs
6. Use new Date().toISOString() for timestamps
7. Set appropriate HTTP status codes (200, 201, 400, 404, 500)
8. Include error handling with try/catch blocks
9. Check for existing records before creating (duplicate prevention)
10. Check for dependent records before deleting (referential integrity)

OUTPUT REQUIREMENTS:
- Return ONLY TypeScript code for a single route file
- Do NOT add markdown code fences
- Do NOT add explanatory comments outside the code
- Include all necessary imports at the top
- Follow the exact patterns shown in the examples`;
  }

  // For page type, generate React components
  if (type === 'page') {
    return `You are an expert React developer specializing in building data-driven UI pages.
Your task is to generate production-ready React component pages based on user requirements.

=== ARCHITECTURE ===

We use React component files (.tsx) instead of JSON configs for pages. Each page file:
- Is a standard React functional component
- Uses shadcn/ui components for UI elements
- Calls the API client for data fetching
- Exports a default function component
- Uses React hooks (useState, useEffect, useNavigate, useParams)

=== FILE STRUCTURE ===

File naming: config/pages/{module}/{page}.tsx
Export pattern: export default function {PageName}Page() { ... }

=== AVAILABLE COMPONENTS ===

Import from 'src/client/components/ui/':
- Card, CardHeader, CardTitle, CardContent, CardDescription
- Button
- Input, Textarea
- Select, SelectTrigger, SelectValue, SelectContent, SelectItem
- Table, TableHeader, TableRow, TableHead, TableBody, TableCell
- Badge
- Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle

=== API CLIENT ===

Import from 'src/client/lib/api':
- api.get(url) - GET request
- api.post(url, data) - POST request
- api.put(url, data) - PUT request
- api.delete(url) - DELETE request

All API calls return: { success: boolean, data?: any, error?: { message: string } }

=== ROUTING ===

Import from 'react-router-dom':
- useNavigate() - Programmatic navigation
- useParams() - URL parameters
- useLocation() - Current location

=== REACT PAGE EXAMPLE ===

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import api from '../../../src/client/lib/api';

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects').then(res => {
      if (res.success) {
        setProjects(res.data || []);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button onClick={() => navigate('/projects/new')}>New Project</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project: any) => (
          <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(\`/projects/\${project.id}\`)}>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

=== IMPORTANT GUIDELINES ===

1. ALWAYS export a default function component
2. Use TypeScript types for props and state (use 'any' for API data if types unknown)
3. Handle loading states with conditional rendering
4. Handle error states (empty data, API failures)
5. Use proper className for Tailwind styling (space-y-*, grid, flex, etc.)
6. Import only components that are actually used
7. Use async/await for API calls
8. Include proper form validation and error handling
9. Component naming: {Module}{PageType}Page (e.g., ProjectsListPage, TaskDetailPage)
10. Page type suffix determines file location: ProjectsListPage → config/pages/projects/list.tsx

OUTPUT REQUIREMENTS:
- Return ONLY TypeScript/React code for a single page component
- Do NOT add markdown code fences
- Do NOT add explanatory comments outside the code
- Include all necessary imports at the top
- Follow the exact patterns shown in the examples`;
  }

  // For schema/app types, use schema-driven approach
  const basePrompt = `You are an expert software engineer specializing in config-driven application development.
Your task is to generate high-quality, production-ready configuration files based on user requirements.

CRITICAL RULES:
1. Follow the EXACT JSON Schema structure (enforced via structured output)
2. Use snake_case for database table/column names
3. Use camelCase for JavaScript identifiers
4. Use kebab-case for file names and paths
5. Include proper descriptions for documentation
6. For UUID primary keys and foreign keys, ALWAYS use type "uuid", not "text"
7. NEVER create fictional API endpoints or table references - only use what exists in the provided context
8. All dataSource URLs must be non-empty and point to real API endpoints from the context

OUTPUT REQUIREMENTS:
- The output will be validated against the JSON Schema automatically
- Return valid JSON matching the schema structure
- Do NOT add markdown code fences
- Do NOT add explanatory text before or after the JSON`;

  return basePrompt;
}

/**
 * Build user prompt with feature, tasks, and context
 *
 * References: ai-config-generator.ts lines 586-645
 */
export function buildUserPrompt(
  type: ConfigType,
  feature: string,
  tasks?: string,
  context?: string
): string {
  let prompt = `Generate a ${type} configuration for the following feature:\n\n`;
  prompt += `Feature: ${feature}\n`;

  if (tasks) {
    prompt += `\nTasks/Requirements:\n${tasks}\n`;
  }

  if (context) {
    prompt += `\n=== EXISTING RESOURCES (USE ONLY THESE) ===\n\n${context}\n`;
    prompt += `\n=== CRITICAL CONSTRAINTS ===
- ONLY reference tables, APIs, and pages shown in the context above
- Do NOT invent or hallucinate any table names, API endpoints, or page references
- All foreign keys must reference tables that exist in the schema context
- All dataSource URLs must point to APIs that exist in the API context
- If the context shows no APIs, create minimal/empty dataSources
- When in doubt, leave optional fields empty rather than guessing\n`;
  }

  // Add type-specific guidance
  if (type === 'schema') {
    prompt += `\nGenerate a complete database table schema with:
- Appropriate columns and data types (CRITICAL: use "uuid" for UUID primary keys and foreign keys, NOT "text")
- Primary key with type "uuid" and defaultFn "uuid"
- Foreign keys referencing existing tables (check the context!) with type "uuid" matching the referenced column
- Timestamps: created_at and updated_at with type "timestamptz"
- Indexes for foreign keys and frequently queried columns
- Proper constraints (NOT NULL, UNIQUE, etc.)
- Snake_case for all column names`;
  } else if (type === 'api') {
    prompt += `\nGenerate a complete TypeScript route file with:
- Hono router exported as {resource}Router
- RESTful operations (GET, POST, PUT, DELETE as needed)
- Input validation for all request fields
- Database operations using Data API client with EXISTING tables only
- Proper error handling with try/catch
- Business logic checks (duplicate prevention, referential integrity)
- Consistent response format: { success, data?, error?, message? }
- Appropriate HTTP status codes (200, 201, 400, 404, 500)

Remember: Output ONLY TypeScript code, NO markdown fences, NO explanatory text.`;
  } else if (type === 'page') {
    prompt += `\nGenerate a complete React page component with:
- Imports for required shadcn/ui components
- API calls to EXISTING endpoints from the context (use api.get, api.post, etc.)
- If no relevant APIs exist, create a placeholder page with static content
- Proper TypeScript types (use 'any' for unknown API data structures)
- Loading and error states
- Responsive layout using Tailwind CSS classes
- React hooks (useState, useEffect) for state management
- Navigation using useNavigate, useParams from react-router-dom
- Form handling with proper validation if needed
- Component name MUST include page type suffix: {Module}{Type}Page

Remember: Output ONLY React/TypeScript code, NO markdown fences, NO explanatory text.`;
  }

  return prompt;
}
