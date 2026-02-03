import type { ComponentRenderProps } from '@json-render/react';
import { useData, useActions } from '@json-render/react';
import { Button } from '../../ui/button';
import { resolveDataPath } from '../utils/resolveDataPath';
import { interpolateTemplate } from '../utils/interpolateTemplate';

export function PageHeaderWrapper({ element }: ComponentRenderProps) {
  const { data } = useData();
  const { execute } = useActions();
  const { title, subtitle, actions, textPath, titleParts } = element.props as {
    title?: string;
    subtitle?: string;
    actions?: any[];
    textPath?: string;
    titleParts?: any[];
  };

  let displayTitle = textPath ? resolveDataPath(data, textPath) : title;

  // Support titleParts: [{textPath: "..."}, {text: " "}, ...]
  if (titleParts && Array.isArray(titleParts)) {
    displayTitle = titleParts
      .map((part: any) => {
        if (part.textPath) return resolveDataPath(data, part.textPath) ?? '';
        return part.text ?? '';
      })
      .join('');
  }

  // Interpolate subtitle templates
  let displaySubtitle = subtitle;
  if (displaySubtitle && typeof displaySubtitle === 'string' && displaySubtitle.includes('{{')) {
    displaySubtitle = interpolateTemplate(displaySubtitle, data);
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{displayTitle || title || 'Page'}</h1>
        {displaySubtitle && <p className="text-muted-foreground mt-1">{displaySubtitle}</p>}
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions.map((act: any, i: number) => {
            const variantMap: Record<string, any> = {
              danger: 'destructive',
              primary: 'default'
            };
            const variant = variantMap[act.variant] || act.variant || 'default';

            return (
              <Button
                key={i}
                variant={variant}
                onClick={() => execute({ name: act.action.type, params: act.action })}
              >
                {act.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
