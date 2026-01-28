/**
 * Route Engine
 *
 * Dynamically generates Hono API routes from JSON configs.
 * Handles:
 * - Standard CRUD operations (list, getById, create, update, delete)
 * - Custom operations with workflows
 * - Authentication and permissions
 * - Validation, filtering, sorting, pagination
 * - Relations and data transformation
 */

import { Hono, Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like, gt, gte, lt, lte, desc, asc, sql } from 'drizzle-orm';
import { getDefaultSchema } from './schema-loader';
import { WorkflowEngine, WorkflowContext } from './workflow-engine';

type Env = { Bindings: { DB: D1Database; JWT_SECRET: string } };

export interface ApiConfig {
  resource: string;
  basePath: string;
  description?: string;
  table?: string;
  auth?: {
    required?: boolean;
    permissions?: string[];
  };
  operations?: {
    list?: ListOperationConfig;
    getById?: GetByIdOperationConfig;
    create?: CreateOperationConfig;
    update?: UpdateOperationConfig;
    delete?: DeleteOperationConfig;
    custom?: CustomOperationConfig[];
  };
}

export interface ListOperationConfig {
  enabled?: boolean;
  filters?: Array<{ field: string; operator?: string; queryParam?: string }>;
  search?: { enabled?: boolean; fields?: string[] };
  sort?: {
    default?: string;
    defaultOrder?: 'asc' | 'desc';
    allowed?: string[];
  };
  pagination?: {
    enabled?: boolean;
    defaultLimit?: number;
    maxLimit?: number;
  };
  relations?: RelationConfig[];
  beforeExecute?: any;
  afterExecute?: any;
}

export interface GetByIdOperationConfig {
  enabled?: boolean;
  idField?: string;
  relations?: RelationConfig[];
  beforeExecute?: any;
  afterExecute?: any;
}

export interface CreateOperationConfig {
  enabled?: boolean;
  validation?: any;
  defaults?: Record<string, any>;
  beforeExecute?: any;
  afterExecute?: any;
}

export interface UpdateOperationConfig {
  enabled?: boolean;
  idField?: string;
  validation?: any;
  beforeExecute?: any;
  afterExecute?: any;
}

export interface DeleteOperationConfig {
  enabled?: boolean;
  idField?: string;
  softDelete?: {
    enabled?: boolean;
    field?: string;
  };
  beforeExecute?: any;
  afterExecute?: any;
}

export interface CustomOperationConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description?: string;
  validation?: any;
  workflow: any;
}

export interface RelationConfig {
  name: string;
  table: string;
  foreignKey: string;
  referencedKey?: string;
  type: 'one' | 'many';
}

/**
 * Generate Hono router from API config
 */
export function createRouterFromConfig(config: ApiConfig): Hono<Env> {
  const router = new Hono<Env>();

  // Apply auth middleware if required
  if (config.auth?.required !== false) {
    router.use('*', async (c, next) => {
      // Import and apply auth middleware
      const { authMiddleware } = await import('../middleware/auth');
      return authMiddleware(c, next);
    });
  }

  const ops = config.operations || {};

  // Register standard CRUD operations
  if (ops.list?.enabled !== false) {
    router.get('/', createListHandler(config, ops.list));
  }

  if (ops.getById?.enabled !== false) {
    const idField = ops.getById?.idField || 'id';
    router.get(`/:${idField}`, createGetByIdHandler(config, ops.getById));
  }

  if (ops.create?.enabled !== false) {
    router.post('/', createCreateHandler(config, ops.create));
  }

  if (ops.update?.enabled !== false) {
    const idField = ops.update?.idField || 'id';
    router.put(`/:${idField}`, createUpdateHandler(config, ops.update));
  }

  if (ops.delete?.enabled !== false) {
    const idField = ops.delete?.idField || 'id';
    router.delete(`/:${idField}`, createDeleteHandler(config, ops.delete));
  }

  // Register custom operations
  if (ops.custom) {
    for (const customOp of ops.custom) {
      const method = customOp.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
      router[method](customOp.path, createCustomHandler(config, customOp));
    }
  }

  return router;
}

/**
 * Create LIST handler
 */
