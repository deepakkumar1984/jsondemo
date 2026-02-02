// ============================================
// BLAZORLY DATA SERVICE CLIENT
// Single-file TypeScript implementation
// Copy this file to your project to use
// ============================================

// ============================================
// TYPES
// ============================================

/**
 * Field types supported by the API
 */
export type FieldType =
  | 'string'
  | 'text'
  | 'integer'
  | 'bigInteger'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'timestamp'
  | 'json'
  | 'uuid'
  | 'hash';

/**
 * Field interface defining a collection field
 */
export interface Field {
  field: string;
  type: FieldType;
  schema?: {
    is_primary_key?: boolean;
    has_auto_increment?: boolean;
    is_nullable?: boolean;
    is_unique?: boolean;
    default_value?: any;
    max_length?: number;
    foreign_key_table?: string;
    foreign_key_column?: string;
    on_update?: string;
    on_delete?: string;
  };
  meta?: {
    hidden?: boolean;
    readonly?: boolean;
    interface?: string;
    options?: any;
    display?: string;
    display_options?: any;
    required?: boolean;
  };
}

/**
 * Collection interface defining a collection schema
 */
export interface Collection {
  collection: string;
  meta?: {
    icon?: string;
    note?: string;
    display_template?: string;
    hidden?: boolean;
    singleton?: boolean;
    translations?: any[];
  };
  schema: {
    name: string;
  };
  fields: Field[];
}

/**
 * Item (record) in a collection
 */
export interface Item {
  id?: number | string;
  [key: string]: any;
}

/**
 * JOIN configuration for multi-table queries
 */
export interface JoinConfig {
  table: string;                    // Table to join with
  type?: 'LEFT' | 'INNER' | 'RIGHT'; // Join type (default: LEFT)
  on: {
    local: string;                  // Local field (e.g., 'user_id')
    foreign: string;                // Foreign field (e.g., 'id')
  };
  alias?: string;                   // Optional table alias
  fields?: string[];                // Fields to select from joined table
}

/**
 * Query parameters for fetching items
 */
export interface QueryParams {
  limit?: number;
  offset?: number;
  page?: number;
  sort?: string[];
  filter?: any;
  fields?: string[];
  search?: string;
  deep?: any;
  aliases?: any;
  export?: string;
  joins?: JoinConfig[];             // JOIN operations across tables
}

/**
 * Schema export/import format
 */
export interface SchemaExport {
  version: string;
  collections: Collection[];
}

/**
 * API response format
 */
export interface ApiResponse<T> {
  data: T;
  errors?: ApiError[];
  meta?: any;
}

/**
 * Error format from API
 */
export interface ApiError {
  message: string;
  field?: string;
}

/**
 * Client configuration options
 */
export interface ClientConfig {
  baseUrl: string;
  apiKey?: string;
  tenantId?: string;
  database?: string;
  headers?: Record<string, string>;
}

/**
 * Items query result with metadata
 */
export interface ItemsResult {
  data: Item[];
  meta: {
    total?: number;
    limit?: number;
    offset?: number;
    page?: number;
    collection: string;
  };
}

// ============================================
// MAIN CLIENT CLASS
// ============================================

/**
 * BlazorlyDataServiceClient - A utility client for calling Blazorly Data API endpoints
 *
 * @example
 * ```typescript
 * const client = new BlazorlyDataServiceClient({
 *   baseUrl: 'https://your-api.example.com',
 *   apiKey: 'your-api-key',
 *   tenantId: 'your-tenant-id'
 * });
 * ```
 */
