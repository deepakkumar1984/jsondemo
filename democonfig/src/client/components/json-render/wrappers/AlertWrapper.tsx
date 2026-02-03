import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { Alert, AlertTitle, AlertDescription } from '../../ui/alert';
import { interpolateTemplate } from '../utils/interpolateTemplate';
import { resolveDataPath } from '../utils/resolveDataPath';

export function AlertWrapper({ element }: ComponentRenderProps) {
  const { data } = useData();
  const { title, message, variant } = element.props as {
    title?: string;
    message?: string;
    variant?: 'default' | 'destructive';
  };

  let displayMessage = message;
  if (displayMessage && typeof displayMessage === 'string' && displayMessage.includes('{{')) {
    displayMessage = interpolateTemplate(displayMessage, data);
  }

  return (
    <Alert variant={variant || 'default'} className="mb-4">
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{displayMessage}</AlertDescription>
    </Alert>
  );
}
