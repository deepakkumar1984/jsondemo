#!/usr/bin/env tsx
/**
 * AI Config Generator
 *
 * Uses Cloudflare AI Gateway to generate configuration files and code for:
 * - Database schemas (config/schema/*.json) - JSON configs
 * - API routes (config/api/*.routes.ts) - TypeScript code using Hono framework
 * - UI pages (config/pages/*.json) - JSON configs with json-render components
 * - App configuration (config/apps.json) - JSON configs
 *
 * Supports multiple AI providers via Cloudflare Gateway:
 * - Anthropic Claude
 * - OpenAI GPT
 * - Google Gemini
 *
 * Output format:
 * - API type: Generates TypeScript route files (*.routes.ts)
 * - Other types: Generate JSON configs validated against JSON schemas
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { buildContext } from './dsl-converters';
import Ajv from 'ajv';
import {
  COMPREHENSIVE_SCHEMA_EXAMPLES,
  COMPREHENSIVE_APPS_EXAMPLES
} from './comprehensive-examples';

/**
 * Load environment variables from .env file
 */
function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      // Skip empty lines and comments
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // ALWAYS override with .env file value (fix for stale env vars)
        process.env[key] = value;
      }
    }
  } catch (error) {
    console.warn('Warning: Failed to load .env file:', error);
  }
}

// Load .env file at startup
loadEnvFile();

interface GenerateOptions {
  type: 'schema' | 'api' | 'page' | 'app';
  feature: string;
  tasks?: string;
  output?: string;
  apiKey?: string;
  model?: string;
  context?: string;
  debug?: boolean;
  skipValidation?: boolean;
  skipExisting?: boolean;
}

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIRequest {
  model: string;
  messages: AIMessage[];
  response_format?: {
    type: 'json_schema' | 'json_object';
    json_schema?: {
      name: string;
      strict: boolean;
      schema: any;
    };
  };
  temperature?: number;
  max_tokens?: number;
}

interface AIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    reasoning_tokens?: number; // Azure reasoning tokens
    audio_prompt_tokens?: number; // Azure audio tokens
    prompt_tokens_details?: any; // Azure token details
    completion_tokens_details?: any; // Azure token details
  };
}

/**
 * Load JSON schema format for the specified config type
 */
