import type { LikertValue } from "@/features/quiz/types";
import { RUMINATION_INSIGHT_RULES } from "./ruminationInsights";

export function buildMindPatternText(input: {
  firstName?: string;
  answersRaw: LikertValue[]; // length 12
  quizTitle: string;
}): {
  fullText: string;
  bulletPoints: string[];
} {
  const { firstName, answersRaw, quizTitle } = input;

  // Validate answers length
  if (!answersRaw || answersRaw.length !== 12) {
    throw new Error("Answers array must have exactly 12 elements");
  }

  // Generate bullet points for each question
  const bulletPoints: string[] = [];
  for (let i = 0; i < 12; i++) {
    const rule = RUMINATION_INSIGHT_RULES[i];
    if (!rule) {
      throw new Error(`Missing insight rule for question ${i}`);
    }
    const answer = answersRaw[i];
    const insight = rule.insightsByAnswer[answer as keyof typeof rule.insightsByAnswer];
    if (!insight) {
      throw new Error(`Missing insight for question ${i}, answer ${answer}`);
    }
    bulletPoints.push(insight);
  }

  // Build full text
  const nameLine = firstName ? `${firstName}، ` : "";
  const titleLine = "الگوی ذهنی من";
  const introParagraph = `${nameLine}این یک راهنمای ساده است که می‌تونی برای کسایی که دوست داری بدونن ذهنم درگیر نشخوار فکری، در موقعیت‌های مختلف چطور کار می‌کنه، براشون بفرستی.`;
  const sectionTitle = "این الگوها توی ذهن من دیده می‌شن:";
  const closingParagraph = `این الگوها به معنی مشکل یا تشخیص نیستند؛ فقط توصیفی از نحوه‌ی کار ذهن در مواجهه با فکرهای تکراری‌اند.\n\n${quizTitle}`;

  const lines = [
    titleLine,
    "",
    introParagraph,
    "",
    sectionTitle,
    "",
    ...bulletPoints.map((point, index) => `${index + 1}. ${point}`),
    "",
    closingParagraph,
  ];

  const fullText = lines.join("\n");

  return {
    fullText,
    bulletPoints,
  };
}
