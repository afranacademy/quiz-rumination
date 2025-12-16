import { buildMindPatternItems, type MindPatternItem } from "./buildMindPattern";
import { formatInviteText } from "@/utils/inviteCta";

export function buildMindPatternShareText(
  items: MindPatternItem[],
  quizUrl: string
): string {
  // Select 5-7 key highlights (prioritize items with higher engagement)
  // For simplicity, we'll take items 0, 2, 4, 6, 8, 10, 11 (7 items)
  const selectedIndices = [0, 2, 4, 6, 8, 10, 11].filter(i => i < items.length);
  const highlights = selectedIndices.map(i => items[i]);

  // Build first-person bullet points
  const bulletPoints = highlights.map(item => {
    // Use description as-is (already in first-person from the map)
    return `• ${item.description}`;
  });

  const lines = [
    "الگوی ذهنی من",
    "",
    ...bulletPoints,
    "",
    "این نتیجه مربوط به آزمون «سنجش نشخوار فکری – ذهن وراج» است.",
    "",
    formatInviteText(true), // Include URL for share text
  ];

  return lines.join("\n");
}
