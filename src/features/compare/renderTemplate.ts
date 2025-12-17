import type { Section } from "./templates/compareText.fa";

/**
 * Renders template text with placeholder replacement.
 * For Phase 5 (felt_experience): also replaces literal "A" and "B" with nameA/nameB
 * in the rendering layer (keeps MD source text verbatim in template library).
 */
export function renderTemplate(
  text: string,
  vars: { A: string; B: string },
  section?: Section
): string {
  let rendered = text;

  // Replace {{A}} and {{B}} placeholders first
  rendered = rendered.replace(/\{\{A\}\}/g, vars.A);
  rendered = rendered.replace(/\{\{B\}\}/g, vars.B);

  // For Phase 5 (felt_experience): replace literal "A" and "B" when used as subject tokens
  // This is done in rendering layer only; template library text remains verbatim
  if (section === "felt_experience") {
    // Replace "A " (space after) → nameA + space (only if not already replaced)
    rendered = rendered.replace(/\bA\s+/g, (match) => {
      // Check if this A is already part of a replaced placeholder
      return match.replace(/^A\s+/, `${vars.A} `);
    });
    // Replace "B " (space after) → nameB + space
    rendered = rendered.replace(/\bB\s+/g, (match) => {
      return match.replace(/^B\s+/, `${vars.B} `);
    });
    
    // Replace "A." (period after) → nameA + period
    rendered = rendered.replace(/\bA\./g, `${vars.A}.`);
    // Replace "B." (period after) → nameB + period
    rendered = rendered.replace(/\bB\./g, `${vars.B}.`);
    
    // Replace "A،" (Persian comma) → nameA + comma
    rendered = rendered.replace(/\bA،/g, `${vars.A}،`);
    // Replace "B،" (Persian comma) → nameB + comma
    rendered = rendered.replace(/\bB،/g, `${vars.B}،`);
    
    // Replace "A" at start of line or after newline (with space) → nameA
    rendered = rendered.replace(/(^|\n)A\s/g, `$1${vars.A} `);
    // Replace "B" at start of line or after newline (with space) → nameB
    rendered = rendered.replace(/(^|\n)B\s/g, `$1${vars.B} `);
  }

  return rendered;
}

