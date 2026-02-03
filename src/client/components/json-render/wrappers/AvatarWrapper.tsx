import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { resolveDataPath } from '../utils/resolveDataPath';

export function AvatarWrapper({ element }: ComponentRenderProps) {
  const { data } = useData();
  const { name, namePath, size } = element.props as {
    name?: string;
    namePath?: string;
    size?: string;
  };

  const displayName = namePath ? resolveDataPath(data, namePath) as string : name;
  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const sizeMap: Record<string, string> = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg'
  };
  const sizeClass = sizeMap[size || 'md'] || sizeMap.md;

  return (
    <div className={`${sizeClass} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium`}>
      {initials}
    </div>
  );
}
