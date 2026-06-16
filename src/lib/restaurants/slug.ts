// Inline slug generation — no external dependency needed.
// Handles pt-BR characters (normalise → strip diacritics → lowercase → hyphenate).
export function generateSlug(name: string): string {
  return name
    .normalize('NFD')                   // decompose accented chars (e.g. ã → a + ~)
    .replace(/[̀-ͯ]/g, '')    // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')      // remove anything not alphanumeric/space/hyphen
    .replace(/[\s_]+/g, '-')           // spaces/underscores → hyphens
    .replace(/-+/g, '-')               // collapse consecutive hyphens
    .replace(/^-|-$/g, '')             // strip leading/trailing hyphens
}