export class BlazorlyDataServiceClient {
  private baseUrl: string;
  private apiKey?: string;
  private tenantId?: string;
  private database?: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.tenantId = config.tenantId;
    this.database = config.database;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (this.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${this.apiKey}`;
    }
  }

  /**
   * Build URL with optional query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (this.tenantId) {
      url.searchParams.append('tenant', this.tenantId);
    }

    if (this.database) {
      url.searchParams.append('database', this.database);
    }

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value === null) {
            url.searchParams.append(key, '');
          } else if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    return url.toString();
  }

  /**
   * Make a fetch request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // For GET requests, extract body params to URL and remove body from options
    const isGetRequest = !options.method || options.method === 'GET';
    const url = this.buildUrl(endpoint, isGetRequest ? options.body as any : undefined);

    const response = await fetch(url, {
      ...options,
      body: isGetRequest ? undefined : options.body, // Don't pass body for GET requests
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errors: ApiError[] = data.errors || [{ message: response.statusText }];
      throw new Error(errors.map((e) => e.message).join(', '));
    }

    return data;
  }

  // ============================================
  // COLLECTION METHODS
  // ============================================

  /**
   * Get all collections
   * @returns Promise resolving to array of collections
   */
  async getCollections(): Promise<Collection[]> {
    const response = await this.request<Collection[]>('/collections');
    return response.data;
  }

  /**
   * Get a specific collection by name
   * @param collectionName - The name of the collection
   * @returns Promise resolving to the collection
   */
  async getCollection(collectionName: string): Promise<Collection> {
    const response = await this.request<Collection>(`/collections/${collectionName}`);
    return response.data;
  }

  /**
   * Create a new collection
   * @param collection - The collection data
   * @returns Promise resolving to the created collection
   */
  async createCollection(collection: Collection): Promise<Collection> {
    const response = await this.request<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
    });
    return response.data;
  }

  /**
   * Update an existing collection
   *
   * Note: This method now supports schema evolution. When you add new fields
   * to the collection, they will be automatically added to the database table
   * using ALTER TABLE operations.
   *
   * @param collectionName - The name of the collection to update
   * @param collection - The updated collection data
   * @returns Promise resolving to the updated collection
   *
   * @example
   * ```typescript
   * // Add new fields to an existing collection
   * const updatedCollection = await client.updateCollection('users', {
   *   collection: 'users',
   *   schema: { name: 'users' },
   *   fields: [
   *     // ... existing fields
   *     { field: 'username', type: 'string' },  // New field - will be added!
   *     { field: 'bio', type: 'text' }           // New field - will be added!
   *   ]
   * });
   * ```
   */
  async updateCollection(
    collectionName: string,
    collection: Collection
  ): Promise<Collection> {
    const response = await this.request<Collection>(`/collections/${collectionName}`, {
      method: 'PATCH',
      body: JSON.stringify(collection),
    });
    return response.data;
  }

  /**
   * Delete a collection
   * @param collectionName - The name of the collection to delete
   * @returns Promise resolving when collection is deleted
   */
  async deleteCollection(collectionName: string): Promise<void> {
    await this.request<{ message: string }>(`/collections/${collectionName}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // FIELD METHODS (Schema Evolution)
  // ============================================

  /**
   * Add a new field to an existing collection
   *
   * This method adds a single field to a collection using ALTER TABLE.
   * The field will be added to both the database table and the collection metadata.
   *
   * @param collectionName - The name of the collection
   * @param field - The field definition
   * @returns Promise resolving to the created field
   *
   * @example
   * ```typescript
   * await client.addField('users', {
   *   field: 'bio',
   *   type: 'text',
   *   schema: { is_nullable: true }
   * });
   * ```
   */
  async addField(collectionName: string, field: Field): Promise<Field> {
    const response = await this.request<Field>(`/fields/${collectionName}`, {
      method: 'POST',
      body: JSON.stringify(field),
    });
    return response.data;
  }

  /**
   * Add a new field to a collection (alternative method with collection in body)
   *
   * @param fieldData - The field data including collection name
   * @returns Promise resolving to the created field
   *
   * @example
   * ```typescript
   * await client.createField({
   *   collection: 'users',
   *   field: 'bio',
   *   type: 'text',
   *   schema: { is_nullable: true }
   * });
   * ```
   */
  async createField(fieldData: Field & { collection: string }): Promise<Field> {
    const response = await this.request<Field>('/fields', {
      method: 'POST',
      body: JSON.stringify(fieldData),
    });
    return response.data;
  }

  /**
   * Delete a field from a collection
   *
   * This method removes a field using ALTER TABLE DROP COLUMN.
   * The field will be removed from both the database table and collection metadata.
   * Note: Primary key fields cannot be deleted.
   *
   * @param collectionName - The name of the collection
   * @param fieldName - The name of the field to delete
   * @returns Promise resolving when field is deleted
   *
   * @example
   * ```typescript
   * await client.deleteField('users', 'old_field');
   * ```
   */
  async deleteField(collectionName: string, fieldName: string): Promise<void> {
    await this.request<{ message: string }>(`/fields/${collectionName}/${fieldName}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // ITEM METHODS
  // ============================================

  /**
   * Get items from a collection
   *
   * Supports JOIN operations when params.joins is provided.
   * When joins are present, this method builds and executes a SQL query internally.
   *
   * @param collectionName - The name of the collection
   * @param params - Query parameters for filtering, sorting, pagination, and joins
   * @returns Promise resolving to items and metadata
   *
   * @example
   * ```typescript
   * // Simple query without joins
   * const users = await client.getItems('users', {
   *   filter: { status: { _eq: 'active' } },
   *   limit: 10
   * });
   *
   * // Query with JOIN
   * const usersWithProjects = await client.getItems('users', {
   *   joins: [{
   *     table: 'projects',
   *     type: 'LEFT',
   *     on: { local: 'id', foreign: 'user_id' },
   *     alias: 'p',
   *     fields: ['title', 'status']
   *   }],
   *   filter: { 'users.status': { _eq: 'active' } }
   * });
   * ```
   */
  async getItems(
    collectionName: string,
    params?: QueryParams
  ): Promise<ItemsResult> {
    // If joins are present, use raw SQL query instead
    if (params?.joins && params.joins.length > 0) {
      return this.getItemsWithJoins(collectionName, params);
    }

    // Standard getItems without joins
    const response = await this.request<any>(`/items/${collectionName}`, {
      method: 'GET',
      body: params as any,
    });
    // API returns { data: Item[], meta: {...} } directly, not wrapped in ApiResponse
    return response as ItemsResult;
  }

  /**
   * Internal method to handle queries with JOINs
   * Builds SQL and executes via rawQuery
   */
  private async getItemsWithJoins(
    collectionName: string,
    params: QueryParams
  ): Promise<ItemsResult> {
    const joins = params.joins || [];

    // Build SELECT clause
    const mainTableAlias = 'main';
    let selectFields: string[] = [];

    // Main table fields
    if (params.fields && params.fields.length > 0) {
      selectFields = params.fields.map(f =>
        f.includes('.') ? f : `${mainTableAlias}.${f}`
      );
    } else {
      selectFields.push(`${mainTableAlias}.*`);
    }

    // Joined table fields
    joins.forEach((join, idx) => {
      const joinAlias = join.alias || `j${idx}`;
      if (join.fields && join.fields.length > 0) {
        join.fields.forEach(field => {
          // Prefix with table alias and use AS to avoid name conflicts
          selectFields.push(`${joinAlias}.${field} AS "${joinAlias}_${field}"`);
        });
      } else {
        // Select all fields with prefix
        selectFields.push(`${joinAlias}.*`);
      }
    });

    // Build FROM clause
    let sql = `SELECT ${selectFields.join(', ')}\nFROM ${collectionName} AS ${mainTableAlias}`;

    // Build JOIN clauses
    const sqlParams: any[] = [];
    let paramIndex = 1;

    joins.forEach((join, idx) => {
      const joinType = join.type || 'LEFT';
      const joinAlias = join.alias || `j${idx}`;
      sql += `\n${joinType} JOIN ${join.table} AS ${joinAlias} ON ${mainTableAlias}.${join.on.local} = ${joinAlias}.${join.on.foreign}`;
    });

    // Build WHERE clause from filter
    if (params.filter && Object.keys(params.filter).length > 0) {
      const whereConditions: string[] = [];

      for (const [field, condition] of Object.entries(params.filter)) {
        // Handle field with table prefix (e.g., 'users.status')
        const fieldName = field.includes('.') ? field : `${mainTableAlias}.${field}`;

        if (typeof condition === 'object' && condition !== null) {
          // Handle operators like { _eq: 'value' }
          for (const [op, value] of Object.entries(condition)) {
            if (op === '_eq') {
              whereConditions.push(`${fieldName} = $${paramIndex++}`);
              sqlParams.push(value);
            } else if (op === '_neq') {
              whereConditions.push(`${fieldName} != $${paramIndex++}`);
              sqlParams.push(value);
            } else if (op === '_gt') {
              whereConditions.push(`${fieldName} > $${paramIndex++}`);
              sqlParams.push(value);
            } else if (op === '_gte') {
              whereConditions.push(`${fieldName} >= $${paramIndex++}`);
              sqlParams.push(value);
            } else if (op === '_lt') {
              whereConditions.push(`${fieldName} < $${paramIndex++}`);
              sqlParams.push(value);
            } else if (op === '_lte') {
              whereConditions.push(`${fieldName} <= $${paramIndex++}`);
              sqlParams.push(value);
            } else if (op === '_in') {
              const placeholders = (value as any[]).map(() => `$${paramIndex++}`).join(', ');
              whereConditions.push(`${fieldName} IN (${placeholders})`);
              sqlParams.push(...value);
            } else if (op === '_null') {
              whereConditions.push(`${fieldName} IS ${value ? 'NULL' : 'NOT NULL'}`);
            }
          }
        } else {
          // Direct equality
          whereConditions.push(`${fieldName} = $${paramIndex++}`);
          sqlParams.push(condition);
        }
      }

      if (whereConditions.length > 0) {
        sql += `\nWHERE ${whereConditions.join(' AND ')}`;
      }
    }

    // Build ORDER BY clause
    if (params.sort && params.sort.length > 0) {
      const orderClauses = params.sort.map(sortField => {
        if (sortField.startsWith('-')) {
          const field = sortField.substring(1);
          const fieldName = field.includes('.') ? field : `${mainTableAlias}.${field}`;
          return `${fieldName} DESC`;
        } else {
          const fieldName = sortField.includes('.') ? sortField : `${mainTableAlias}.${sortField}`;
          return `${fieldName} ASC`;
        }
      });
      sql += `\nORDER BY ${orderClauses.join(', ')}`;
    }

    // Build LIMIT and OFFSET
    if (params.limit) {
      sql += `\nLIMIT $${paramIndex++}`;
      sqlParams.push(params.limit);
    }

    if (params.offset) {
      sql += `\nOFFSET $${paramIndex++}`;
      sqlParams.push(params.offset);
    }

    // Execute raw query
    const response = await this.rawQuery(sql, sqlParams);

    // Return in ItemsResult format
    return {
      data: response.data || [],
      meta: {
        total: response.data?.length || 0,
        limit: params.limit,
        offset: params.offset,
        collection: collectionName
      }
    };
  }

  /**
   * Get a single item by ID
   * @param collectionName - The name of the collection
   * @param id - The ID of the item
   * @returns Promise resolving to the item
   */
  async getItem(collectionName: string, id: string | number): Promise<Item> {
    const response = await this.request<Item>(
      `/items/${collectionName}/${id}`
    );
    return response.data;
  }

  /**
   * Create a new item in a collection
   * @param collectionName - The name of the collection
   * @param item - The item data
   * @returns Promise resolving to the created item
   */
  async createItem(collectionName: string, item: Item): Promise<Item> {
    const response = await this.request<Item>(`/items/${collectionName}`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return response.data;
  }

  /**
   * Update an existing item
   * @param collectionName - The name of the collection
   * @param id - The ID of the item to update
   * @param item - The updated item data
   * @returns Promise resolving to the updated item
   */
  async updateItem(
    collectionName: string,
    id: string | number,
    item: Item
  ): Promise<Item> {
    const response = await this.request<Item>(
      `/items/${collectionName}/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(item),
      }
    );
    return response.data;
  }

