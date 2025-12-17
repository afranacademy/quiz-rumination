/**
 * Normalizes display names to prevent UI/PDF issues with repeated characters or excessive length.
 * Only affects presentation - does not modify stored DB names.
 */
export function normalizeDisplayName(name: string): string {
  // Trim whitespace
  let normalized = name.trim();

  // Collapse multiple spaces into one
  normalized = normalized.replace(/\s+/g, " ");

  // Limit repeated same-character runs (max 2 consecutive same chars)
  // This handles cases like "ریحانهه طهراانیییی" → "ریحانه طهراانی"
  normalized = normalized.replace(/(.)\1{2,}/g, "$1$1");

  // Max length clamp (32 chars) with ellipsis
  const MAX_LENGTH = 32;
  if (normalized.length > MAX_LENGTH) {
    normalized = normalized.substring(0, MAX_LENGTH - 1) + "…";
  }

  return normalized;
}

