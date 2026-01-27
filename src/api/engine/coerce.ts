export function coerceValue(value: unknown, type: string): unknown {
  switch (type) {
    case 'boolean_to_int':
      if (value === 'true' || value === true || value === 1 || value === '1') return 1;
      if (value === 'false' || value === false || value === 0 || value === '0') return 0;
      return 1;
    case 'to_number':
      return value !== '' && value != null ? Number(value) : null;
    case 'to_string':
      return value != null ? String(value) : null;
    default:
      return value;
  }
}
