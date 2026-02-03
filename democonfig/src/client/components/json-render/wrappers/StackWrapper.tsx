import type { ComponentRenderProps } from '@json-render/react';

export function StackWrapper({ element, children }: ComponentRenderProps) {
  const { direction, gap, justify } = element.props as {
    direction?: string;
    gap?: string;
    justify?: string;
  };

  const dir = direction === 'horizontal' ? 'flex-row' : 'flex-col';
  const gapMap: Record<string, string> = {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem'
  };
  const gapValue = (gap && gapMap[gap]) || (gap && !isNaN(Number(gap)) ? `${Number(gap) * 0.25}rem` : '1rem');

  const justifyMap: Record<string, string> = {
    'flex-start': 'flex-start',
    'flex-end': 'flex-end',
    'center': 'center',
    'space-between': 'space-between',
    'space-around': 'space-around',
    'space-evenly': 'space-evenly',
    'start': 'flex-start',
    'end': 'flex-end',
  };
  const justifyValue = justify ? (justifyMap[justify] || justify) : undefined;

  return (
    <div
      className="flex"
      style={{
        flexDirection: dir === 'flex-row' ? 'row' : 'column',
        gap: gapValue,
        justifyContent: justifyValue
      }}
    >
      {children}
    </div>
  );
}
