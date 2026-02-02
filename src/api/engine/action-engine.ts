/**
 * Action Engine
 *
 * Orchestration engine for executing typed action blocks.
 * Supports: validation, transformation, business logic, data access,
 * integrations, flow control, response mapping, and error handling.
 */

import { createDataClient } from '../../db/data-client';
import { BlazorlyDataServiceClient, QueryParams } from '../../db/BlazorlyDataServiceClient';
import {
  evaluateCondition,
  interpolateString,
  interpolateObject,
  resolveVariable,
  calculate
} from './expression-evaluator';

export interface ActionContext {
  // Request data
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  user?: any;

  // Environment
  env: any;

  // Runtime variables
  [key: string]: any;
}

export interface Action {
  type: string;
  [key: string]: any;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: { message: string; status?: number };
  shouldReturn?: boolean;
}

export class ActionEngine {
  private client: BlazorlyDataServiceClient;
  private context: ActionContext;
  private executionCount = 0;
  private maxExecutions = 1000;

  constructor(context: ActionContext) {
    this.context = context;
    this.client = createDataClient(context.env);
  }

  /**
   * Execute array of actions
   */
  async execute(actions: Action[]): Promise<ActionResult> {
    try {
      let lastResult: any = null;

      for (const action of actions) {
        if (++this.executionCount > this.maxExecutions) {
          throw new Error(`Action execution exceeded limit (${this.maxExecutions})`);
        }

        const result = await this.executeAction(action);

        if (!result.success) {
          return result;
        }

        if (result.shouldReturn) {
          return result;
        }

        lastResult = result.data;
      }

      return { success: true, data: lastResult };
    } catch (error: any) {
      console.error('[ActionEngine] Execution error:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Action execution failed',
          status: error.status || 500
        }
      };
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: Action): Promise<ActionResult> {
    console.log(`[ActionEngine] Executing action: ${action.type}`);

    switch (action.type) {
      // A. Validation
      case 'validate':
        return this.executeValidate(action);

      // B. Transformation
      case 'transform':
        return this.executeTransform(action);

      // C. Business Logic
      case 'calc':
        return this.executeCalc(action);

      case 'condition':
        return await this.executeCondition(action);

      case 'loop':
        return await this.executeLoop(action);

      // D. Data Access
      case 'db.query':
        return await this.executeDbQuery(action);

      case 'db.insert':
        return await this.executeDbInsert(action);

      case 'db.update':
        return await this.executeDbUpdate(action);

      case 'db.delete':
        return await this.executeDbDelete(action);

      case 'db.bulkInsert':
        return await this.executeDbBulkInsert(action);

      // E. Integration
      case 'http.call':
        return await this.executeHttpCall(action);

      // E2. Caching
      case 'cache.get':
        return await this.executeCacheGet(action);

      case 'cache.set':
        return await this.executeCacheSet(action);

      case 'cache.delete':
        return await this.executeCacheDelete(action);

      // F. Flow Control
      case 'transaction':
        return await this.executeTransaction(action);

      case 'parallel':
        return await this.executeParallel(action);

      // G. Response Mapping
      case 'response.map':
        return this.executeResponseMap(action);

      case 'transform.array':
        return this.executeTransformArray(action);

      // H. Error Handling
      case 'try':
        return await this.executeTry(action);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * A. VALIDATION
   */
  private executeValidate(action: Action): ActionResult {
    const { rules } = action;
    const errors: string[] = [];

    for (const rule of rules || []) {
      const { field, rule: ruleName, value, table } = rule;
      const fieldValue = resolveVariable(field, this.context);

      switch (ruleName) {
        case 'required':
          if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
            errors.push(`Field '${field}' is required`);
          }
          break;

        case 'minItems':
          if (!Array.isArray(fieldValue) || fieldValue.length < value) {
            errors.push(`Field '${field}' must have at least ${value} items`);
          }
          break;

        case 'maxItems':
          if (Array.isArray(fieldValue) && fieldValue.length > value) {
            errors.push(`Field '${field}' must have at most ${value} items`);
          }
          break;

        case 'min':
          if (typeof fieldValue === 'number' && fieldValue < value) {
            errors.push(`Field '${field}' must be at least ${value}`);
          }
          break;

        case 'max':
          if (typeof fieldValue === 'number' && fieldValue > value) {
            errors.push(`Field '${field}' must be at most ${value}`);
          }
          break;

        case 'email':
          if (typeof fieldValue === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue)) {
            errors.push(`Field '${field}' must be a valid email`);
          }
          break;

        case 'existsInDb':
          // Async validation - handled separately or marked for async validation
          // For now, skip or throw error that this needs async handling
          console.warn(`Validation rule 'existsInDb' requires async execution`);
          break;
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: { message: errors.join('; '), status: 400 },
        shouldReturn: true
      };
    }

    return { success: true };
  }

