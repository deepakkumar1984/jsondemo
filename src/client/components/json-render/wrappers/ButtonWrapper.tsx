import type { ComponentRenderProps } from '@json-render/react';
import { useActions } from '@json-render/react';
import { Button } from '../../ui/button';
import { useFormValidation } from '../ValidationContext';

const ICON_MAP: Record<string, any> = {
  // Icons would be imported here if needed
};

export function ButtonWrapper({ element }: ComponentRenderProps) {
  const { execute } = useActions();
  const { validateAll } = useFormValidation();
  const { label, variant, action, icon, disabled } = element.props as {
    label?: string;
    variant?: string;
    action?: { type: string; [key: string]: any };
    icon?: string;
    disabled?: boolean;
  };

  const variantMap: Record<string, 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'> = {
    primary: 'default',
    default: 'default',
    secondary: 'secondary',
    outline: 'outline',
    cancel: 'outline',
    danger: 'destructive',
    destructive: 'destructive',
    ghost: 'ghost',
    link: 'link',
  };

  const mappedVariant = variantMap[variant || 'default'] || 'default';

  const handleClick = () => {
    if (action) {
      // Validate before executing submit_form actions
      if (action.type === 'submit_form') {
        if (!validateAll()) {
          return;
        }
      }
      execute({ name: action.type, params: action });
    }
  };

  return (
    <Button
      variant={mappedVariant}
      onClick={handleClick}
      disabled={disabled}
    >
      {icon && ICON_MAP[icon as string]}
      {icon && <span className="ml-1">{label}</span>}
      {!icon && label}
    </Button>
  );
}
