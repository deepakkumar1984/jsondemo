import React from 'react';
import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { interpolateTemplate } from '../utils/interpolateTemplate';
import { resolveDataPath } from '../utils/resolveDataPath';

export function HeadingWrapper({ element }: ComponentRenderProps) {
  const { data } = useData();
  const { text, textPath, level } = element.props as {
    text?: string;
    textPath?: string;
    level?: number;
  };

  let displayText = textPath ? resolveDataPath(data, textPath) : text;

  // Interpolate templates
  if (displayText && typeof displayText === 'string' && displayText.includes('{{')) {
    displayText = interpolateTemplate(displayText, data);
  }

  const headingLevel = level || 2;
  const sizeClasses: Record<number, string> = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-medium',
    5: 'text-base font-medium',
    6: 'text-sm font-medium',
  };

  return React.createElement(
    `h${headingLevel}`,
    { className: sizeClasses[headingLevel] },
    displayText
  );
}
