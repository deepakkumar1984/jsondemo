import { useState, useEffect, useCallback } from 'react';
import type { ComponentRenderProps } from '@json-render/react';
import { useData } from '@json-render/react';
import { Input } from '../../ui/input';
import { interpolateTemplate } from '../utils/interpolateTemplate';
import { validateField } from '../utils/validation';
import { useFormValidation } from '../ValidationContext';

export function TextFieldWrapper({ element }: ComponentRenderProps) {
  const { data, get, set } = useData();
  const { registerValidator, unregisterValidator, validationTrigger } = useFormValidation();
  const { label, bindPath, placeholder, required, type, disabled, validation } = element.props as {
    label?: string;
    bindPath?: string;
    placeholder?: string;
    required?: boolean;
    type?: string;
    disabled?: boolean;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    set(fieldPath, e.target.value);
    // Clear error on change if field was touched
    if (touched && error) {
      const newError = validation?.checks ? validateField(e.target.value, validation.checks) : null;
      setError(newError);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (validation?.checks) {
      const validationError = validateField(value, validation.checks);
      setError(validationError);
    }
  };

  // Interpolate templates in label/placeholder
  const interpolatedLabel = typeof label === 'string' && label.includes('{{')
    ? interpolateTemplate(label, data)
    : label;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {interpolatedLabel}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      <Input
        type={type || 'text'}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={error ? 'border-destructive' : ''}
      />
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
