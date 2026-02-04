/**
 * DSL Converters
 *
 * Convert verbose JSON configs to compact DSL format for AI context.
 * This reduces token usage while providing essential information.
 */
/**
 * Convert schema configs to compact DSL
 * Format: TABLE table_name (column: type constraints, ...)
 */
export declare function schemaToDSL(schemaPath: string): string;
/**
 * Get all existing schemas as DSL
 */
export declare function getAllSchemasDSL(schemaDir?: string): string;
/**
 * Convert API TypeScript route file to compact DSL
 * Extracts route definitions from TypeScript code
 */
export declare function apiToDSL(apiPath: string): string;
/**
 * Get all existing APIs as DSL
 */
export declare function getAllAPIsDSL(apiDir?: string): string;
/**
 * Convert page config to compact DSL
 * Format: PAGE name { dataSources: [...], components: [...] }
 */
export declare function pageToDSL(pagePath: string): string;
/**
 * Get all existing pages as DSL
 */
export declare function getAllPagesDSL(pagesDir?: string): string;
/**
 * Get context for schema generation
 * Returns: all existing schemas in DSL format
 */
export declare function getSchemaContext(): string;
/**
 * Get context for API generation
 * Returns: schemas + existing route file content if regenerating + other APIs summary
 */
export declare function getAPIContext(resourceName: string, isRegenerate?: boolean): string;
/**
 * Get context for page generation
 * Returns: all APIs with request/response info so pages know how to call them
 */
export declare function getPageContext(): string;
/**
 * Get context for app generation
 * Returns: all pages in DSL format so app knows what pages exist
 */
export declare function getAppContext(): string;
/**
 * Build context string based on config type
 */
export declare function buildContext(type: 'schema' | 'api' | 'page' | 'app', options?: {
    resourceName?: string;
    isRegenerate?: boolean;
}): string;
//# sourceMappingURL=dsl-converters.d.ts.map