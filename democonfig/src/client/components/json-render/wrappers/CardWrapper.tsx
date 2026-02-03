import type { ComponentRenderProps } from '@json-render/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';

export function CardWrapper({ element, children }: ComponentRenderProps) {
  const { title, description, padding } = element.props as {
    title?: string;
    description?: string;
    padding?: boolean;
  };

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={padding === false ? 'p-0' : ''}>
        {children}
      </CardContent>
    </Card>
  );
}
