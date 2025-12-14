import type { Answers12, AnswerValue } from "./types";

export const REVERSE_SCORED_QUESTIONS = [11, 12] as const; // 1-indexed

/**
 * Reverse scores a single answer value (0..4 -> 4..0)
 */
function reverseScore(value: AnswerValue): AnswerValue {
  return (4 - value) as AnswerValue;
}

/**
 * Computes total score from answers.
 * Questions 11 and 12 (1-indexed) are reverse-scored.
 * Returns integer 0..48.
 */
export function computeTotalScore(answers: Answers12): number {
  let total = 0;

  for (let i = 0; i < 12; i++) {
    const questionNumber = i + 1; // 1-indexed
    const rawAnswer = answers[i];

    // Q11 and Q12 are reverse-scored
    if (questionNumber === 11 || questionNumber === 12) {
      total += reverseScore(rawAnswer);
    } else {
      total += rawAnswer;
    }
  }

  return total;
}

/**
 * Validates and normalizes input to Answers12.
 * Throws descriptive error if invalid.
 */
export function normalizeAnswers(input: unknown): Answers12 {
  if (!Array.isArray(input)) {
    throw new Error("Answers must be an array");
  }

  if (input.length !== 12) {
    throw new Error(`Expected 12 answers, got ${input.length}`);
  }

  const normalized: AnswerValue[] = [];

  for (let i = 0; i < 12; i++) {
    const value = input[i];

    if (typeof value !== "number") {
      throw new Error(`Answer at index ${i} must be a number, got ${typeof value}`);
    }

    if (!Number.isInteger(value)) {
      throw new Error(`Answer at index ${i} must be an integer, got ${value}`);
    }

    if (value < 0 || value > 4) {
      throw new Error(`Answer at index ${i} must be 0..4, got ${value}`);
    }

    normalized.push(value as AnswerValue);
  }

  return normalized as Answers12;
}

