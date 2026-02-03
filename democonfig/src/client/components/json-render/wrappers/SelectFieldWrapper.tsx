import { useState, useEffect, useCallback } from 'react';
import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../ui/select';
import { resolveDataPath } from '../utils/resolveDataPath';
import { validateField } from '../utils/validation';
import { useFormValidation } from '../ValidationContext';

export function SelectFieldWrapper({ element }: ComponentRenderProps) {
  const { data, get, set } = useData();
  const { registerValidator, unregisterValidator, validationTrigger } = useFormValidation();
  const { label, bindPath, placeholder, required, options, optionsPath, validation } = element.props as {
    label?: string;
    bindPath?: string;
    placeholder?: string;
    required?: boolean;
    options?: any[];
    optionsPath?: string;
    validation?: any;
  };

  const fieldPath = bindPath || 'form.' + bindPath;
  const value = (get(fieldPath) as string) || '';
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Validation function
  const validate = useCallback(() => {
    const currentValue = (get(fieldPath) as string) || '';
    if (validation?.checks) {
      return validateField(currentValue, validation.checks);
    }
    return null;
  }, [fieldPath, validation, get]);

  // Register validator with context
  useEffect(() => {
    registerValidator(fieldPath, validate);
    return () => unregisterValidator(fieldPath);
  }, [fieldPath, validate, registerValidator, unregisterValidator]);

  // Watch validationTrigger to show errors on submit
  useEffect(() => {
    if (validationTrigger > 0) {
      setTouched(true);
      const validationError = validate();
      setError(validationError);
    }
  }, [validationTrigger, validate]);

  let selectOptions = options || [];
  if (optionsPath) {
    let resolved = resolveDataPath(data, optionsPath);

    // Handle wrapped data format: { data: [...], meta: {...} }
    if (resolved && typeof resolved === 'object' && !Array.isArray(resolved) && Array.isArray(resolved.data)) {
      resolved = resolved.data;
    }

    if (Array.isArray(resolved)) {
      selectOptions = resolved.map((item: any) => {
        if (item.label && item.value) return item;
        if (item.id && item.name) return { label: item.name, value: item.id };
        if (item.id && item.title) return { label: item.title, value: item.id };
        if (item.id && item.firstName) return { label: `${item.firstName} ${item.lastName || ''}`.trim(), value: item.id };
        return { label: String(item), value: String(item) };
      });
    }
  }

  // Handle empty string values
  const safeVal = value === '' ? '__EMPTY__' : value;
  const handleValueChange = (v: string) => {
    const actualValue = v === '__EMPTY__' ? '' : v;
    set(fieldPath, actualValue);
    setTouched(true);
    // Validate on change for select fields
    if (validation?.checks) {
      const validationError = validateField(actualValue, validation.checks);
      setError(validationError);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <Select value={safeVal} onValueChange={handleValueChange}>
        <SelectTrigger className={error ? 'border-destructive' : ''}>
          <SelectValue placeholder={placeholder || `Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {selectOptions.map((opt: any) => (
            <SelectItem
              key={opt.value}
              value={opt.value === '' ? '__EMPTY__' : opt.value}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
