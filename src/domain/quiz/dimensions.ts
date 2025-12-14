import type { Answers12, DimensionKey } from "./types";

/**
 * Maps dimension keys to 1-indexed question numbers.
 */
export const DIMENSION_QUESTION_MAP: Record<DimensionKey, number[]> = {
  stickiness: [1, 10],
  pastBrooding: [2, 8],
  futureWorry: [4, 7, 9],
  interpersonal: [5, 6],
};

/**
 * Computes dimension scores from answers.
 * Each dimension score is the average of raw answers for those questions (0..4),
 * rounded to 1 decimal place.
 */
export function computeDimensionScores(answers: Answers12): Record<DimensionKey, number> {
  const scores: Record<DimensionKey, number> = {} as Record<DimensionKey, number>;

  for (const [dimension, questionNumbers] of Object.entries(DIMENSION_QUESTION_MAP)) {
    const dimensionKey = dimension as DimensionKey;
    const questionIndices = questionNumbers.map(q => q - 1); // Convert 1-indexed to 0-indexed

    let sum = 0;
    for (const index of questionIndices) {
      sum += answers[index];
    }

    const average = sum / questionIndices.length;
    // Round to 1 decimal place
    scores[dimensionKey] = Math.round(average * 10) / 10;
  }

  return scores;
}

/**
 * Determines level of a dimension score.
 * Thresholds:
 * - 0.0-1.3: low
 * - 1.4-2.6: medium
 * - 2.7-4.0: high
 */
export function levelOfDimension(score: number): "low" | "medium" | "high" {
  if (score <= 1.3) {
    return "low";
  } else if (score <= 2.6) {
    return "medium";
  } else {
    return "high";
  }
}

