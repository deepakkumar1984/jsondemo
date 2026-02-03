import type { ComponentRenderProps } from '@json-render/react';

export function GridWrapper({ element, children }: ComponentRenderProps) {
  const { columns, gap } = element.props as {
    columns?: number;
    gap?: string;
  };

  const cols = columns || 2;
  const gapMap: Record<string, string> = {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem'
  };
  const gapValue = (gap && gapMap[gap]) || (gap && !isNaN(Number(gap)) ? `${Number(gap) * 0.25}rem` : '0.5rem');

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: gapValue
      }}
    >
      {children}
    </div>
  );
}
