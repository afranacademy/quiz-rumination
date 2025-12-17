import type { CompareState } from "./buildCompareState";
import type { DimensionKey } from "@/domain/quiz/types";
import { DIMENSIONS } from "@/domain/quiz/dimensions";

/**
 * Gets the top dimension (highest score) for a person from CompareState.
 * 
 * Rules:
 * 1) Highest score wins
 * 2) If tied, use deterministic order: stickiness, pastBrooding, futureWorry, interpersonal
 * 
 * This function reads ONLY from CompareState and does NOT change scoring.
 */
export function getTopDimensionForPerson(
  state: CompareState,
  person: "A" | "B"
): DimensionKey {
  // Fixed order for tie-breaking (deterministic)
  const dimensionOrder: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
  
  let maxScore = -Infinity;
  let topDimension: DimensionKey = "stickiness"; // Default fallback
  
  // Find the dimension with the highest score for this person
  for (const dim of dimensionOrder) {
    const dimState = state.dimensions[dim];
    if (!dimState || !dimState.valid) {
      continue; // Skip invalid dimensions
    }
    
    const score = person === "A" ? dimState.aScore : dimState.bScore;
    
    // Skip NaN or invalid scores
    if (typeof score !== "number" || isNaN(score)) {
      continue;
    }
    
    // If this score is higher, or if it's equal and we haven't found one yet, use it
    // Since we iterate in fixed order, ties will go to the first in order
    if (score > maxScore) {
      maxScore = score;
      topDimension = dim;
    }
  }
  
  // If no valid dimensions found, return default
  if (maxScore === -Infinity) {
    return "stickiness";
  }
  
  return topDimension;
}

