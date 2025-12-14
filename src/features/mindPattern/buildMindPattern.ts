import { MIND_PATTERN_MAP, OptionValue, MindPatternEntry } from "./mindPatternMap";

export type MindPatternItem = {
  title: string;
  description: string;
};

export function buildMindPatternItems(answers: number[]): MindPatternItem[] {
  if (!answers || answers.length !== 12) {
    throw new Error("Answers array must have exactly 12 elements");
  }

  const items: MindPatternItem[] = [];

  // Map answers[0] -> Question 1, answers[11] -> Question 12
  for (let i = 0; i < 12; i++) {
    const questionNumber = i + 1; // 1..12
    const answer = answers[i] as OptionValue;

    if (answer < 0 || answer > 4) {
      throw new Error(`Invalid answer value ${answer} at index ${i}. Must be 0..4`);
    }

    const questionMap = MIND_PATTERN_MAP[questionNumber];
    if (!questionMap) {
      throw new Error(`Missing question ${questionNumber} in MIND_PATTERN_MAP`);
    }

    const entry = questionMap[answer];
    if (!entry) {
      throw new Error(`Missing entry for question ${questionNumber}, answer ${answer}`);
    }

    items.push({
      title: entry.title,
      description: entry.description,
    });
  }

  return items;
}

