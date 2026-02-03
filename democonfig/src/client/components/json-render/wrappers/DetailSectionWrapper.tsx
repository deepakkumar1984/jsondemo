import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { interpolateTemplate } from '../utils/interpolateTemplate';

export function DetailSectionWrapper({ element, children }: ComponentRenderProps) {
  const { data } = useData();
  let { title } = element.props as {
    title?: string;
  };

  // Interpolate templates
  if (title && typeof title === 'string' && title.includes('{{')) {
    title = interpolateTemplate(title, data);
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 pb-2 border-b">{title}</h3>
      {children}
    </div>
  );
}
