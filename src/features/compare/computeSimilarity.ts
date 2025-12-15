import type { DimensionKey } from "@/domain/quiz/types";

/**
 * Computes overall similarity level from dimension deltas.
 * Only counts valid dimensions (not NaN/unknown).
 * Thresholds (based on valid dimensions count):
 * - high: 3-4 valid dimensions with >= 3 similar
 * - medium: 2+ valid dimensions with 2 similar, or 3-4 valid with 2 similar
 * - low: otherwise
 */
export function computeSimilarity(
  dimensionDeltas: Record<DimensionKey, number>
): "low" | "medium" | "high" {
  const threshold = 0.8;
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
  
  let similarCount = 0;
  let validDimensionsCount = 0;
  
  for (const key of dimensionKeys) {
    const delta = dimensionDeltas[key];
    // Only count valid dimensions (not NaN)
    if (typeof delta === "number" && !isNaN(delta)) {
      validDimensionsCount++;
      if (delta < threshold) {
        similarCount++;
      }
    }
  }

  // Calculate similarity based on valid dimensions count
  if (validDimensionsCount === 0) {
    return "low"; // No valid dimensions
  } else if (validDimensionsCount <= 2) {
    // 1-2 valid dimensions
    if (similarCount <= 1) {
      return "low";
    } else {
      return "medium";
    }
  } else {
    // 3-4 valid dimensions
    if (similarCount >= 3) {
      return "high";
    } else if (similarCount === 2) {
      return "medium";
    } else {
      return "low";
    }
  }
}

