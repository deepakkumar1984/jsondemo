import { resolveDataPath } from './resolveDataPath';

/**
 * Interpolate {{template}} expressions in a string
 * @param template String with {{path}} expressions
 * @param data Data object to resolve paths from
 * @returns Interpolated string
 */
export function interpolateTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\S+?)\}\}/g, (_, path) => {
    const value = resolveDataPath(data, path.trim());
    return value != null ? String(value) : '';
  });
}