  /**
   * Delete an item
   * @param collectionName - The name of the collection
   * @param id - The ID of the item to delete
   * @returns Promise resolving when item is deleted
   */
  async deleteItem(collectionName: string, id: string | number): Promise<void> {
    await this.request<{ message: string }>(`/items/${collectionName}/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Execute a raw SQL query
   *
   * This method allows executing raw SQL queries for complex operations
   * like JOINs, aggregations, or custom queries that can't be expressed
   * through the standard CRUD methods.
   *
   * @param sql - The SQL query string (can include placeholders)
   * @param params - Optional parameters for the query (for parameterized queries)
   * @returns Promise resolving to query results
   *
   * @example
   * ```typescript
   * // Simple SELECT
   * const users = await client.rawQuery('SELECT * FROM users WHERE status = $1', ['active']);
   *
   * // JOIN query
   * const results = await client.rawQuery(`
   *   SELECT u.*, p.title
   *   FROM users u
   *   LEFT JOIN projects p ON u.id = p.user_id
   *   WHERE u.status = $1
   * `, ['active']);
   *
   * // Aggregation
   * const stats = await client.rawQuery(`
   *   SELECT COUNT(*) as total, status
   *   FROM projects
   *   GROUP BY status
   * `);
   * ```
   */
  async rawQuery(sql: string, params?: any[]): Promise<ApiResponse<any[]>> {
    const response = await this.request<any[]>('/query/raw', {
      method: 'POST',
      body: JSON.stringify({ sql, params: params || [] }),
    });
    return response;
  }

  // ============================================
  // SCHEMA METHODS
  // ============================================

  /**
   * Export the entire schema
   * @returns Promise resolving to the schema export
   */
  async exportSchema(): Promise<SchemaExport> {
    const response = await this.request<SchemaExport>('/schema');
    return response.data;
  }

  /**
   * Import a schema
   * @param schema - The schema to import
   * @returns Promise resolving to import result
   */
  async importSchema(schema: SchemaExport): Promise<{
    message: string;
    collections_imported: number;
  }> {
    const response = await this.request<{
      message: string;
      collections_imported: number;
    }>('/schema', {
      method: 'POST',
      body: JSON.stringify(schema),
    });
    return response.data;
  }

  /**
   * Create a snapshot (export to JSON file)
   * @returns Promise resolving to the schema snapshot as JSON string
   */
  async createSnapshot(): Promise<string> {
    const url = this.buildUrl('/schema/snapshot');
    const response = await fetch(url, {
      headers: this.defaultHeaders,
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      const errors: ApiError[] = data.errors || [{ message: response.statusText }];
      throw new Error(errors.map((e) => e.message).join(', '));
    }

    return await response.text();
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if the API is accessible
   * @returns Promise resolving to API health information
   */
  async healthCheck(): Promise<any> {
    const url = this.buildUrl('/');
    const response = await fetch(url, {
      headers: this.defaultHeaders,
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update the API key
   * @param apiKey - The new API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.defaultHeaders['Authorization'] = `Bearer ${apiKey}`;
  }

  /**
   * Update the tenant ID
   * @param tenantId - The new tenant ID
   */
  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  /**
   * Add custom headers to all requests
   * @param headers - The headers to add
   */
  setHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };
  }
}
