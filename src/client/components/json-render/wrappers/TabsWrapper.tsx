import type { ComponentRenderProps } from '@json-render/react';
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';

export function TabsWrapper({ element, children }: ComponentRenderProps) {
  const { tabs, defaultValue, defaultTab } = element.props as {
    tabs?: any[];
    defaultValue?: string;
    defaultTab?: string;
  };

  // Build tab triggers from props.tabs
  const tabDefs = tabs || [];
  const defaultVal = defaultValue || defaultTab || tabDefs[0]?.value;

  return (
    <Tabs defaultValue={defaultVal} className="w-full">
      <TabsList>
        {tabDefs.map((tab: any) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
