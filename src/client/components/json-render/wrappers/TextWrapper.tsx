import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { interpolateTemplate } from '../utils/interpolateTemplate';
import { resolveDataPath } from '../utils/resolveDataPath';

export function TextWrapper({ element }: ComponentRenderProps) {
  const { data } = useData();
  const { content, contentPath, variant } = element.props as {
    content?: string;
    contentPath?: string;
    variant?: string;
  };

  let displayContent = contentPath ? resolveDataPath(data, contentPath) as string : content;

  // Interpolate templates
  if (displayContent && typeof displayContent === 'string' && displayContent.includes('{{')) {
    displayContent = interpolateTemplate(displayContent, data);
  }

  const variantClasses: Record<string, string> = {
    default: '',
    muted: 'text-muted-foreground',
    small: 'text-sm text-muted-foreground',
  };

  return <p className={variantClasses[variant || 'default']}>{displayContent}</p>;
}
