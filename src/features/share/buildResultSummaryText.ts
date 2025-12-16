export type ResultSummaryInput = {
  firstName?: string;
  levelLabel: "کم" | "متوسط" | "زیاد";
  score: number;
  maxScore: number;
  quizTitle: string;
  url?: string;
};

import { INVITE_LINK_TEXT, INVITE_LINK_URL } from "@/utils/pdfConstants";

export function buildResultSummaryText(input: ResultSummaryInput): string {
  const { firstName, levelLabel, score, maxScore, quizTitle, url } = input;
  
  const nameLine = firstName ? `${firstName}، ` : "";
  const quizLine = `${quizTitle}`;
  const levelLine = `سطح: ${levelLabel}`;
  const scoreLine = `امتیاز: ${score} از ${maxScore}`;
  
  // Generic meaning line based on level (non-judgmental)
  const meaningLines: Record<"کم" | "متوسط" | "زیاد", string> = {
    "کم": "این آزمون کمکم کرده بفهمم ذهنم معمولاً متعادل و انعطاف‌پذیر کار می‌کنه.",
    "متوسط": "این آزمون کمکم کرده بفهمم ذهنم گاهی برای رسیدن به احساس بهتر، زیاد فکر می‌کنه.",
    "زیاد": "این آزمون کمکم کرده بفهمم ذهنم گاهی وارد چرخه‌ای می‌شه که نیاز به توجه داره.",
  };
  
  const meaningLine = meaningLines[levelLabel];
  const ethicsLine = "این آزمون ابزار خودشناسی است و تشخیص بالینی نیست.";
  
  const lines = [
    nameLine + quizLine,
    levelLine,
    scoreLine,
    "",
    meaningLine,
    "",
    ethicsLine,
    "",
    INVITE_LINK_TEXT,
    INVITE_LINK_URL,
  ];
  
  return lines.join("\n");
}