function createListHandler(config: ApiConfig, opConfig?: ListOperationConfig) {
  return async (c: Context<Env>) => {
    try {
      const db = drizzle(c.env.DB);
      const schema = getDefaultSchema();
      const table = config.table || config.resource;
      const tableSchema = schema[table];

      if (!tableSchema) {
        return c.json({ success: false, error: `Table '${table}' not found` }, 404);
      }

      // Execute beforeExecute workflow if defined
      if (opConfig?.beforeExecute) {
        const workflowContext = buildWorkflowContext(c);
        const engine = new WorkflowEngine(workflowContext);
        const result = await engine.execute(opConfig.beforeExecute);

        if (!result.success || result.shouldReturn) {
          return c.json(result.error || result.data, result.error ? (result.error.code || 500) : 200);
        }
      }

      let query = db.select().from(tableSchema);

      // Build where conditions
      const conditions = [];

      // Filters
      if (opConfig?.filters) {
        for (const filter of opConfig.filters) {
          const paramName = filter.queryParam || filter.field;
          const value = c.req.query(paramName);

          if (value) {
            const column = tableSchema[filter.field];
            if (!column) continue;

            const operator = filter.operator || 'equals';

            switch (operator) {
              case 'equals':
                conditions.push(eq(column, value));
                break;
              case 'like':
                conditions.push(like(column, `%${value}%`));
                break;
              case 'gt':
                conditions.push(gt(column, value));
                break;
              case 'gte':
                conditions.push(gte(column, value));
                break;
              case 'lt':
                conditions.push(lt(column, value));
                break;
              case 'lte':
                conditions.push(lte(column, value));
                break;
            }
          }
        }
      }

      // Search
      if (opConfig?.search?.enabled && opConfig.search.fields) {
        const searchTerm = c.req.query('search');
        if (searchTerm) {
          const searchConditions = opConfig.search.fields.map(field => {
            const column = tableSchema[field];
            return column ? like(column, `%${searchTerm}%`) : null;
          }).filter(Boolean);

          if (searchConditions.length > 0) {
            conditions.push(or(...searchConditions));
          }
        }
      }

      // Apply where clause
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Sorting
      const sortField = c.req.query('sortBy') || opConfig?.sort?.default || 'createdAt';
      const sortOrder = c.req.query('sortOrder') || opConfig?.sort?.defaultOrder || 'desc';

      if (opConfig?.sort?.allowed && !opConfig.sort.allowed.includes(sortField)) {
        return c.json({ success: false, error: `Sorting by '${sortField}' is not allowed` }, 400);
      }

      const sortColumn = tableSchema[sortField];
      if (sortColumn) {
        query = query.orderBy(sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn));
      }

      // Pagination
      if (opConfig?.pagination?.enabled !== false) {
        const limit = Math.min(
          parseInt(c.req.query('limit') || String(opConfig?.pagination?.defaultLimit || 50)),
          opConfig?.pagination?.maxLimit || 100
        );
        const offset = parseInt(c.req.query('offset') || '0');

        query = query.limit(limit).offset(offset);
      }

      let results = await query;

      // Load relations
      if (opConfig?.relations && opConfig.relations.length > 0) {
        results = await loadRelations(db, schema, results, opConfig.relations);
      }

      // Execute afterExecute workflow if defined
      if (opConfig?.afterExecute) {
        const workflowContext = buildWorkflowContext(c, { results });
        const engine = new WorkflowEngine(workflowContext);
        const result = await engine.execute(opConfig.afterExecute);

        if (result.shouldReturn) {
          return c.json(result.error || result.data, result.error ? (result.error.code || 500) : 200);
        }

        if (result.data) {
          results = result.data;
        }
      }

      return c.json({ success: true, data: results });
    } catch (error: any) {
      console.error('List handler error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  };
}

/**
 * Create GET BY ID handler
 */
function createGetByIdHandler(config: ApiConfig, opConfig?: GetByIdOperationConfig) {
  return async (c: Context<Env>) => {
    try {
      const db = drizzle(c.env.DB);
      const schema = getDefaultSchema();
      const table = config.table || config.resource;
      const tableSchema = schema[table];

      if (!tableSchema) {
        return c.json({ success: false, error: `Table '${table}' not found` }, 404);
      }

      const idField = opConfig?.idField || 'id';
      const id = c.req.param(idField);

      // Execute beforeExecute workflow
      if (opConfig?.beforeExecute) {
        const workflowContext = buildWorkflowContext(c);
        const engine = new WorkflowEngine(workflowContext);
        const result = await engine.execute(opConfig.beforeExecute);

        if (!result.success || result.shouldReturn) {
          return c.json(result.error || result.data, result.error ? (result.error.code || 500) : 200);
        }
      }

      const [record] = await db
        .select()
        .from(tableSchema)
        .where(eq(tableSchema[idField], id))
        .limit(1);

      if (!record) {
        return c.json({ success: false, error: 'Not found' }, 404);
      }

      let result = record;

      // Load relations
      if (opConfig?.relations && opConfig.relations.length > 0) {
        [result] = await loadRelations(db, schema, [record], opConfig.relations);
      }

      // Execute afterExecute workflow
      if (opConfig?.afterExecute) {
        const workflowContext = buildWorkflowContext(c, { record: result });
        const engine = new WorkflowEngine(workflowContext);
        const workflowResult = await engine.execute(opConfig.afterExecute);

        if (workflowResult.shouldReturn) {
          return c.json(workflowResult.error || workflowResult.data, workflowResult.error ? (workflowResult.error.code || 500) : 200);
        }

        if (workflowResult.data) {
          result = workflowResult.data;
        }
      }

      return c.json({ success: true, data: result });
    } catch (error: any) {
      console.error('GetById handler error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  };
}

/**
 * Create CREATE handler
 */
function createCreateHandler(config: ApiConfig, opConfig?: CreateOperationConfig) {
  return async (c: Context<Env>) => {
    try {
      const db = drizzle(c.env.DB);
      const schema = getDefaultSchema();
      const table = config.table || config.resource;
      const tableSchema = schema[table];

      if (!tableSchema) {
        return c.json({ success: false, error: `Table '${table}' not found` }, 404);
      }

      let body = await c.req.json();

      // Merge with defaults
      if (opConfig?.defaults) {
        body = { ...opConfig.defaults, ...body };
      }

      // Add createdById if user is authenticated
      const user = (c as any).get('user');
      if (user && !body.createdById) {
        body.createdById = user.id;
      }

      // Execute beforeExecute workflow
      if (opConfig?.beforeExecute) {
        const workflowContext = buildWorkflowContext(c, { inputData: body });
        const engine = new WorkflowEngine(workflowContext);
        const result = await engine.execute(opConfig.beforeExecute);

        if (!result.success || result.shouldReturn) {
          return c.json(result.error || result.data, result.error ? (result.error.code || 500) : 200);
        }

        // Workflow might modify the data
        if (result.data) {
          body = result.data;
        }
      }

      // Generate ID if not provided
      if (!body.id) {
        body.id = crypto.randomUUID();
      }

      const [newRecord] = await db.insert(tableSchema).values(body).returning();

      // Execute afterExecute workflow
      if (opConfig?.afterExecute) {
        const workflowContext = buildWorkflowContext(c, { record: newRecord });
        const engine = new WorkflowEngine(workflowContext);
        const result = await engine.execute(opConfig.afterExecute);

        if (result.shouldReturn) {
          return c.json(result.error || result.data, result.error ? (result.error.code || 500) : 200);
        }
      }

      return c.json({ success: true, data: newRecord }, 201);
    } catch (error: any) {
      console.error('Create handler error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  };
}

/**
 * Create UPDATE handler
 */
function createUpdateHandler(config: ApiConfig, opConfig?: UpdateOperationConfig) {
  return async (c: Context<Env>) => {
    try {
      const db = drizzle(c.env.DB);
      const schema = getDefaultSchema();
      const table = config.table || config.resource;
      const tableSchema = schema[table];

      if (!tableSchema) {
        return c.json({ success: false, error: `Table '${table}' not found` }, 404);
      }

      const idField = opConfig?.idField || 'id';
      const id = c.req.param(idField);
      let body = await c.req.json();

      // Add updatedAt
      body.updatedAt = new Date().toISOString();

      // Execute beforeExecute workflow
      if (opConfig?.beforeExecute) {
        const workflowContext = buildWorkflowContext(c, { updateData: body });
        const engine = new WorkflowEngine(workflowContext);
        const result = await engine.execute(opConfig.beforeExecute);

        if (!result.success || result.shouldReturn) {
          return c.json(result.error || result.data, result.error ? (result.error.code || 500) : 200);
        }

        if (result.data) {
          body = result.data;
        }
      }

      const [updated] = await db
        .update(tableSchema)
        .set(body)
        .where(eq(tableSchema[idField], id))
        .returning();

      if (!updated) {
        return c.json({ success: false, error: 'Not found' }, 404);
      }

      // Execute afterExecute workflow
      if (opConfig?.afterExecute) {
        const workflowContext = buildWorkflowContext(c, { record: updated });
        const engine = new WorkflowEngine(workflowContext);
        const result = await engine.execute(opConfig.afterExecute);

        if (result.shouldReturn) {
          return c.json(result.error || result.data, result.error ? (result.error.code || 500) : 200);
        }
      }

      return c.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Update handler error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  };
}

/**
 * Create DELETE handler
 */
function createDeleteHandler(config: ApiConfig, opConfig?: DeleteOperationConfig) {
  return async (c: Context<Env>) => {
    try {
      const db = drizzle(c.env.DB);
      const schema = getDefaultSchema();
      const table = config.table || config.resource;
      const tableSchema = schema[table];

      if (!tableSchema) {
        return c.json({ success: false, error: `Table '${table}' not found` }, 404);
      }

      const idField = opConfig?.idField || 'id';
      const id = c.req.param(idField);

      // Execute beforeExecute workflow
      if (opConfig?.beforeExecute) {
        const workflowContext = buildWorkflowContext(c);
        const engine = new WorkflowEngine(workflowContext);
        const result = await engine.execute(opConfig.beforeExecute);

        if (!result.success || result.shouldReturn) {
          return c.json(result.error || result.data, result.error ? (result.error.code || 500) : 200);
        }
      }

      // Soft delete if configured
      if (opConfig?.softDelete?.enabled) {
        const field = opConfig.softDelete.field || 'deletedAt';
        const [updated] = await db
          .update(tableSchema)
          .set({ [field]: new Date().toISOString() })
          .where(eq(tableSchema[idField], id))
          .returning();

        if (!updated) {
          return c.json({ success: false, error: 'Not found' }, 404);
        }
      } else {
        // Hard delete
        const [deleted] = await db
          .delete(tableSchema)
          .where(eq(tableSchema[idField], id))
          .returning();

        if (!deleted) {
          return c.json({ success: false, error: 'Not found' }, 404);
        }
      }

      // Execute afterExecute workflow
      if (opConfig?.afterExecute) {
        const workflowContext = buildWorkflowContext(c);
        const engine = new WorkflowEngine(workflowContext);
        await engine.execute(opConfig.afterExecute);
      }

      return c.json({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
      console.error('Delete handler error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  };
}

/**
 * Create CUSTOM operation handler
 */
function createCustomHandler(config: ApiConfig, opConfig: CustomOperationConfig) {
  return async (c: Context<Env>) => {
    try {
      const workflowContext = buildWorkflowContext(c);
      const engine = new WorkflowEngine(workflowContext);

      const result = await engine.execute(opConfig.workflow);

      if (result.success) {
        return c.json(result.data || { success: true });
      } else {
        return c.json(result.error, result.error?.code || 500);
      }
    } catch (error: any) {
      console.error('Custom handler error:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
  };
}

/**
 * Load relations for records
 */
async function loadRelations(
  db: any,
  schema: Record<string, any>,
  records: any[],
  relations: RelationConfig[]
): Promise<any[]> {
  for (const relation of relations) {
    const relatedTable = schema[relation.table];
    if (!relatedTable) continue;

    for (const record of records) {
      const foreignKeyValue = record[relation.foreignKey];
      if (!foreignKeyValue) continue;

      const referencedKey = relation.referencedKey || 'id';

      if (relation.type === 'one') {
        const [related] = await db
          .select()
          .from(relatedTable)
          .where(eq(relatedTable[referencedKey], foreignKeyValue))
          .limit(1);

        record[relation.name] = related || null;
      } else if (relation.type === 'many') {
        const related = await db
          .select()
          .from(relatedTable)
          .where(eq(relatedTable[relation.foreignKey], record.id));

        record[relation.name] = related;
      }
    }
  }

  return records;
}

/**
 * Build workflow context from Hono context
 */
function buildWorkflowContext(c: Context<Env>, extra: Record<string, any> = {}): WorkflowContext {
  return {
    body: c.req.json ? (c.req as any)._body : undefined,
    params: c.req.param(),
    query: Object.fromEntries(new URL(c.req.url).searchParams),
    user: (c as any).get('user'),
    env: c.env,
    ...extra
  };
}
