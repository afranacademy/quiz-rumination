// Persian digits: ۰۱۲۳۴۵۶۷۸۹
// Arabic-Indic digits: ٠١٢٣٤٥٦٧٨٩
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const ASCII_DIGITS = "0123456789";

export function toAsciiDigits(input: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === "+") {
      result += "+";
    } else {
      const persianIndex = PERSIAN_DIGITS.indexOf(char);
      if (persianIndex !== -1) {
        result += ASCII_DIGITS[persianIndex];
        continue;
      }
      const arabicIndex = ARABIC_DIGITS.indexOf(char);
      if (arabicIndex !== -1) {
        result += ASCII_DIGITS[arabicIndex];
        continue;
      }
      if (ASCII_DIGITS.includes(char)) {
        result += char;
      }
    }
  }
  return result;
}

export function normalizePhone(input: string): { e164: string; region: "IR" | "INTL" } | null {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return null;
  }

  // Convert Persian/Arabic digits to ASCII and remove separators
  let cleaned = toAsciiDigits(trimmed);
  // Remove spaces, hyphens, parentheses
  cleaned = cleaned.replace(/[\s\-()]/g, "");

  // Iran mode validation
  if (cleaned.startsWith("09")) {
    // Must be exactly 11 digits total
    if (cleaned.length === 11 && /^09\d{9}$/.test(cleaned)) {
      return {
        e164: `+98${cleaned.substring(1)}`,
        region: "IR",
      };
    }
    return null;
  }

  if (cleaned.startsWith("+98")) {
    // Must be +989xxxxxxxxx (13 chars total: + and 12 digits)
    const digitsAfterPlus = cleaned.substring(3);
    if (digitsAfterPlus.length === 10 && digitsAfterPlus.startsWith("9") && /^\d+$/.test(digitsAfterPlus)) {
      return {
        e164: `+98${digitsAfterPlus}`,
        region: "IR",
      };
    }
    return null;
  }

  // Reject "98..." without plus (enforce rule)
  if (cleaned.startsWith("98") && !cleaned.startsWith("+98")) {
    return null;
  }

  // International mode validation
  if (cleaned.startsWith("+")) {
    const digitsAfterPlus = cleaned.substring(1);
    // Must be 10 to 15 digits after +
    if (/^\d+$/.test(digitsAfterPlus) && digitsAfterPlus.length >= 10 && digitsAfterPlus.length <= 15) {
      return {
        e164: `+${digitsAfterPlus}`,
        region: "INTL",
      };
    }
    return null;
  }

  return null;
}
