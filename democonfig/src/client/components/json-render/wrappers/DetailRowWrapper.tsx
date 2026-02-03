import React from 'react';
import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { Badge } from '../../ui/badge';
import { resolveDataPath } from '../utils/resolveDataPath';

export function DetailRowWrapper({ element }: ComponentRenderProps) {
  const { data } = useData();
  const { label, valuePath, value, format, template, render } = element.props as {
    label?: string;
    valuePath?: string;
    value?: any;
    format?: string;
    template?: string;
    render?: { type: string; props?: any };
  };

  let displayValue = valuePath ? resolveDataPath(data, valuePath) : value;

  // Handle template (e.g., "{{employee.firstName}} {{employee.lastName}}")
  if (template) {
    displayValue = template.replace(/\{\{(\S+?)\}\}/g, (_: string, path: string) => {
      const resolved = resolveDataPath(data, path);
      return resolved != null ? String(resolved) : '';
    }).trim();
  }

  let displayNode: React.ReactNode = displayValue ?? '—';

  // Format handlers
  if (format === 'date' && displayValue) {
    displayNode = new Date(displayValue).toLocaleDateString();
  }
  if (format === 'currency' && displayValue) {
    displayNode = `$${Number(displayValue).toLocaleString()}`;
  }

  // Handle render prop (e.g., Badge rendering)
  if (render && typeof render === 'object' && render.type === 'Badge') {
    const pathToUse = render.props?.valuePath || render.props?.labelPath;
    const badgeValue = pathToUse ? resolveDataPath(data, pathToUse) : displayValue;
    const strVal = String(badgeValue || '');
    const colorMap = render.props?.colorMap || {};
    const variant = colorMap[strVal] || render.props?.variant || 'default';
    displayNode = <Badge variant={variant as any}>{strVal.replace(/_/g, ' ')}</Badge>;
  }

  return (
    <div className="flex py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground w-40 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium">
        {typeof displayNode === 'string' ? displayNode : displayNode}
      </span>
    </div>
  );
}
