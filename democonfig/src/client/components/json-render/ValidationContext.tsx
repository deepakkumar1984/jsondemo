import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

interface ValidationContextType {
  registerValidator: (fieldPath: string, validate: () => string | null) => void;
  unregisterValidator: (fieldPath: string) => void;
  validateAll: () => boolean;
  touchAll: () => void;
  validationTrigger: number;
}

const ValidationContext = createContext<ValidationContextType | null>(null);

export function ValidationProvider({ children }: { children: ReactNode }) {
  const validators = useRef<Map<string, () => string | null>>(new Map());
  const [validationTrigger, setValidationTrigger] = useState(0);

  const registerValidator = useCallback((fieldPath: string, validate: () => string | null) => {
    validators.current.set(fieldPath, validate);
  }, []);

  const unregisterValidator = useCallback((fieldPath: string) => {
    validators.current.delete(fieldPath);
  }, []);

  const touchAll = useCallback(() => {
    // Increment trigger to tell all fields to show errors
    setValidationTrigger(prev => prev + 1);
  }, []);

  const validateAll = useCallback(() => {
    // First touch all fields to show errors
    touchAll();

    // Then run all validators
    let hasErrors = false;
    validators.current.forEach((validate) => {
      const error = validate();
      if (error !== null) {
        hasErrors = true;
      }
    });

    return !hasErrors;
  }, [touchAll]);

  return (
    <ValidationContext.Provider value={{ registerValidator, unregisterValidator, validateAll, touchAll, validationTrigger }}>
      {children}
    </ValidationContext.Provider>
  );
}

export function useFormValidation() {
  const context = useContext(ValidationContext);
  if (!context) {
    throw new Error('useFormValidation must be used within ValidationProvider');
  }
  return context;
}
