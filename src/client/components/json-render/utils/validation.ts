// Simple custom validation that actually works
export function validateField(value: any, checks: any[]): string | null {
  if (!checks || checks.length === 0) return null;

  for (const check of checks) {
    const { fn, args, message } = check;
    const actualValue = value || '';

    switch (fn) {
      case 'required':
        if (!actualValue || actualValue.trim() === '') {
          return message || 'This field is required';
        }
        break;

      case 'minLength':
        const minLen = Array.isArray(args) ? args[0] : args;
        if (actualValue && actualValue.length < minLen) {
          return message || `Minimum ${minLen} characters`;
        }
        break;

      case 'maxLength':
        const maxLen = Array.isArray(args) ? args[0] : args;
        if (actualValue && actualValue.length > maxLen) {
          return message || `Maximum ${maxLen} characters`;
        }
        break;

      case 'email':
        if (actualValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actualValue)) {
          return message || 'Invalid email format';
        }
        break;

      case 'pattern':
        const pattern = Array.isArray(args) ? args[0] : args;
        if (actualValue && !new RegExp(pattern).test(actualValue)) {
          return message || 'Invalid format';
        }
        break;

      default:
        console.warn(`Unknown validation function: ${fn}`);
    }
  }

  return null;
}
