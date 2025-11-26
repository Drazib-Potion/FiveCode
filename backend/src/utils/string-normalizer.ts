/**
 * Normalise une chaîne de caractères en supprimant les accents et en la mettant en minuscules.
 * Cette fonction permet de comparer des chaînes de manière insensible aux accents et à la casse.
 * @param str - La chaîne à normaliser
 * @returns La chaîne normalisée (sans accents, en minuscules)
 * @example
 * normalizeString("Vérin") // retourne "verin"
 * normalizeString("Éléphant") // retourne "elephant"
 * normalizeString("Ça marche") // retourne "ca marche"
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD') // Décompose les caractères accentués (é -> e + ´)
    .replace(/[\u0300-\u036f]/g, ''); // Supprime les diacritiques (accents)
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
