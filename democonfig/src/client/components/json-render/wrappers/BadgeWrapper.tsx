import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { Badge } from '../../ui/badge';
import { interpolateTemplate } from '../utils/interpolateTemplate';
import { resolveDataPath } from '../utils/resolveDataPath';

export function BadgeWrapper({ element }: ComponentRenderProps) {
  const { data } = useData();
  const { label, valuePath, variant, colorMap } = element.props as {
    label?: string;
    valuePath?: string;
    variant?: string;
    colorMap?: Record<string, string>;
  };

  let value = valuePath ? resolveDataPath(data, valuePath) as string : label;

  // Interpolate templates
  if (value && typeof value === 'string' && value.includes('{{')) {
    value = interpolateTemplate(value, data);
  }

  let displayVariant: any = variant || 'default';
  if (colorMap && value) {
    displayVariant = (colorMap as Record<string, string>)[value] || displayVariant;
  }

  return <Badge variant={displayVariant}>{value}</Badge>;
}
