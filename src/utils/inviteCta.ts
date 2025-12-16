/**
 * Reusable CTA helper for rumination test invitation
 * Used across Summary Result, My Mind Pattern, and Compare Minds cards
 */

export const CTA_TEXT = "تکمیل آزمون سنجش نشخوار فکری";
export const CTA_URL = "https://zaya.io/testruminationnewtest";
export const CTA_INTRO_TEXT =
  "اگر دوست داری الگوی ذهنی خودت رو دقیق‌تر بشناسی،\nمی‌تونی این آزمون سنجش نشخوار فکری رو تکمیل کنی:";

/**
 * Formats CTA for copyable/share text output
 * For messaging systems that need a link, includes URL in parentheses
 * For UI-visible text, prefer CTA_TEXT only
 */
export function formatCtaForText(includeUrl: boolean = false): string {
  if (includeUrl) {
    return `${CTA_TEXT}: ${CTA_URL}`;
  }
  return CTA_TEXT;
}

/**
 * Formats full invite text with CTA for share/copy operations
 * Includes intro text + CTA (with URL only if needed)
 */
export function formatInviteText(includeUrl: boolean = false): string {
  const ctaPart = formatCtaForText(includeUrl);
  return `${CTA_INTRO_TEXT}\n${ctaPart}`;
}

