/**
 * Route Engine (Rewritten)
 *
 * Dynamically generates Hono API routes from operation-based JSON configs.
 * Each operation defines method, path, schemas, and actions workflow.
 *
 * Architecture:
 * - API config contains array of operations
 * - Each operation has requestSchema, responseSchema, and actions
 * - Actions are executed by ActionEngine (workflow orchestrator)
 * - NO static CRUD operations - everything is action-driven
 */

import { Hono, Context } from 'hono';
import { createDataClient, AppEnv } from '../../db/data-client';
import { ActionEngine, ActionContext } from './action-engine';

type Env = { Bindings: AppEnv };

export interface ApiConfig {
  name: string;
  version?: string;
  basePath: string;
  description?: string;
  auth?: {
    required?: boolean;
    type?: 'ApiKey' | 'OAuth' | 'JWT';
    roles?: string[];
  };
  rateLimit?: {
    requestsPerMinute?: number;
  };
  operations: Operation[];
}

export interface Operation {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  requestSchema?: JsonSchema;
  responseSchema?: JsonSchema;
  actions: Action[];
  metadata?: {
    tags?: string[];
    version?: string;
    deprecated?: boolean;
    sla?: number;
    auditEnabled?: boolean;
  };
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

export interface Action {
  type: string;
  [key: string]: any;
}

/**
 * Generate Hono router from API config
 */
export function createRouterFromConfig(config: ApiConfig): Hono<Env> {
  const router = new Hono<Env>();

  console.log(`[RouteEngine] Creating router for: ${config.name}`);
  console.log(`[RouteEngine] basePath: ${config.basePath}`);
  console.log(`[RouteEngine] operations count: ${config.operations?.length || 0}`);

  // Apply auth middleware if required
  if (config.auth?.required !== false) {
    router.use('*', async (c, next) => {
      const { authMiddleware } = await import('../middleware/auth');
      return authMiddleware(c, next);
    });
  }

  // Register all operations
  if (!config.operations || config.operations.length === 0) {
    console.warn(`[RouteEngine] No operations defined for ${config.name}`);
    return router;
  }

  // Sort operations: static paths before parameterized paths
  // This ensures /stats is matched before /:id
  const sortedOperations = [...config.operations].sort((a, b) => {
    const aHasParam = a.path.includes(':');
    const bHasParam = b.path.includes(':');
    if (aHasParam && !bHasParam) return 1;
    if (!aHasParam && bHasParam) return -1;
    return 0;
  });

  for (const operation of sortedOperations) {
    registerOperation(router, operation, config);
  }

  return router;
}

/**
 * Register a single operation as a route
 */
function registerOperation(router: Hono<Env>, operation: Operation, apiConfig: ApiConfig) {
  const method = operation.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
  const path = operation.path;

  console.log(`[RouteEngine] Registering ${operation.method} ${path} (id: ${operation.id})`);

  const handler = createOperationHandler(operation, apiConfig);

  router[method](path, handler);
}

/**
 * Create handler for an operation
 */
function createOperationHandler(operation: Operation, apiConfig: ApiConfig) {
  return async (c: Context<Env>) => {
    try {
      console.log(`[OperationHandler] Executing: ${operation.id} ${operation.method} ${operation.path}`);

      // Build action context
      const context = await buildActionContext(c, operation);

      // Validate request schema if defined
      if (operation.requestSchema) {
        const validationError = validateRequestSchema(context.body, operation.requestSchema);
        if (validationError) {
          return c.json({
            success: false,
            error: { message: validationError, status: 400 }
          }, 400);
        }
      }

      // Execute actions using ActionEngine
      const engine = new ActionEngine(context);
      const result = await engine.execute(operation.actions);

      // Handle result
      if (!result.success) {
        const status = (result.error?.status || 500) as 400 | 404 | 500;
        return c.json({
          success: false,
          error: result.error
        }, status);
      }

      // Return success response
      const status = (operation.method === 'POST' ? 201 : 200) as 200 | 201;
      return c.json({
        success: true,
        data: result.data
      }, status);

    } catch (error: any) {
      console.error(`[OperationHandler] Error in ${operation.id}:`, error);
      return c.json({
        success: false,
        error: { message: error.message, status: 500 }
      }, 500);
    }
  };
}

/**
 * Coerce types based on JSON schema
 * Converts string values to expected types (number, boolean)
 */
function coerceTypes(body: any, schema: JsonSchema): any {
  if (!schema.properties) {
    return body;
  }

  const coerced = { ...body };

  for (const [field, fieldSchema] of Object.entries(schema.properties)) {
    const value = coerced[field];

    if (value === undefined || value === null) {
      continue;
    }

    // Coerce to number
    if (fieldSchema.type === 'number' && typeof value === 'string') {
      const num = Number(value);
      if (!isNaN(num)) {
        coerced[field] = num;
      }
    }

    // Coerce to boolean
    if (fieldSchema.type === 'boolean' && typeof value === 'string') {
      coerced[field] = value === 'true' || value === '1';
    }

    // Coerce array items
    if (fieldSchema.type === 'array' && Array.isArray(value) && fieldSchema.items?.properties) {
      coerced[field] = value.map(item => {
        if (typeof item === 'object') {
          return coerceTypes(item, fieldSchema.items);
        }
        return item;
      });
    }
  }

  return coerced;
}

/**
 * Build action context from Hono context
 */
async function buildActionContext(c: Context<Env>, operation: Operation): Promise<ActionContext> {
  let body: any = undefined;

  // Parse body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(operation.method)) {
    try {
      body = await c.req.json();

      // Coerce types based on request schema
      if (operation.requestSchema && body) {
        body = coerceTypes(body, operation.requestSchema);
      }
    } catch {
      body = {};
    }
  }

