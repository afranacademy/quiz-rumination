import type { DimensionKey } from "@/domain/quiz/types";

/**
 * Computes overall similarity level from dimension deltas.
 * Thresholds:
 * - high: 3-4 dimensions with delta < 0.8
 * - medium: 2 dimensions with delta < 0.8
 * - low: 0-1 dimensions with delta < 0.8
 */
export function computeSimilarity(
  dimensionDeltas: Record<DimensionKey, number>
): "low" | "medium" | "high" {
  const threshold = 0.8;
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
  
  let similarCount = 0;
  for (const key of dimensionKeys) {
    if (dimensionDeltas[key] < threshold) {
      similarCount++;
    }
  }

  if (similarCount >= 3) {
    return "high";
  } else if (similarCount === 2) {
    return "medium";
  } else {
    return "low";
  }
}

