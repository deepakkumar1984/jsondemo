import type { ComponentRenderProps } from '@json-render/react';
import { TabsContent } from '../../ui/tabs';

export function TabPanelWrapper({ element, children }: ComponentRenderProps) {
  const { value, id } = element.props as {
    value?: string;
    id?: string;
  };
  const tabValue = value || id || '';

  return <TabsContent value={tabValue}>{children}</TabsContent>;
}