  return {
    body,
    params: c.req.param(),
    query: Object.fromEntries(new URL(c.req.url).searchParams),
    user: (c as any).get('user'),
    env: c.env
  };
}

/**
 * Validate request body against JSON schema
 * Simple validation - can be enhanced with a full JSON Schema validator
 */
function validateRequestSchema(body: any, schema: JsonSchema): string | null {
  if (!body) {
    return 'Request body is required';
  }

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return `Field '${field}' is required`;
      }
    }
  }

  // Type validation for properties
  if (schema.properties) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      const value = body[field];

      if (value === undefined || value === null) {
        continue; // Only validate if present
      }

      // Type check
      if (fieldSchema.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (fieldSchema.type === 'array' && !Array.isArray(value)) {
          return `Field '${field}' must be an array`;
        }
        if (fieldSchema.type === 'object' && typeof value !== 'object') {
          return `Field '${field}' must be an object`;
        }
        if (fieldSchema.type === 'number' && typeof value !== 'number') {
          return `Field '${field}' must be a number`;
        }
        if (fieldSchema.type === 'string' && typeof value !== 'string') {
          return `Field '${field}' must be a string`;
        }
        if (fieldSchema.type === 'boolean' && typeof value !== 'boolean') {
          return `Field '${field}' must be a boolean`;
        }
      }

      // Array validation
      if (fieldSchema.items && Array.isArray(value)) {
        for (const item of value) {
          if (fieldSchema.items.type) {
            const itemType = Array.isArray(item) ? 'array' : typeof item;
            if (itemType !== fieldSchema.items.type && fieldSchema.items.type !== 'object') {
              return `Items in '${field}' must be of type ${fieldSchema.items.type}`;
            }
          }

          // Validate nested object properties
          if (fieldSchema.items.type === 'object' && fieldSchema.items.properties) {
            for (const [propName, propSchema] of Object.entries(fieldSchema.items.properties as Record<string, any>)) {
              if (propSchema.type && item[propName] !== undefined) {
                const propType = typeof item[propName];
                if (propType !== propSchema.type) {
                  return `Property '${propName}' in '${field}' items must be of type ${propSchema.type}`;
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
}
