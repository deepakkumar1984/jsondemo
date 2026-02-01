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
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
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

    console.log(`[DataClient] Request: ${options.method || 'GET'} ${url.toString()}`);

    const fetchOptions = {
      ...options,
      body: isGetRequest ? undefined : options.body, // Don't pass body for GET requests
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    console.log(`[DataClient] Fetch options:`, JSON.stringify({
      method: fetchOptions.method,
      headers: fetchOptions.headers,
      body: fetchOptions.body
    }, null, 2));

    const response = await fetch(url, fetchOptions);

    const data = await response.json();

    if (!response.ok) {
      const errors: ApiError[] = data.errors || [{ message: response.statusText }];
      const errorMessage = errors.map((e) => e.message).join(', ');
      console.error(`[DataClient] ERROR: ${options.method || 'GET'} ${url}`);
      console.error(`[DataClient] Status: ${response.status} ${response.statusText}`);
      console.error(`[DataClient] Response:`, JSON.stringify(data, null, 2));
      throw new Error(errorMessage);
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
   * @param collectionName - The name of the collection to update
   * @param collection - The updated collection data
   * @returns Promise resolving to the updated collection
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
  // ITEM METHODS
  // ============================================

  /**
   * Get items from a collection
   * @param collectionName - The name of the collection
   * @param params - Query parameters for filtering, sorting, pagination
   * @returns Promise resolving to items and metadata
   */
  async getItems(
    collectionName: string,
    params?: QueryParams
  ): Promise<ItemsResult> {
    const response = await this.request<any>(`/items/${collectionName}`, {
      method: 'GET',
      body: params as any,
    });
    // API returns { data: Item[], meta: {...} } directly, not wrapped in ApiResponse
    return response as ItemsResult;
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
    console.log(`[DataClient] updateItem called:`, { collectionName, id, item });
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

// ============================================
// USAGE EXAMPLE
// ============================================

/**
 * Example usage:
 * ```typescript
 * import { BlazorlyDataServiceClient } from './BlazorlyDataServiceClient';
 * 
 * // Initialize client
 * const client = new BlazorlyDataServiceClient({
 *   baseUrl: 'https://your-api.example.com',
 *   apiKey: 'your-api-key',
 *   tenantId: 'your-tenant-id'
 * });
 * 
 * // Get all collections
 * const collections = await client.getCollections();
 * 
 * // Get items with filtering
 * const users = await client.getItems('users', {
 *   limit: 10,
 *   filter: { status: { _eq: 'active' } }
 * });
 * 
 * // Create an item
 * const user = await client.createItem('users', {
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 * ```
 */
