import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { StatCard } from '../../ui/stat-card';
import { resolveDataPath } from '../utils/resolveDataPath';
import { interpolateTemplate } from '../utils/interpolateTemplate';

export function StatCardWrapper({ element, loading }: ComponentRenderProps) {
  const { data } = useData();
  const { label, value, valuePath, change, changeType } = element.props as {
    label?: string;
    value?: any;
    valuePath?: string;
    change?: string;
    changeType?: string;
  };

  const displayValue = valuePath ? resolveDataPath(data, valuePath) : value;

  let displayLabel = label;
  // Interpolate templates
  if (displayLabel && typeof displayLabel === 'string' && displayLabel.includes('{{')) {
    displayLabel = interpolateTemplate(displayLabel, data);
  }

  return (
    <StatCard
      label={displayLabel || ''}
      value={loading ? undefined : (displayValue ?? '—')}
      change={change}
      changeType={changeType as 'positive' | 'negative' | 'neutral' | undefined}
      loading={loading}
    />
  );
}
