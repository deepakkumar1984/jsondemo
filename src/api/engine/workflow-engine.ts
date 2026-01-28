/**
 * Workflow Engine
 *
 * Executes workflow steps defined in API configs.
 * Supports: db queries, conditionals, loops, validations, transformations, HTTP requests
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, and, or, like, gt, gte, lt, lte, desc, asc, sql } from 'drizzle-orm';
import { getDefaultSchema } from './schema-loader';
import {
  evaluateCondition,
  evaluateExpression,
  resolveVariable,
  interpolateString,
  interpolateObject,
  calculate
} from './expression-evaluator';

export interface WorkflowContext {
  // Request data
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: any;

  // Environment bindings
  env: any;

  // Runtime variables set during workflow execution
  [key: string]: any;
}

export interface WorkflowConfig {
  steps: WorkflowStep[];
  onError?: 'rollback' | 'continue' | 'return_error';
}

export interface WorkflowStep {
  id?: string;
  type: string;
  [key: string]: any;
}

export interface WorkflowResult {
  success: boolean;
  data?: any;
  error?: { message: string; code: number };
  shouldReturn?: boolean; // Whether to immediately return this result
}

export class WorkflowEngine {
  private db: any;
  private schema: Record<string, any>;
  private context: WorkflowContext;
  private stepExecutionCount = 0;
  private maxSteps = 1000; // Safety limit

  constructor(context: WorkflowContext) {
    this.context = context;
    this.db = drizzle(context.env.DB);
    this.schema = getDefaultSchema();
  }

  /**
   * Execute a workflow configuration
   */
  async execute(workflow: WorkflowConfig): Promise<WorkflowResult> {
    try {
      const result = await this.executeSteps(workflow.steps);

      if (result.shouldReturn) {
        return result;
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error: any) {
      console.error('Workflow execution error:', error);

      const onError = workflow.onError || 'return_error';

      if (onError === 'return_error') {
        return {
          success: false,
          error: {
            message: error.message || 'Workflow execution failed',
            code: error.code || 500
          }
        };
      }

      throw error;
    }
  }

  /**
   * Execute a sequence of steps
   */
  private async executeSteps(steps: WorkflowStep[]): Promise<WorkflowResult> {
    let lastResult: any = null;

    for (const step of steps) {
      // Safety: prevent infinite loops
      if (++this.stepExecutionCount > this.maxSteps) {
        throw new Error(`Workflow exceeded maximum step limit (${this.maxSteps})`);
      }

      const result = await this.executeStep(step);

      if (result.shouldReturn) {
        return result;
      }

      lastResult = result.data;
    }

    return { success: true, data: lastResult };
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep): Promise<WorkflowResult> {
    switch (step.type) {
      case 'db_query':
        return await this.executeDbQuery(step.db_query || step);

      case 'db_transaction':
        return await this.executeTransaction(step.transaction || step);

      case 'check_exists':
        return await this.executeCheckExists(step.check_exists || step);

      case 'conditional':
        return await this.executeConditional(step.conditional || step);

      case 'foreach':
        return await this.executeForeach(step.foreach || step);

      case 'while':
        return await this.executeWhile(step.while || step);

      case 'set_variable':
        return this.executeSetVariable(step.set_variable || step);

      case 'transform':
        return this.executeTransform(step.transform || step);

      case 'http_request':
        return await this.executeHttpRequest(step.http_request || step);

      case 'validate':
        return this.executeValidate(step.validate || step);

      case 'return_response':
        return this.executeReturnResponse(step.return_response || step);

      case 'return_error':
        return this.executeReturnError(step.return_error || step);

      case 'log':
        console.log('[Workflow Log]', interpolateString(step.message || '', this.context));
        return { success: true };

      default:
        throw new Error(`Unknown workflow step type: ${step.type}`);
    }
  }

  /**
   * Execute a database query
   */
  private async executeDbQuery(config: any): Promise<WorkflowResult> {
    const { action, table, where, data, select, orderBy, limit, storeAs } = config;

    const tableSchema = this.schema[table];
    if (!tableSchema) {
      throw new Error(`Table not found: ${table}`);
    }

    let query;
    let result;

    // Interpolate variables in config
    const interpolatedWhere = where ? interpolateObject(where, this.context) : null;
    const interpolatedData = data ? interpolateObject(data, this.context) : null;

    switch (action) {
      case 'select': {
        query = this.db.select().from(tableSchema);

        if (interpolatedWhere) {
          query = query.where(this.buildWhereClause(tableSchema, interpolatedWhere));
        }

        if (orderBy) {
          const orderFn = orderBy.order === 'desc' ? desc : asc;
          query = query.orderBy(orderFn(tableSchema[orderBy.field]));
        }

        if (limit) {
          query = query.limit(limit);
        }

        result = limit === 1 ? await query.then(rows => rows[0]) : await query;
        break;
      }

      case 'insert': {
        result = await this.db.insert(tableSchema).values(interpolatedData).returning();
        result = result[0]; // Return single inserted record
        break;
      }

      case 'update': {
        if (!interpolatedWhere) {
          throw new Error('Update requires a where clause for safety');
        }

        result = await this.db
          .update(tableSchema)
          .set(interpolatedData)
          .where(this.buildWhereClause(tableSchema, interpolatedWhere))
          .returning();

        result = result[0]; // Return first updated record
        break;
      }

      case 'delete': {
        if (!interpolatedWhere) {
          throw new Error('Delete requires a where clause for safety');
        }

        result = await this.db
          .delete(tableSchema)
          .where(this.buildWhereClause(tableSchema, interpolatedWhere))
          .returning();

        break;
      }

      case 'count': {
        query = this.db.select({ count: sql`COUNT(*)` }).from(tableSchema);

        if (interpolatedWhere) {
          query = query.where(this.buildWhereClause(tableSchema, interpolatedWhere));
        }

        const [{ count }] = await query;
        result = parseInt(count as string);
        break;
      }

      default:
        throw new Error(`Unknown db action: ${action}`);
    }

    // Store result in context if requested
    if (storeAs) {
      this.context[storeAs] = result;
    }

    return { success: true, data: result };
  }

  /**
   * Build Drizzle where clause from object
   */
  private buildWhereClause(tableSchema: any, where: Record<string, any>): any {
    const conditions = [];

    for (const [key, value] of Object.entries(where)) {
      const column = tableSchema[key];
      if (!column) continue;

      if (value === null) {
        conditions.push(sql`${column} IS NULL`);
      } else if (typeof value === 'object' && value.$like) {
        conditions.push(like(column, value.$like));
      } else if (typeof value === 'object' && value.$gt) {
        conditions.push(gt(column, value.$gt));
      } else if (typeof value === 'object' && value.$gte) {
        conditions.push(gte(column, value.$gte));
      } else if (typeof value === 'object' && value.$lt) {
        conditions.push(lt(column, value.$lt));
      } else if (typeof value === 'object' && value.$lte) {
        conditions.push(lte(column, value.$lte));
      } else {
        conditions.push(eq(column, value));
      }
    }

    return conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  /**
   * Execute a database transaction
   */
  private async executeTransaction(config: any): Promise<WorkflowResult> {
    // For now, execute steps sequentially
    // TODO: Implement proper D1 transactions when available
    return await this.executeSteps(config.steps);
  }

  /**
   * Check if a record exists
   */
  private async executeCheckExists(config: any): Promise<WorkflowResult> {
    const { table, where, onExists, onNotExists, error } = config;

    const tableSchema = this.schema[table];
    if (!tableSchema) {
      throw new Error(`Table not found: ${table}`);
    }

    const interpolatedWhere = interpolateObject(where, this.context);

    const result = await this.db
      .select()
      .from(tableSchema)
      .where(this.buildWhereClause(tableSchema, interpolatedWhere))
      .limit(1);

    const exists = result.length > 0;

    if (exists && onExists) {
      if (onExists === 'return_error') {
        return {
          success: false,
          error: error || { message: 'Record already exists', code: 409 },
          shouldReturn: true
        };
      }
      // TODO: Handle jump to step by ID
    } else if (!exists && onNotExists) {
      if (onNotExists === 'return_error') {
        return {
          success: false,
          error: error || { message: 'Record not found', code: 404 },
          shouldReturn: true
        };
      }
      // TODO: Handle jump to step by ID
    }

    return { success: true, data: exists };
  }

  /**
   * Execute conditional logic
   */
  private async executeConditional(config: any): Promise<WorkflowResult> {
    const { condition, then: thenSteps, elif, else: elseSteps } = config;

    // Evaluate main condition
    if (evaluateCondition(condition, this.context)) {
      return await this.executeSteps(thenSteps || []);
    }

    // Evaluate elif conditions
    if (elif && Array.isArray(elif)) {
      for (const branch of elif) {
        if (evaluateCondition(branch.condition, this.context)) {
          return await this.executeSteps(branch.then || []);
        }
      }
    }

    // Execute else branch
    if (elseSteps) {
      return await this.executeSteps(elseSteps);
    }

    return { success: true };
  }

  /**
   * Execute foreach loop
   */
  private async executeForeach(config: any): Promise<WorkflowResult> {
    const { items, as, steps, collectAs } = config;

    const itemsArray = resolveVariable(items, this.context);

    if (!Array.isArray(itemsArray)) {
      throw new Error(`foreach items must be an array, got: ${typeof itemsArray}`);
    }

    const results = [];

    for (const item of itemsArray) {
      // Set current item in context
      this.context[as] = item;

      const result = await this.executeSteps(steps);

      if (result.shouldReturn) {
        return result;
      }

      results.push(result.data);
    }

    // Collect results if requested
    if (collectAs) {
      this.context[collectAs] = results;
    }

    return { success: true, data: results };
  }

  /**
   * Execute while loop
   */
  private async executeWhile(config: any): Promise<WorkflowResult> {
    const { condition, steps, maxIterations = 100 } = config;

    const results = [];
    let iterations = 0;

    while (evaluateCondition(condition, this.context)) {
      if (++iterations > maxIterations) {
        throw new Error(`While loop exceeded maximum iterations (${maxIterations})`);
      }

      const result = await this.executeSteps(steps);

      if (result.shouldReturn) {
        return result;
      }

      results.push(result.data);
    }

    return { success: true, data: results };
  }

  /**
   * Set a variable in context
   */
  private executeSetVariable(config: any): WorkflowResult {
    const { name, value } = config;

    let resolvedValue = value;

    // If value is a string, check if it's an expression or variable reference
    if (typeof value === 'string') {
      if (value.includes('{{')) {
        resolvedValue = interpolateString(value, this.context);
      } else if (value.match(/^[\w.]+$/)) {
        // Simple variable reference
        resolvedValue = resolveVariable(value, this.context);
      }
      // Try to evaluate as expression (e.g., "total * 1.1")
      else if (value.match(/[+\-*/%]/)) {
        try {
          resolvedValue = calculate(value, this.context);
        } catch {
          // If calculation fails, use as literal
          resolvedValue = value;
        }
      }
    }

    this.context[name] = resolvedValue;

    return { success: true, data: resolvedValue };
  }

  /**
   * Transform data
   */
  private executeTransform(config: any): WorkflowResult {
    const { input, output, operation, expression } = config;

    const inputData = resolveVariable(input, this.context);
    let result;

    switch (operation) {
      case 'map':
        if (!Array.isArray(inputData)) {
          throw new Error('map operation requires an array');
        }
        // Simple field extraction for now
        result = inputData.map(item => resolveVariable(expression, { item, ...this.context }));
        break;

      case 'filter':
        if (!Array.isArray(inputData)) {
          throw new Error('filter operation requires an array');
        }
        result = inputData.filter(item =>
          evaluateExpression(expression, { item, ...this.context })
        );
        break;

      case 'sum':
        if (!Array.isArray(inputData)) {
          throw new Error('sum operation requires an array');
        }
        result = inputData.reduce((sum, item) => {
          const value = resolveVariable(expression, { item, ...this.context });
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        break;

      case 'count':
        result = Array.isArray(inputData) ? inputData.length : 0;
        break;

      case 'merge':
        result = Object.assign({}, inputData, resolveVariable(expression, this.context));
        break;

      default:
        throw new Error(`Unknown transform operation: ${operation}`);
    }

    this.context[output] = result;

    return { success: true, data: result };
  }

  /**
   * Execute HTTP request
   */
  private async executeHttpRequest(config: any): Promise<WorkflowResult> {
    const { url, method, headers, body, storeAs } = config;

    const interpolatedUrl = interpolateString(url, this.context);
    const interpolatedHeaders = interpolateObject(headers || {}, this.context);
    const interpolatedBody = interpolateObject(body, this.context);

    const response = await fetch(interpolatedUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...interpolatedHeaders
      },
      body: interpolatedBody ? JSON.stringify(interpolatedBody) : undefined
    });

    const result = await response.json();

    if (storeAs) {
      this.context[storeAs] = result;
    }

    return { success: true, data: result };
  }

  /**
   * Validate data
   */
  private executeValidate(config: any): WorkflowResult {
    const { data, rules, onError = 'return_error' } = config;

    const dataToValidate = resolveVariable(data, this.context);
    const errors: string[] = [];

    if (rules.required) {
      for (const field of rules.required) {
        if (dataToValidate[field] === undefined || dataToValidate[field] === null || dataToValidate[field] === '') {
          errors.push(`Field '${field}' is required`);
        }
      }
    }

    if (rules.fields) {
      for (const [field, fieldRules] of Object.entries(rules.fields as any)) {
        const value = dataToValidate[field];

        if (value !== undefined && value !== null) {
          // Type validation
          if (fieldRules.type) {
            const valid = this.validateType(value, fieldRules.type);
            if (!valid) {
              errors.push(`Field '${field}' must be of type ${fieldRules.type}`);
            }
          }

          // Min/max validation
          if (fieldRules.min !== undefined) {
            const length = typeof value === 'string' ? value.length : value;
            if (length < fieldRules.min) {
              errors.push(`Field '${field}' must be at least ${fieldRules.min}`);
            }
          }

          if (fieldRules.max !== undefined) {
            const length = typeof value === 'string' ? value.length : value;
            if (length > fieldRules.max) {
              errors.push(`Field '${field}' must be at most ${fieldRules.max}`);
            }
          }

          // Enum validation
          if (fieldRules.enum && !fieldRules.enum.includes(value)) {
            errors.push(`Field '${field}' must be one of: ${fieldRules.enum.join(', ')}`);
          }

          // Pattern validation
          if (fieldRules.pattern) {
            const regex = new RegExp(fieldRules.pattern);
            if (!regex.test(String(value))) {
              errors.push(`Field '${field}' does not match required pattern`);
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      if (onError === 'return_error') {
        return {
          success: false,
          error: { message: errors.join('; '), code: 400 },
          shouldReturn: true
        };
      }
    }

    return { success: true };
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'uuid':
        return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      case 'date':
        return !isNaN(Date.parse(value));
      default:
        return true;
    }
  }

  /**
   * Return response immediately
   */
  private executeReturnResponse(config: any): WorkflowResult {
    const { data, status = 200, wrap = true } = config;

    let responseData;

    if (typeof data === 'string') {
      responseData = resolveVariable(data, this.context);
    } else {
      responseData = interpolateObject(data, this.context);
    }

    if (wrap) {
      return {
        success: true,
        data: { success: true, data: responseData },
        shouldReturn: true
      };
    }

    return {
      success: true,
      data: responseData,
      shouldReturn: true
    };
  }

  /**
   * Return error immediately
   */
  private executeReturnError(config: any): WorkflowResult {
    const { message, code = 400 } = config;

    const interpolatedMessage = interpolateString(message, this.context);

    return {
      success: false,
      error: { message: interpolatedMessage, code },
      shouldReturn: true
    };
  }
}
