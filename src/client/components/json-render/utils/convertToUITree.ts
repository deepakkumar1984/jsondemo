import { UITree, UIElement } from '@json-render/core';

/**
 * Convert nested page config format to flat UITree structure
 * @param nestedConfig Page config with nested children
 * @returns Flat UITree with elements map
 */
export function convertToUITree(nestedConfig: any): UITree {
  const elements: Record<string, UIElement> = {};
  let counter = 0;

  function traverse(node: any, parentKey: string | null): string {
    const key = `element-${counter++}`;

    // Recursively process children first to get their keys
    const childKeys = node.children?.map((child: any) => traverse(child, key)) || [];

    elements[key] = {
      key,
      type: node.type,
      props: node.props || {},
      children: childKeys.length > 0 ? childKeys : undefined,
      parentKey
    };

    return key;
  }

  // Wrap children in a root Stack element
  const rootKey = traverse(
    {
      type: 'Stack',
      props: { direction: 'vertical', gap: 'lg' },
      children: nestedConfig.children || []
    },
    null
  );

  return { root: rootKey, elements };
}
