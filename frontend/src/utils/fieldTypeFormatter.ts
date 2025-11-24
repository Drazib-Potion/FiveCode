export function formatFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    string: 'Texte',
    number: 'Nombre',
    boolean: 'Booléen',
    enum: 'Énumération',
  };
  return typeMap[type] || type;
}

export function getFieldTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'string', label: 'Texte' },
    { value: 'number', label: 'Nombre' },
    { value: 'boolean', label: 'Booléen' },
    { value: 'enum', label: 'Énumération' },
  ];
}