function loadFormatSchema(type: string): any {
  const schemaPath = join(process.cwd(), 'config', `${type == 'app' ? 'apps' : type}-format.json`);

  if (!existsSync(schemaPath)) {
    throw new Error(`Format schema not found: ${schemaPath}`);
  }

  const content = readFileSync(schemaPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Build system prompt based on config type with comprehensive examples
 */
function buildSystemPrompt(type: string): string {
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

=== TYPESCRIPT ROUTE EXAMPLES ===

--- Example 1: Basic CRUD ---

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

1. ALWAYS export the router with the pattern: export const {resource}Router = new Hono<{ Bindings: Env }>();
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
- Do NOT add markdown code fences (the output will be written directly to a .ts file)
- Do NOT add explanatory comments outside the code
- Include all necessary imports at the top
- Follow the exact patterns shown in the examples
`;
  }

  // For page type, generate React components (pure code approach)
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
- Tabs, TabsList, TabsTrigger, TabsContent
- Alert, AlertDescription
- Checkbox, Switch, RadioGroup

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

=== REACT PAGE EXAMPLES ===

--- Example 1: List Page with Data Fetching ---

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../src/client/components/ui/card';
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
              <CardDescription>{project.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

--- Example 2: Detail Page with URL Parameters ---

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Badge } from '../../../src/client/components/ui/badge';
import api from '../../../src/client/lib/api';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(\`/tasks/\${id}\`).then(res => {
      if (res.success) {
        setTask(res.data);
      }
      setLoading(false);
    });
  }, [id]);

  const handleDelete = async () => {
    if (confirm('Are you sure?')) {
      const res = await api.delete(\`/tasks/\${id}\`);
      if (res.success) {
        navigate('/tasks');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!task) return <div>Task not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{task.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(\`/tasks/\${id}/edit\`)}>Edit</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="font-medium">Status:</span>
            <Badge className="ml-2">{task.status}</Badge>
          </div>
          <div>
            <span className="font-medium">Description:</span>
            <p className="mt-1">{task.description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

--- Example 3: Form Page with State Management ---

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../src/client/components/ui/card';
import { Button } from '../../../src/client/components/ui/button';
import { Input } from '../../../src/client/components/ui/input';
import { Textarea } from '../../../src/client/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/client/components/ui/select';
import api from '../../../src/client/lib/api';

export default function TaskFormPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Todo',
    priority: 'Medium'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const res = await api.post('/tasks', formData);
    if (res.success) {
      navigate('/tasks');
    } else {
      alert(res.error?.message || 'Failed to create task');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Create Task</h1>
      <Card>
        <CardHeader>
          <CardTitle>Task Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todo">Todo</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Task'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/tasks')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

=== IMPORTANT GUIDELINES ===

1. ALWAYS export a default function component
2. Use TypeScript types for props and state (use 'any' for API data if types are unknown)
3. Handle loading states with conditional rendering
4. Handle error states (empty data, API failures)
5. Use proper className for Tailwind styling (space-y-*, grid, flex, etc.)
6. Import only components that are actually used
7. Use async/await for API calls
8. Include proper form validation and error handling
9. Use React.FormEvent for form submit handlers
10. Follow consistent naming: {Module}{PageType}Page (e.g., ProjectsListPage, TaskDetailPage, ProjectsFormPage)
    - Component names should include the page type suffix (List, Detail, Form, Create, Edit, View, Dashboard, Index)
    - This determines the file location: ProjectsListPage → config/pages/projects/list.tsx
    - TaskDetailPage → config/pages/tasks/detail.tsx

OUTPUT REQUIREMENTS:
- Return ONLY TypeScript/React code for a single page component
- Do NOT add markdown code fences (the output will be written directly to a .tsx file)
- Do NOT add explanatory comments outside the code
- Include all necessary imports at the top
- Follow the exact patterns shown in the examples
`;
  }

  // For other config types, use schema-driven approach with examples
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

  const examples = getExamplesForType(type);

  let examplesSection = '\n\n=== COMPREHENSIVE EXAMPLES ===\n\n';
  examplesSection += 'Study these examples carefully to understand patterns and best practices.\n\n';

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    examplesSection += `--- Example ${i + 1}: ${example.description} ---\n\n`;
    examplesSection += JSON.stringify(example.config, null, 2);
    examplesSection += '\n\n';
  }

  return basePrompt + examplesSection;
}

/**
 * Get comprehensive examples for a given config type
 */
function getExamplesForType(type: string): Array<{ description: string; config: any }> {
  switch (type) {
    case 'schema':
      return COMPREHENSIVE_SCHEMA_EXAMPLES;
    case 'api':
      return []; // TypeScript code generated from examples in system prompt
    case 'page':
      return []; // React component code generated from examples in system prompt
    case 'app':
      return COMPREHENSIVE_APPS_EXAMPLES;
    default:
      return [];
  }
}

/**
 * Build user prompt based on feature and task details
 */