  /**
   * B. TRANSFORMATION
   */
  private executeTransform(action: Action): ActionResult {
    const { set } = action;

    for (const [key, value] of Object.entries(set || {})) {
      let resolvedValue: any;

      if (typeof value === 'string') {
        // Check for special functions
        if (value === 'now()') {
          resolvedValue = new Date().toISOString();
        } else if (value === 'uuid()') {
          resolvedValue = crypto.randomUUID();
        } else if (value.includes('{{')) {
          resolvedValue = interpolateString(value, this.context);
        } else {
          resolvedValue = value;
        }
      } else {
        resolvedValue = interpolateObject(value, this.context);
      }

      // Support nested key setting (e.g., "body.status")
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = this.context;

        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }

        current[parts[parts.length - 1]] = resolvedValue;
      } else {
        this.context[key] = resolvedValue;
      }
    }

    return { success: true };
  }

  /**
   * C. BUSINESS LOGIC - Calc
   */
  private executeCalc(action: Action): ActionResult {
    const { set } = action;

    for (const [key, expression] of Object.entries(set || {})) {
      let result: any;

      if (typeof expression === 'string') {
        // Handle special functions
        if (expression.startsWith('sum(')) {
          const match = expression.match(/sum\(([^,)]+)(?:,\s*['"']?(\w+)['"']?)?\)/);
          if (match) {
            const arrayPath = match[1].trim();
            const fieldName = match[2]; // e.g., 'hours'
            const array = resolveVariable(arrayPath, this.context);

            if (Array.isArray(array)) {
              if (fieldName) {
                // Sum a specific field: sum(entries, 'hours')
                result = array.reduce((sum, item) => {
                  const val = item[fieldName];
                  return sum + (typeof val === 'number' ? val : 0);
                }, 0);
              } else {
                // Sum array values directly: sum(numbers)
                result = array.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
              }
            } else {
              result = 0;
            }
          }
        } else if (expression.includes('{{')) {
          // Interpolate and calculate
          const interpolated = interpolateString(expression, this.context);
          try {
            result = calculate(interpolated, this.context);
          } catch {
            result = interpolated;
          }
        } else {
          // Direct calculation
          try {
            result = calculate(expression, this.context);
          } catch {
            result = expression;
          }
        }
      } else {
        result = expression;
      }

      // Set in context
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = this.context;

        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }

        current[parts[parts.length - 1]] = result;
      } else {
        this.context[key] = result;
      }
    }

    return { success: true };
  }

  /**
   * C. BUSINESS LOGIC - Condition
   */
  private async executeCondition(action: Action): Promise<ActionResult> {
    const { if: condition, then: thenActions, else: elseActions } = action;

    let conditionMet = false;

    if (typeof condition === 'string') {
      // First, interpolate template variables
      const interpolated = interpolateString(condition, this.context);

      // Then evaluate the expression (handles comparisons, logic, etc.)
      try {
        const result = calculate(interpolated, this.context);
        conditionMet = Boolean(result);
      } catch (error) {
        // If expression evaluation fails, do simple truthy check
        conditionMet = !!interpolated && interpolated !== 'false' && interpolated !== '0';
      }
    } else {
      // Object-style condition
      conditionMet = evaluateCondition(condition, this.context);
    }

    if (conditionMet && thenActions) {
      return await this.execute(thenActions);
    } else if (!conditionMet && elseActions) {
      return await this.execute(elseActions);
    }

    return { success: true };
  }

  /**
   * C. BUSINESS LOGIC - Loop
   */
  private async executeLoop(action: Action): Promise<ActionResult> {
    const { over, steps } = action;

    const items = resolveVariable(over, this.context);

    if (!Array.isArray(items)) {
      throw new Error(`Loop 'over' must reference an array, got: ${typeof items}`);
    }

    const results = [];

    for (const item of items) {
      // Set item in context
      this.context.item = item;

      const result = await this.execute(steps);

      if (!result.success) {
        return result;
      }

      results.push(result.data);
    }

    return { success: true, data: results };
  }

  /**
   * D. DATA ACCESS - Query
   */
  private async executeDbQuery(action: Action): Promise<ActionResult> {
    const { table, sql, where, into, limit, offset, joins, select, orderBy } = action;

    // Handle raw SQL queries
    if (sql) {
      const interpolatedSql = interpolateString(sql, this.context);
      
      try {
        const result = await this.client.rawQuery(interpolatedSql);
        
        const data = result.data || [];
        
        if (into) {
          this.context[into] = data;
        }
        
        return { success: true, data };
      } catch (error: any) {
        console.error('[ActionEngine] Raw SQL query failed:', error);
        return {
          success: false,
          error: {
            message: `SQL query failed: ${error.message}`,
            status: 500
          }
        };
      }
    }

    const interpolatedWhere = where ? interpolateObject(where, this.context) : {};

    const queryParams: QueryParams = {
      filter: this.buildFilter(interpolatedWhere)
    };

    // Handle joins - convert from api-format.json format to client format
    if (joins && joins.length > 0) {
      queryParams.joins = joins.map((join: any) => ({
        table: join.table,
        type: join.type as 'LEFT' | 'INNER' | 'RIGHT',
        on: {
          local: Object.keys(join.on)[0].split('.').pop() || '', // Extract field name from 'table.field'
          foreign: Object.values(join.on)[0].split('.').pop() || ''
        },
        alias: join.as,
        fields: select // Use select fields for joined tables if provided
      }));
    }

    // Handle limit with template expression support
    if (limit !== undefined) {
      if (typeof limit === 'string') {
        const interpolatedLimit = interpolateString(limit, this.context);
        queryParams.limit = parseInt(interpolatedLimit, 10);
      } else {
        queryParams.limit = limit;
      }
    }

    // Handle offset with template expression support
    if (offset !== undefined) {
      if (typeof offset === 'string') {
        const interpolatedOffset = interpolateString(offset, this.context);
        queryParams.offset = parseInt(interpolatedOffset, 10);
      } else {
        queryParams.offset = offset;
      }
    }

    // Handle select fields
    if (select && select.length > 0) {
      queryParams.fields = select;
    }

    // Handle orderBy - convert to Data API format
    if (orderBy && orderBy.length > 0) {
      queryParams.sort = orderBy.map(o => {
        const direction = o.direction === 'DESC' ? '-' : '';
        return `${direction}${o.field}`;
      });
    }

    const result = await this.client.getItems(table, queryParams);

    const data = queryParams.limit === 1 ? result.data[0] : result.data;

    if (into) {
      this.context[into] = data;
    }

    return { success: true, data };
  }

  /**
   * D. DATA ACCESS - Insert
   */
  private async executeDbInsert(action: Action): Promise<ActionResult> {
    const { table, map, returning } = action;

    let interpolatedData = interpolateObject(map, this.context);

    // Handle special functions in the mapped data
    interpolatedData = this.processSpecialFunctions(interpolatedData);

    // Generate ID if not provided
    if (!interpolatedData.id) {
      interpolatedData.id = crypto.randomUUID();
    }

    const result = await this.client.createItem(table, interpolatedData);

    if (returning) {
      this.context[returning] = result.id || interpolatedData.id;
    }

    return { success: true, data: result };
  }

  /**
   * D. DATA ACCESS - Update
   */
  private async executeDbUpdate(action: Action): Promise<ActionResult> {
    const { table, where, map } = action;

    const interpolatedWhere = interpolateObject(where, this.context);
    let interpolatedData = interpolateObject(map, this.context);

    // Handle special functions
    interpolatedData = this.processSpecialFunctions(interpolatedData);

    // Find record by where clause
    const queryParams: QueryParams = {
      filter: this.buildFilter(interpolatedWhere),
      limit: 1
    };

    const findResult = await this.client.getItems(table, queryParams);

    if (findResult.data.length === 0) {
      return {
        success: false,
        error: { message: 'Record not found', status: 404 },
        shouldReturn: true
      };
    }

    const recordId = findResult.data[0].id;
    if (!recordId) {
      return {
        success: false,
        error: { message: 'Record ID not found', status: 404 },
        shouldReturn: true
      };
    }

    const result = await this.client.updateItem(table, recordId, interpolatedData);

    return { success: true, data: result };
  }

  /**
   * D. DATA ACCESS - Delete
   */
  private async executeDbDelete(action: Action): Promise<ActionResult> {
    const { table, where } = action;

    const interpolatedWhere = interpolateObject(where, this.context);

    // Find record by where clause
    const queryParams: QueryParams = {
      filter: this.buildFilter(interpolatedWhere),
      limit: 1
    };

    const findResult = await this.client.getItems(table, queryParams);

    if (findResult.data.length === 0) {
      return {
        success: false,
        error: { message: 'Record not found', status: 404 },
        shouldReturn: true
      };
    }

    const recordId = findResult.data[0].id;
    if (!recordId) {
      return {
        success: false,
        error: { message: 'Record ID not found', status: 404 },
        shouldReturn: true
      };
    }

    await this.client.deleteItem(table, recordId);

    return { success: true, data: { deleted: true } };
  }

  /**
   * D. DATA ACCESS - Bulk Insert
   */
  private async executeDbBulkInsert(action: Action): Promise<ActionResult> {
    const { table, mapEach, from } = action;

    const items = resolveVariable(from, this.context);

    if (!Array.isArray(items)) {
      throw new Error(`bulkInsert 'from' must reference an array`);
    }

    const results = [];

    for (const item of items) {
      this.context.item = item;

      let interpolatedData = interpolateObject(mapEach, this.context);

      // Handle special functions
      interpolatedData = this.processSpecialFunctions(interpolatedData);

      // Generate ID if not provided
      if (!interpolatedData.id) {
        interpolatedData.id = crypto.randomUUID();
      }

      const result = await this.client.createItem(table, interpolatedData);
      results.push(result);
    }

    return { success: true, data: results };
  }

  /**
   * E. INTEGRATION - HTTP Call
   */
  private async executeHttpCall(action: Action): Promise<ActionResult> {
    const { method, url, headers, body, into } = action;

    const interpolatedUrl = interpolateString(url, this.context);
    const interpolatedHeaders = headers ? interpolateObject(headers, this.context) : {};
    const interpolatedBody = body ? interpolateObject(body, this.context) : undefined;

    const response = await fetch(interpolatedUrl, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...interpolatedHeaders
      },
      body: interpolatedBody ? JSON.stringify(interpolatedBody) : undefined
    });

    const result = await response.json();

    if (into) {
      this.context[into] = result;
    }

    return { success: true, data: result };
  }

  /**
   * F. FLOW CONTROL - Transaction
   */
  private async executeTransaction(action: Action): Promise<ActionResult> {
    const { steps, onError } = action;

    try {
      return await this.execute(steps);
    } catch (error: any) {
      if (onError) {
        return await this.execute(onError);
      }
      throw error;
    }
  }

  /**
   * F. FLOW CONTROL - Parallel
   */
  private async executeParallel(action: Action): Promise<ActionResult> {
    const { actions } = action;

    const promises = actions.map((a: Action) => this.executeAction(a));
    const results = await Promise.all(promises);

    // Check if any failed
    const failed = results.find(r => !r.success);
    if (failed) {
      return failed;
    }

    return { success: true, data: results.map(r => r.data) };
  }

  /**
   * Transform array items (field name mapping)
   */
  private executeTransformArray(action: Action): ActionResult {
    const { from, fieldMap } = action;

    const array = resolveVariable(from, this.context);

    if (!Array.isArray(array)) {
      throw new Error(`transform.array 'from' must reference an array`);
    }

    const transformed = array.map(item => {
      const mapped: Record<string, any> = {};

      for (const [newKey, oldKey] of Object.entries(fieldMap || {})) {
        mapped[newKey] = item[oldKey as string];
      }

      // Include fields not in mapping as-is
      for (const [key, value] of Object.entries(item)) {
        if (!Object.values(fieldMap).includes(key)) {
          mapped[key] = value;
        }
      }

      return mapped;
    });

    return { success: true, data: transformed };
  }

  /**
   * G. RESPONSE MAPPING
   */
  private executeResponseMap(action: Action): ActionResult {
    const { fields } = action;

    const mappedData: Record<string, any> = {};

    for (const [key, expression] of Object.entries(fields || {})) {
      if (typeof expression === 'string' && expression.includes('{{')) {
        // Check if it's a pure variable reference (e.g., "{{entries}}" or "{{entries.length}}")
        const match = expression.match(/^\{\{(.+?)\}\}$/);
        if (match) {
          // Pure variable reference - return the actual value (could be array, object, etc.)
          mappedData[key] = resolveVariable(match[1].trim(), this.context);
        } else {
          // Template string with text - interpolate as string
          mappedData[key] = interpolateString(expression as string, this.context);
        }
      } else {
        mappedData[key] = interpolateObject(expression, this.context);
      }
    }

    return {
      success: true,
      data: mappedData,
      shouldReturn: true
    };
  }

  /**
   * H. ERROR HANDLING - Try/Catch
   */
  private async executeTry(action: Action): Promise<ActionResult> {
    const { try: tryActions, catch: catchActions } = action;

    try {
      return await this.execute(tryActions);
    } catch (error: any) {
      if (catchActions) {
        this.context.error = {
          message: error.message,
          stack: error.stack
        };
        return await this.execute(catchActions);
      }
      throw error;
    }
  }

  /**
   * Process special functions like uuid() and now()
   */
  private processSpecialFunctions(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.processSpecialFunctions(item));
    }

    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Handle special functions
        if (value === 'uuid()') {
          processed[key] = crypto.randomUUID();
        } else if (value === 'now()') {
          processed[key] = new Date().toISOString();
        } else {
          processed[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        processed[key] = this.processSpecialFunctions(value);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  /**
   * E2. CACHING - Cache Get
   */
  private async executeCacheGet(action: Action): Promise<ActionResult> {
    const { key, into } = action;

    const interpolatedKey = interpolateString(key, this.context);

    // Access KV namespace from env
    const cache = this.context.env?.CACHE;

    if (!cache) {
      console.warn('[ActionEngine] Cache not available in environment');
      if (into) {
        this.context[into] = null;
      }
      return { success: true, data: null };
    }

    try {
      const value = await cache.get(interpolatedKey, { type: 'json' });

      if (into) {
        this.context[into] = value;
      }

      return { success: true, data: value };
    } catch (error: any) {
      console.error('[ActionEngine] Cache get error:', error);
      if (into) {
        this.context[into] = null;
      }
      return { success: true, data: null };
    }
  }

  /**
   * E2. CACHING - Cache Set
   */
  private async executeCacheSet(action: Action): Promise<ActionResult> {
    const { key, value, ttl } = action;

    const interpolatedKey = interpolateString(key, this.context);
    const interpolatedValue = typeof value === 'string' && value.includes('{{')
      ? resolveVariable(value.replace(/{{|}}/g, '').trim(), this.context)
      : interpolateObject(value, this.context);

    // Access KV namespace from env
    const cache = this.context.env?.CACHE;

    if (!cache) {
      console.warn('[ActionEngine] Cache not available in environment');
      return { success: true, data: null };
    }

    try {
      const options: any = {};
      if (ttl) {
        options.expirationTtl = ttl;
      }

      await cache.put(
        interpolatedKey,
        JSON.stringify(interpolatedValue),
        options
      );

      return { success: true, data: { cached: true } };
    } catch (error: any) {
      console.error('[ActionEngine] Cache set error:', error);
      return { success: true, data: { cached: false } };
    }
  }

  /**
   * E2. CACHING - Cache Delete
   */
  private async executeCacheDelete(action: Action): Promise<ActionResult> {
    const { key, pattern } = action;

    // Access KV namespace from env
    const cache = this.context.env?.CACHE;

    if (!cache) {
      console.warn('[ActionEngine] Cache not available in environment');
      return { success: true, data: null };
    }

    try {
      if (pattern) {
        // Pattern-based deletion (list and delete)
        const interpolatedPattern = interpolateString(pattern, this.context);
        const list = await cache.list({ prefix: interpolatedPattern.replace('*', '') });
        
        for (const item of list.keys) {
          await cache.delete(item.name);
        }

        return { success: true, data: { deleted: list.keys.length } };
      } else {
        // Single key deletion
        const interpolatedKey = interpolateString(key, this.context);
        await cache.delete(interpolatedKey);

        return { success: true, data: { deleted: 1 } };
      }
    } catch (error: any) {
      console.error('[ActionEngine] Cache delete error:', error);
      return { success: true, data: { deleted: 0 } };
    }
  }

  /**
   * Build Data API filter from where clause
   */
  private buildFilter(where: Record<string, any>): Record<string, any> {
    const filter: Record<string, any> = {};

    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        filter[key] = { _null: true };
      } else if (typeof value === 'object' && value.$gt) {
        filter[key] = { _gt: value.$gt };
      } else if (typeof value === 'object' && value.$gte) {
        filter[key] = { _gte: value.$gte };
      } else if (typeof value === 'object' && value.$lt) {
        filter[key] = { _lt: value.$lt };
      } else if (typeof value === 'object' && value.$lte) {
        filter[key] = { _lte: value.$lte };
      } else if (typeof value === 'object' && value.$ne) {
        filter[key] = { _neq: value.$ne };
      } else if (typeof value === 'object' && value.$in) {
        filter[key] = { _in: value.$in };
      } else {
        filter[key] = { _eq: value };
      }
    }

    return filter;
  }
}
