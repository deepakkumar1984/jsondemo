import { getDefaultSchema as loadDefaultSchema } from './schema-loader';

/**
 * Get the schema registry
 * Uses the same registry as the route-engine to ensure consistency
 */
export function getSchemaRegistry(): Record<string, any> {
  return loadDefaultSchema();
}

// Re-export as a named constant for backwards compatibility
// Note: This is now a function getter via Proxy, not a static object
export const schemaRegistry = new Proxy({} as Record<string, any>, {
  get(target, prop) {
    const registry = loadDefaultSchema();
    return registry[prop as string];
  },
  has(target, prop) {
    const registry = loadDefaultSchema();
    return prop in registry;
  },
  ownDescriptors(target) {
    const registry = loadDefaultSchema();
    return Object.getOwnPropertyDescriptors(registry);
  }
});
