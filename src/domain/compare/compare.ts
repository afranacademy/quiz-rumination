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
 *    - relation: if delta < 0.8 => "similar", else => "different"
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
    const relation = delta < 0.8 ? "similar" : "different";

    if (relation === "similar") {
      similarCount++;
    }

    dimensions[key] = {
      aScore,
      bScore,
      delta,
      relation,
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

