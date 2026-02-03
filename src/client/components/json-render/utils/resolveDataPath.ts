/**
 * Resolve a data path using dot notation
 * @param data The data object to resolve from
 * @param path Dot-notation path (e.g., "employee.firstName")
 * @returns The resolved value or undefined
 */
export function resolveDataPath(data: Record<string, any>, path: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((obj, key) => obj?.[key], data);
}
