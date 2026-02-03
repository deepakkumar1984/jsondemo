/**
 * Type helper to safely extract props from element.props
 * Since element.props is Record<string, unknown>, we need to cast to expected types
 */
export function getProps<T>(props: Record<string, unknown>): T {
  return props as T;
}
