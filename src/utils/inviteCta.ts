/**
 * Reusable CTA helper for rumination test invitation
 * Used across Summary Result, My Mind Pattern, and Compare Minds cards
 */

import { TEST_LINK } from "@/constants/links";

export const CTA_TEXT = "تکمیل آزمون سنجش نشخوار فکری";
export const CTA_URL = TEST_LINK;
export const CTA_INTRO_TEXT =
  "اگر دوست داری الگوی ذهنی خودت رو دقیق‌تر بشناسی،\nمی‌تونی این آزمون سنجش نشخوار فکری رو تکمیل کنی:";

/**
 * Formats CTA for copyable/share text output
 * For messaging systems that need a link, includes URL in parentheses
 * For UI-visible text, prefer CTA_TEXT only
 * @deprecated Use buildInviteCta, buildInviteTextForShare, or buildInviteTextForCopy instead
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
 * @deprecated Use buildInviteTextForShare or buildInviteTextForCopy instead
 */
export function formatInviteText(includeUrl: boolean = false): string {
  const ctaPart = formatCtaForText(includeUrl);
  return `${CTA_INTRO_TEXT}\n${ctaPart}`;
}

/**
 * Builds CTA text for UI display (clickable text, no URL visible)
 * Use this for Button/span onClick handlers
 */
export function buildInviteCta(): string {
  return CTA_TEXT;
}

/**
 * Builds clean CTA text for Share API (no URL in text)
 * URL must be passed separately to shareOrCopyText in url field
 */
export function buildInviteTextForShare(): string {
  return CTA_TEXT;
}

/**
 * Builds full invite text for Copy operations
 * Returns CTA text + URL on separate line
 */
export function buildInviteTextForCopy(): string {
  return `${CTA_TEXT}\n${CTA_URL}`;
}

/**
 * Wrapper for shareOrCopyText that ensures text (CTA) and url (INVITE_URL) are sent separately
 * When fallback to copy happens, uses copyInvite to ensure URL is always in the text
 * @param opts.title Optional title for share
 * @param opts.contentText Optional content text to prepend before CTA
 */
export async function shareInvite(opts: {
  title?: string;
  contentText?: string;
}): Promise<{ method: "share" | "copy"; ok: boolean; error?: string }> {
  const { shareOrCopyText } = await import("@/features/share/shareClient");
  
  const ctaText = buildInviteTextForShare();
  const fullText = opts.contentText 
    ? `${opts.contentText}\n\n${ctaText}`
    : ctaText;
  
  // Try Web Share API first
  if (navigator.share) {
    try {
      await navigator.share({
        title: opts.title || undefined,
        text: fullText,
        url: CTA_URL,
      });
      return { method: "share", ok: true };
    } catch (error: unknown) {
      // User canceled - don't treat as error
      if (error instanceof Error && error.name === "AbortError") {
        return { method: "share", ok: false, error: "canceled" };
      }
      // Other error - fallback to copy with copyInvite (ensures URL is in text)
      const copySuccess = await copyInvite({ contentText: opts.contentText });
      return { 
        method: "copy", 
        ok: copySuccess,
        error: copySuccess ? undefined : "Failed to copy"
      };
    }
  }
  
  // No Web Share API - use copyInvite directly (ensures URL is in text)
  const copySuccess = await copyInvite({ contentText: opts.contentText });
  return { 
    method: "copy", 
    ok: copySuccess,
    error: copySuccess ? undefined : "Failed to copy"
  };
}

/**
 * Wrapper for copy that ensures excellent plain text output
 * Always tries HTML clipboard for rich paste in supporting apps
 * @param opts.contentText Content text to prepend before CTA
 */
export async function copyInvite(opts: {
  contentText?: string;
}): Promise<boolean> {
  const { copyText } = await import("@/features/share/shareClient");
  
  // Build content parts
  const contentText = opts.contentText || "";
  const ctaText = CTA_TEXT; // Only CTA, no URL
  
  // Build plain text: content + CTA only (no URL in plain text)
  const plainTextContent = contentText
    ? `${contentText}\n\n${ctaText}`
    : ctaText;
  
  // Try HTML clipboard first (if ClipboardItem is supported)
  if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
    try {
      // Build HTML content with clickable link
      const htmlContent = contentText
        ? `${contentText.replace(/\n/g, '<br>')}<br><br><a href="${CTA_URL}">${ctaText}</a>`
        : `<a href="${CTA_URL}">${ctaText}</a>`;
      
      const htmlBlob = new Blob([htmlContent], { type: "text/html" });
      const textBlob = new Blob([plainTextContent], { type: "text/plain" });
      const clipboardItem = new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      });
      
      await navigator.clipboard.write([clipboardItem]);
      return true;
    } catch (error) {
      // HTML clipboard failed, fallback to plain text (CTA only, no URL)
      if (import.meta.env.DEV) {
        console.warn("[copyInvite] HTML clipboard failed, falling back to plain text:", error);
      }
    }
  }
  
  // Fallback: plain text with CTA only (no URL)
  return await copyText(plainTextContent);
}

