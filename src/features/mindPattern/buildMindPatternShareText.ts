import { type MindPatternItem } from "./buildMindPattern";
import { buildInviteTextForCopy } from "@/utils/inviteCta";

export function buildMindPatternShareText(
  items: MindPatternItem[],
  _quizUrl: string
): string {
  // Use all 12 items (not just selected highlights)
  // Filter out any null/undefined items as guard
  const validItems = items.filter((item): item is MindPatternItem => 
    item != null && 
    typeof item === 'object' && 
    'description' in item && 
    item.description != null
  );

  // Validate we have all 12 items
  if (validItems.length !== 12) {
    console.warn(`[buildMindPatternShareText] Expected 12 items, got ${validItems.length}. Some items may be missing.`);
  }

  // Build first-person bullet points for all items
  const bulletPoints = validItems.map((item, index) => {
    // Use description as-is (already in first-person from the map)
    return `${index + 1}. ${item.description}`;
  });

  const lines = [
    "الگوی ذهنی من",
    "",
    ...bulletPoints,
    "",
    "این نتیجه مربوط به آزمون «سنجش نشخوار فکری – ذهن وراج» است.",
    "",
    buildInviteTextForCopy(), // CTA + URL on separate line
  ];

  return lines.join("\n");
}
