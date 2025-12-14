import type { CompareCardPayload } from "@/domain/compare/payload";

/**
 * Builds a Persian summary text for sharing comparison results.
 * Uses highlights, safety phrases, and conversation starters from the payload.
 * Falls back to minimal summary if payload is missing.
 */
export function buildCompareShareText(
  payload: CompareCardPayload | null,
  nameA: string,
  nameB: string
): string {
  if (!payload) {
    // Minimal fallback
    return `مقایسه ذهن‌ها: ${nameA} و ${nameB}\n\nاین مقایسه برای درک بهتر در رابطه طراحی شده، نه قضاوت یا برچسب‌گذاری.`;
  }

  const lines: string[] = [
    "کارت «ذهن ما کنار هم»",
    "",
    `مقایسه نتایج: ${nameA} و ${nameB}`,
    "",
    "این مقایسه نشون می‌ده ذهن ما در موقعیت‌های مختلف چطور کار می‌کنه. این نتیجه برای درک بهتر طراحی شده، نه تشخیص یا قضاوت.",
    "",
  ];

  // Add highlights
  if (payload.highlights && payload.highlights.length > 0) {
    const similarDims = payload.highlights.filter((h) => h.relation === "similar");
    const differentDims = payload.highlights.filter((h) => h.relation === "different");

    if (similarDims.length > 0) {
      lines.push("شباهت‌ها:");
      similarDims.forEach((dim) => {
        lines.push(`• ${dim.titleFa}`);
      });
      lines.push("");
    }

    if (differentDims.length > 0) {
      lines.push("تفاوت‌ها:");
      differentDims.forEach((dim) => {
        lines.push(`• ${dim.titleFa}`);
      });
      lines.push("");
    }
  }

  // Add safety phrases
  if (payload.safetyPhrasesFa && payload.safetyPhrasesFa.length > 0) {
    lines.push("توجه مهم:");
    payload.safetyPhrasesFa.forEach((phrase) => {
      lines.push(`• ${phrase}`);
    });
    lines.push("");
  }

  // Add conversation starters
  if (payload.conversationStartersFa && payload.conversationStartersFa.length > 0) {
    lines.push("پیشنهاد گفتگو:");
    payload.conversationStartersFa.forEach((starter) => {
      lines.push(`• ${starter}`);
    });
  }

  return lines.join("\n");
}

