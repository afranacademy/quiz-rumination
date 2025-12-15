import type { Attempt, DimensionKey } from "../quiz/types";
import type { Comparison } from "./types";
import { computeDimensionScores } from "../quiz/dimensions";
import { levelOfDimension } from "../quiz/dimensions";

/**
 * Compares two attempts and generates a Comparison.
 * 
 * Rules:
 * 1) For each dimension:
 *    - delta = abs(aScore - bScore) rounded to 1 decimal
 *    - relation: 
 *      - if delta < 0.8 => "similar"
 *      - if 0.8 <= delta < 1.6 => "different"
 *      - if delta >= 1.6 => "very_different"
 * 2) summarySimilarity:
 *    - count how many dimensions are "similar" out of 4
 *    - 0-1 similar => "low"
 *    - 2 similar => "medium"
 *    - 3-4 similar => "high"
 */
export function compareAttempts(a: Attempt, b: Attempt): Comparison {
  const aDimensions = computeDimensionScores(a.answers);
  const bDimensions = computeDimensionScores(b.answers);

  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];

  const dimensions: Comparison["dimensions"] = {} as Comparison["dimensions"];
  let similarCount = 0;

  for (const key of dimensionKeys) {
    const aScore = aDimensions[key];
    const bScore = bDimensions[key];
    const delta = Math.round(Math.abs(aScore - bScore) * 10) / 10;
    
    let relation: "similar" | "different" | "very_different";
    if (delta < 0.8) {
      relation = "similar";
      similarCount++;
    } else if (delta < 1.6) {
      relation = "different";
    } else {
      relation = "very_different";
    }

    // Determine direction
    let direction: "a_higher" | "b_higher" | "equal";
    if (Math.abs(aScore - bScore) < 0.1) {
      direction = "equal";
    } else if (aScore > bScore) {
      direction = "a_higher";
    } else {
      direction = "b_higher";
    }

    dimensions[key] = {
      aScore,
      bScore,
      delta,
      relation,
      direction,
      aLevel: levelOfDimension(aScore),
      bLevel: levelOfDimension(bScore),
    };
  }

  let summarySimilarity: "low" | "medium" | "high";
  if (similarCount <= 1) {
    summarySimilarity = "low";
  } else if (similarCount === 2) {
    summarySimilarity = "medium";
  } else {
    summarySimilarity = "high";
  }

  return {
    id: `compare-${a.id}-${b.id}`,
    createdAt: new Date().toISOString(),
    attemptAId: a.id,
    attemptBId: b.id,
    summarySimilarity,
    dimensions,
  };
}