function buildUserPrompt(type: string, feature: string, tasks?: string, context?: string): string {
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
  Examples: ProjectsListPage, TaskDetailPage, ProjectsFormPage, DashboardPage
  This determines file location: ProjectsListPage → config/pages/projects/list.tsx

Remember: Output ONLY React/TypeScript code, NO markdown fences, NO explanatory text.`;
  }

  return prompt;
}

/**
 * Extract resource name from feature or output path
 * Used to identify which existing config we're working with
 */
function extractResourceName(feature: string, output?: string): string {
  if (output) {
    // Extract from output path: config/api/tasks.json -> tasks
    const match = output.match(/\/([^/]+)\.json$/);
    if (match) return match[1];
  }

  // Extract from feature: "Tasks API" -> tasks
  const words = feature.toLowerCase()
    .replace(/\s+(api|database|schema|page|form|detail|list|table)\s*/gi, ' ')
    .trim()
    .split(/\s+/);

  return words[0] || 'unknown';
}

/**
 * Call Cloudflare AI Gateway to generate config
 */
async function generateConfig(options: GenerateOptions): Promise<any> {
  // Get Cloudflare AI Gateway configuration
  const gatewayUrl = process.env.CLOUDFLARE_AI_GATEWAY_URL;
  const model = options.model || process.env.CLOUDFLARE_MODEL || 'anthropic/claude-3-5-sonnet';

  // API Key priority: ANTHROPIC_API_KEY > OPENAI_API_KEY > CLOUDFLARE_API_TOKEN
  const apiKey = options.apiKey ||
                 process.env.ANTHROPIC_API_KEY ||
                 process.env.OPENAI_API_KEY ||
                 process.env.CLOUDFLARE_API_TOKEN || '';

  if (!gatewayUrl) {
    throw new Error(
      'CLOUDFLARE_AI_GATEWAY_URL required in .env\n' +
      'Format: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}'
    );
  }

  if (!apiKey) {
    throw new Error(
      'API key required. Set one of:\n' +
      '  - ANTHROPIC_API_KEY (for Anthropic Claude)\n' +
      '  - OPENAI_API_KEY (for OpenAI GPT)\n' +
      '  - CLOUDFLARE_API_TOKEN (if keys configured in gateway dashboard)'
    );
  }

  // Build endpoint: {gateway_url}/compat/chat/completions
  const endpoint = `https://api.x.ai/v1/chat/completions`;

  // Headers for Cloudflare AI Gateway
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.XAI_API_KEY || ''}`,
  };

  // Load format schema (not needed for API or page types - generating TypeScript code)
  const formatSchema = (options.type === 'api' || options.type === 'page') ? null : loadFormatSchema(options.type);

  // Auto-build context from existing configs (prevents AI hallucination)
  const autoContext = buildContext(options.type, {
    resourceName: extractResourceName(options.feature, options.output),
    isRegenerate: options.output ? existsSync(options.output) : false
  });

  // Combine auto context with user-provided context
  const fullContext = autoContext
    ? (options.context ? `${autoContext}\n\n${options.context}` : autoContext)
    : options.context;

  // Build prompts
  const systemPrompt = buildSystemPrompt(options.type);
  const userPrompt = buildUserPrompt(options.type, options.feature, options.tasks, fullContext);

  // STRUCTURED OUTPUT GENERATION with JSON Schema
  // For non-API types, use response_format to enforce schema compliance
  // Validation is still done as a safety check
  const maxValidationRetries = 3;
  let validConfig: any = null;
  let currentUserPrompt = userPrompt;

  for (let validationAttempt = 1; validationAttempt <= maxValidationRetries; validationAttempt++) {
    console.log(`\n🔄 Generation attempt ${validationAttempt}/${maxValidationRetries}`);

    // Prepare request with structured output when format schema is available
    const request: any = {
      model: "grok-code-fast-1",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: currentUserPrompt }
      ],
      temperature: 0.1, // Lower temperature for more consistency
      max_tokens: 128000,
      config: {
        requestTimeout: 300000 // 5 minutes timeout in milliseconds
      }
    };

    // Add response_format for structured output (non-API types only)
    if (formatSchema) {
      request.response_format = {
        type: 'json_schema',
        json_schema: {
          name: `${options.type}_config`,
          strict: true,
          schema: formatSchema
        }
      };
    }

    console.log(`🤖 Calling Cloudflare AI Gateway (${model})...`);
    console.log(`📝 Generating ${options.type} configuration for: ${options.feature}`);
    console.log(`📤 Request parameters:`);
    console.log(`   - Prompt chars: ${request.messages[0].content.length + request.messages[1].content.length}`);
    console.log(`   - Max tokens: ${request.max_tokens}`);
    console.log(`   - Temperature: ${request.temperature}`);
    console.log(`   - Approach: ${formatSchema ? 'Structured output (JSON Schema enforced)' : `Free-form (${options.type === 'page' ? 'React/TypeScript' : 'TypeScript'} code)`}`);

    // Log full request payload if debug mode
    if (options.debug) {
      console.log('\n🐛 Full request payload:');
      console.log(JSON.stringify(request, null, 2));
    }
    console.log();

    // Call API with network retry logic
    const maxNetworkRetries = 3;
    let lastError: Error | null = null;
    let response: Response | null = null;

    for (let networkAttempt = 1; networkAttempt <= maxNetworkRetries; networkAttempt++) {
      try {
        if (networkAttempt > 1) {
          const waitTime = Math.pow(2, networkAttempt - 1) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Network retry ${networkAttempt}/${maxNetworkRetries} after ${waitTime / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        response = await fetch(endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(300000) // 5 minutes timeout
        });

        // If fetch succeeded, break out of retry loop
        break;
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        console.error(`\n❌ Network error on attempt ${networkAttempt}/${maxNetworkRetries}:`);
        console.error(`   Endpoint: ${endpoint}`);
        console.error(`   Error: ${lastError.message}`);

        if (networkAttempt === maxNetworkRetries) {
          console.error(`\n💥 All ${maxNetworkRetries} network retry attempts failed`);
          throw new Error(`Network fetch failed after ${maxNetworkRetries} attempts: ${lastError.message}`);
        }
      }
    }

    if (!response) {
      throw new Error(`No response received after ${maxNetworkRetries} attempts`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API returned error status ${response.status}:`);
      console.error(`   Response: ${errorText.substring(0, 500)}`);
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    const result: AIResponse = await response.json();

    // Extract generated config
    const content = result.choices[0]?.message?.content;
    if (!content) {
      console.error('❌ No content in response. Full response:', JSON.stringify(result, null, 2));
      throw new Error('No content in API response');
    }

    console.log(`📄 Raw response length: ${content.length} characters`);

    // Debug: save raw response if debug mode enabled
    if (options.debug) {
      const debugPath = '/tmp/ai-config-debug-response.txt';
      writeFileSync(debugPath, content, 'utf-8');
      console.log(`🐛 Debug: Raw response saved to ${debugPath}`);
    }

    // Declare config variable at the top
    let config: any;

    // For API and page types, content is TypeScript/React code (not JSON)
    if (options.type === 'api' || options.type === 'page') {
      // Strip markdown code blocks if present
      let codeContent = content.trim();

      // Remove ```typescript ... ``` or ```tsx ... ``` or ``` ... ```
      if (codeContent.startsWith('```')) {
        const lines = codeContent.split('\n');
        // Remove first line (```typescript, ```tsx, ```ts, ```react, or ```)
        lines.shift();
        // Remove last line (```)
        if (lines[lines.length - 1].trim() === '```') {
          lines.pop();
        }
        codeContent = lines.join('\n').trim();
        console.log(`🔧 Stripped markdown code blocks`);
      }

      // For TypeScript/React code, the content IS the config
      config = codeContent;
      console.log(`✅ ${options.type === 'page' ? 'React component' : 'TypeScript route'} code generated successfully!`);
      validConfig = config;
      break;
    }

    // For other types, parse as JSON
    let jsonContent = content.trim();

    // Remove ```json ... ``` or ``` ... ```
    if (jsonContent.startsWith('```')) {
      const lines = jsonContent.split('\n');
      // Remove first line (```json or ```)
      lines.shift();
      // Remove last line (```)
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop();
      }
      jsonContent = lines.join('\n').trim();
      console.log(`🔧 Stripped markdown code blocks`);
    }

    // Parse JSON
    try {
      config = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error(`\n❌ JSON Parse Error:`);
      console.error(`First 500 chars of content:\n${jsonContent.substring(0, 500)}`);
      console.error(`Last 500 chars of content:\n${jsonContent.substring(Math.max(0, jsonContent.length - 500))}`);

      if (validationAttempt < maxValidationRetries) {
        console.log(`\n⚠️  Will retry with error feedback...`);
        currentUserPrompt = userPrompt + `\n\nPREVIOUS ATTEMPT FAILED WITH JSON PARSE ERROR:\n${parseError instanceof Error ? parseError.message : parseError}\n\nPlease fix the JSON syntax and generate valid JSON only.`;
        continue;
      }

      throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : parseError}`);
    }

    // Log usage with detailed breakdown
    const usage = result.usage;
    console.log(`📊 Token usage:`);
    console.log(`   📤 Prompt tokens: ${usage.prompt_tokens}`);
    console.log(`   📥 Completion tokens: ${usage.completion_tokens}`);
    console.log(`   📊 Total tokens: ${usage.total_tokens}`);
    if (usage.reasoning_tokens) {
      console.log(`   🧠 Reasoning tokens: ${usage.reasoning_tokens}`);
    }

    // VALIDATE with full JSON Schema (no limitations!)
    // Note: API type already handled above and broke out of loop
    // With structured output, validation should almost always pass
    console.log(`\n🔍 Validating against JSON schema...`);
    const ajv = new Ajv({
      strict: false,
      allowUnionTypes: true,
      allErrors: true,
      verbose: true
    });

    const validate = ajv.compile(formatSchema!);
    const isValid = validate(config);

    if (isValid) {
      console.log(`✅ Config generated and validated successfully!`);
      validConfig = config;
      break;
    }

    // Validation failed
    console.error(`\n❌ Validation failed (attempt ${validationAttempt}/${maxValidationRetries}):`);
    console.error(`   Errors:`, JSON.stringify(validate.errors, null, 2));

    if (validationAttempt < maxValidationRetries) {
      // Add validation errors to next prompt for AI to fix
      const errorSummary = validate.errors?.map((err: any) =>
        `- ${err.instancePath || 'root'}: ${err.message} (${err.keyword})`
      ).join('\n');

      console.log(`\n⚠️  Retrying with validation error feedback...`);
      currentUserPrompt = userPrompt + `\n\nPREVIOUS ATTEMPT HAD VALIDATION ERRORS:\n${errorSummary}\n\nDetailed errors:\n${JSON.stringify(validate.errors, null, 2)}\n\nPlease fix these validation errors and generate again following the examples exactly.`;
    } else {
      console.error(`\n💥 Failed to generate valid config after ${maxValidationRetries} attempts`);
      console.error(`\nLast generated config (invalid):`);
      console.error(JSON.stringify(config, null, 2));
      throw new Error(`Validation failed after ${maxValidationRetries} attempts. See errors above.`);
    }
  }

  if (!validConfig) {
    throw new Error('Failed to generate valid config - this should never happen');
  }

  console.log();
  return validConfig;
}

/**
 * Save generated config to file
 */
function saveConfig(config: any, type: string, output?: string, skipExisting?: boolean): string {
  let outputPath: string;

  if (output) {
    outputPath = output;
  } else {
    // Auto-generate output path based on type
    let configName: string;

    if (type === 'api' || type === 'page') {
      // For API/page types, config is TypeScript code (string), extract name from export/function
      if (type === 'api') {
        // Pattern: export const projectsRouter = new Hono...
        const exportMatch = config.match(/export\s+const\s+(\w+)Router/);
        configName = exportMatch ? exportMatch[1] : 'generated';
      } else {
        // Pattern: export default function ProjectsListPage() ...
        const funcMatch = config.match(/export\s+default\s+function\s+(\w+?)(?:Page)?\s*\(/);
        if (funcMatch) {
          const componentName = funcMatch[1];
          // Extract module and page type from patterns like:
          // - ProjectsListPage -> projects/list
          // - TaskDetailPage -> tasks/detail
          // - ProjectsFormPage -> projects/form
          // - DashboardPage -> dashboard/index

          // Common page type suffixes
          const pageTypes = ['List', 'Detail', 'Form', 'Create', 'Edit', 'View', 'Dashboard', 'Index'];
          let moduleName = componentName;
          let pageType = 'index';

          // Try to extract page type suffix
          for (const suffix of pageTypes) {
            if (componentName.endsWith(suffix)) {
              moduleName = componentName.slice(0, -suffix.length);
              pageType = suffix.toLowerCase();
              break;
            }
          }

          // If no suffix found but name ends with common module names, treat as index
          if (pageType === 'index' && moduleName === componentName) {
            // e.g., ProjectsPage -> projects/index
            moduleName = componentName;
          }

          // Convert PascalCase to kebab-case for both module and page
          const moduleKebab = moduleName
            .replace(/([A-Z])/g, '-$1')
            .toLowerCase()
            .replace(/^-/, '');

          configName = `${moduleKebab}/${pageType}`;
        } else {
          configName = 'generated/index';
        }
      }
    } else {
      // For JSON configs, extract from object properties
      configName = config.table || config.name || config.resource || 'generated';
    }

    // For pages, keep forward slashes for folder structure; for others, convert to kebab-case
    const fileName = type === 'page'
      ? configName.toLowerCase().replace(/\s+/g, '-')
      : configName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    console.log(`🐛 DEBUG saveConfig: type="${type}", configName="${configName}", fileName="${fileName}"`);

    if (type === 'schema') {
      outputPath = join(process.cwd(), 'config', 'schema', `${fileName}.json`);
    } else if (type === 'api') {
      // For API, save as TypeScript route file
      outputPath = join(process.cwd(), 'config', 'api', `${fileName}.routes.ts`);
    } else if (type === 'page') {
      // For page, save as React component file
      console.log(`🐛 DEBUG: type === 'page' matched, using .tsx extension`);
      outputPath = join(process.cwd(), 'config', 'pages', `${fileName}.tsx`);
    } else {
      console.log(`🐛 DEBUG: fell through to else case, type="${type}"`);
      outputPath = join(process.cwd(), 'config', `${fileName}.json`);
    }

    console.log(`🐛 DEBUG saveConfig: final outputPath="${outputPath}"`);

  }

  // Check if file exists and skip if requested
  if (skipExisting && existsSync(outputPath)) {
    console.log(`⏭️  Skipped: ${outputPath} (already exists)`);
    return outputPath;
  }

  // Ensure directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // For API and page types, config is TypeScript/React code (string), not JSON
  if (type === 'api' || type === 'page') {
    writeFileSync(outputPath, config, 'utf-8');
  } else {
    // Write file with pretty formatting for JSON configs
    writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  return outputPath;
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const options: Partial<GenerateOptions> = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--type' || arg === '-t') {
      options.type = args[++i] as any;
    } else if (arg === '--feature' || arg === '-f') {
      options.feature = args[++i];
    } else if (arg === '--tasks') {
      options.tasks = args[++i];
    } else if (arg === '--context' || arg === '-c') {
      options.context = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
    } else if (arg === '--api-key' || arg === '-k') {
      options.apiKey = args[++i];
    } else if (arg === '--model' || arg === '-m') {
      options.model = args[++i];
    } else if (arg === '--debug') {
      options.debug = true;
    } else if (arg === '--skip-validation') {
      options.skipValidation = true;
    } else if (arg === '--validate') {
      options.skipValidation = false;
    } else if (arg === '--skip-existing') {
      options.skipExisting = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printUsage();
      process.exit(1);
    }

    i++;
  }

  // Validate required options
  if (!options.type || !options.feature) {
    console.error('Error: --type and --feature are required\n');
    printUsage();
    process.exit(1);
  }

  if (!['schema', 'api', 'page', 'app'].includes(options.type)) {
    console.error(`Error: Invalid type "${options.type}". Must be: schema, api, page, or app\n`);
    process.exit(1);
  }

  try {
    // Check if file exists and skip if requested
    if (options.skipExisting && options.output && existsSync(options.output)) {
      console.log(`⏭️  Skipping: ${options.output} already exists`);
      return;
    }

    // For auto-generated paths, we need to check after determining the filename
    // This will be handled in saveConfig

    // Generate config
    const config = await generateConfig(options as GenerateOptions);

    // Save to file (includes skip-existing check for auto-generated paths)
    const outputPath = saveConfig(config, options.type, options.output, options.skipExisting);

    console.log(`✅ Configuration saved to: ${outputPath}`);

    // Show preview (TypeScript/React code for API/page, JSON for others)
    if (options.type === 'api' || options.type === 'page') {
      console.log(`\n📄 Generated ${options.type === 'page' ? 'React component' : 'TypeScript route'} preview:`);
      const codeLines = config.split('\n');
      console.log(codeLines.slice(0, 30).join('\n'));
      if (codeLines.length > 30) {
        console.log('... (truncated)');
      }
    } else {
      console.log(`\n📄 Generated config preview:`);
      console.log(JSON.stringify(config, null, 2).split('\n').slice(0, 20).join('\n'));
      if (JSON.stringify(config, null, 2).split('\n').length > 20) {
        console.log('... (truncated)');
      }
    }

    // Next steps
    console.log(`\n📋 Next steps:`);
    if (options.type === 'schema') {
      console.log(`   1. Review the generated schema: ${outputPath}`);
      console.log(`   2. Run migration: bun run db:migrate`);
      console.log(`   3. Generate API routes for this table`);
    } else if (options.type === 'api') {
      console.log(`   1. Review the generated TypeScript route: ${outputPath}`);
      console.log(`   2. Rebuild routes index: bun run build:routes-index`);
      console.log(`   3. Restart dev server`);
      console.log(`   4. Generate page config to display this data`);
    } else if (options.type === 'page') {
      console.log(`   1. Review the generated React component: ${outputPath}`);
      console.log(`   2. Add route to config/apps.json navigation items`);
      console.log(`   3. Restart dev server (Vite will pick up new files)`);
      console.log(`   4. Navigate to the page in browser`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
AI Config Generator - Generate configs using z.ai GLM API

Usage:
  tsx scripts/ai-config-generator.ts --type <type> --feature <description> [options]

Required Arguments:
  --type, -t <type>           Config type: schema, api, page, or app
  --feature, -f <description> Feature description

Optional Arguments:
  --tasks <details>           Detailed task requirements
  --context, -c <info>        Additional context or constraints
  --output, -o <path>         Output file path (auto-generated if not specified)
  --api-key, -k <key>         z.ai API key (or set ZAI_API_KEY env var)
  --model, -m <model>         Model to use (default: from ZAI_DEFAULT_MODEL or glm-4-flash)
                              Check z.ai docs for available models
                              Examples: glm-4-plus, glm-4-0520, glm-4-air, glm-4-airx
  --debug                     Enable debug logging (shows raw API response)
  --validate                  Enable JSON schema validation with retries (disabled by default)
  --skip-validation           Skip validation (default behavior, kept for compatibility)
  --skip-existing             Skip generation if output file already exists
  --help, -h                  Show this help message

Environment Variables:
  ZAI_API_KEY                 z.ai API key

Examples:

  # Generate database schema
  tsx scripts/ai-config-generator.ts \\
    --type schema \\
    --feature "Employee management system" \\
    --tasks "Track employee info, departments, roles, and salaries"

  # Generate API configuration
  tsx scripts/ai-config-generator.ts \\
    --type api \\
    --feature "Employee CRUD operations" \\
    --context "Use employees table from schema"

  # Generate page configuration
  tsx scripts/ai-config-generator.ts \\
    --type page \\
    --feature "Employee directory with search and filters"

  # Generate with custom output path
  tsx scripts/ai-config-generator.ts \\
    --type schema \\
    --feature "Task management" \\
    --output config/schema/tasks.json

  # Use specific model
  tsx scripts/ai-config-generator.ts \\
    --type api \\
    --feature "Advanced analytics API" \\
    --model glm-4-plus

Available Models:
  Check z.ai documentation for the latest available models.
  Set your preferred default model in .env:
    ZAI_DEFAULT_MODEL=glm-4-plus

  Or specify per command:
    --model glm-4-plus
`);
}

// Run CLI
main();
