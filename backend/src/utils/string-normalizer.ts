export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeStringForStorage(str: string): string {
  return normalizeString(str).toUpperCase();
}

export function normalizeStringsForStorage(value: any): any {
  if (typeof value === 'string') {
    return normalizeStringForStorage(value);
  }
  if (Array.isArray(value)) {
    return value.map(normalizeStringsForStorage);
  }
  if (value && typeof value === 'object') {
    const normalized: Record<string, any> = {};
    Object.entries(value).forEach(([key, val]) => {
      normalized[key] = normalizeStringsForStorage(val);
    });
    return normalized;
  }
  return value;
}
