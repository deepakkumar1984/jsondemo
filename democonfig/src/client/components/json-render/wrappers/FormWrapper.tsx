import type { ComponentRenderProps } from '@json-render/react';
import { useData, useActions } from '@json-render/react';
import { Button } from '../../ui/button';
import { useFormValidation } from '../ValidationContext';

export function FormWrapper({ element, children }: ComponentRenderProps) {
  const { data } = useData();
  const { execute } = useActions();
  const { validateAll } = useFormValidation();
  const { action, actions: formActions } = element.props as {
    action?: { type: string; [key: string]: any };
    actions?: {
      buttons?: any[];
      align?: string;
      gap?: string;
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    if (!validateAll()) {
      return;
    }

    // Filter out dataSources (arrays and objects with 'data' property) and only get form fields
    const formData: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      // Skip arrays (likely dataSources like departments, managers)
      if (Array.isArray(value)) return;

      // Skip objects that look like API responses (have 'data' and 'meta' properties)
      if (value && typeof value === 'object' && ('data' in value || 'meta' in value)) return;

      // Include everything else (form fields)
      formData[key] = value;
    });

    // Execute the action with form data
    if (action) {
      await execute({
        name: action.type,
        params: { ...action, data: formData }
      });
    }
  };

  // Render form actions if defined in config
  const renderActions = () => {
    if (!formActions || !formActions.buttons || formActions.buttons.length === 0) {
      return null;
    }

    const alignMap: Record<string, string> = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
    };

    const gapMap: Record<string, string> = {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-6',
    };

    const align = alignMap[formActions.align || 'end'] || 'justify-end';
    const gap = gapMap[formActions.gap || 'md'] || 'gap-3';

    return (
      <div className={`flex ${align} ${gap} pt-4`}>
        {formActions.buttons.map((btn: any, i: number) => {
          const variantMap: Record<string, any> = {
            primary: 'default',
            danger: 'destructive'
          };
          const variant = variantMap[btn.variant] || btn.variant || 'outline';

          return (
            <Button
              key={i}
              type={btn.buttonType || 'button'}
              variant={variant}
              onClick={btn.buttonType === 'submit' ? undefined : () => execute({ name: btn.action.type, params: btn.action })}
            >
              {btn.label}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {children}
      {renderActions()}
    </form>
  );
}
