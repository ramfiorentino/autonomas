/**
 * Converts a display name to a URL-safe slug.
 * e.g. "Dra. García López" → "dra-garcia-lopez"
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // remove non-alphanumeric except spaces/hyphens
    .trim()
    .replace(/[\s_]+/g, "-")         // spaces → hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .replace(/^-|-$/g, "");          // trim leading/trailing hyphens
}
