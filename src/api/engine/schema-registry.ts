/**
 * Schema Registry
 *
 * Re-exports schema loading functions from schema-loader.
 * Schema is now loaded dynamically from the Data API.
 */

export {
  loadSchemaFromApi,
  loadSchemaForApp,
  loadAllSchemas,
  getCollectionNames,
  getCollectionSchema,
  clearSchemaCache,
  exportSchema,
  importSchema,
} from './schema-loader';

export type { SchemaSource, SchemaLoaderConfig } from './schema-loader';
