import type { DimensionKey } from "@/domain/quiz/types";
import { DIMENSIONS } from "@/domain/quiz/dimensions";
import type { CompareState } from "./buildCompareState";

// type Relation = "similar" | "different" | "very_different"; // Unused

export type AggregatedInsights = {
  similarDims: DimensionKey[];
  differentDims: DimensionKey[];
  veryDifferentDims: DimensionKey[];
  similarityLabel: "زیاد" | "متوسط" | "کم";
  riskLabel: "کم" | "متوسط" | "زیاد";
  riskCountVeryDifferent: number;
};

/**
 * Aggregates insights from CompareState.dimensions.
 * MUST be purely derived from state.dimensions[dim].relation.
 * This is the single canonical source for similarities/differences computation.
 */
export function aggregateCompareInsights(state: CompareState): AggregatedInsights {
  const similarDims: DimensionKey[] = [];
  const differentDims: DimensionKey[] = [];
  const veryDifferentDims: DimensionKey[] = [];

  // Aggregate dimensions by relation
  for (const dim of DIMENSIONS) {
    const dimState = state.dimensions[dim];
    if (!dimState) {
      if (import.meta.env.DEV) {
        console.warn(`[aggregateCompareInsights] Missing dimension state for ${dim}, treating as similar`);
      }
      similarDims.push(dim);
      continue;
    }

    const relation = dimState.relation;
    if (relation === "similar") {
      similarDims.push(dim);
    } else if (relation === "different") {
      differentDims.push(dim);
    } else if (relation === "very_different") {
      veryDifferentDims.push(dim);
    } else {
      if (import.meta.env.DEV) {
        console.warn(`[aggregateCompareInsights] Unknown relation "${relation}" for ${dim}, treating as similar`);
      }
      similarDims.push(dim);
    }
  }

  const veryDifferentCount = veryDifferentDims.length;
  const differentCount = differentDims.length;

  // Compute similarity label (deterministic rules)
  // اگر veryDifferentCount >= 2 → شباهت کم
  // اگر veryDifferentCount == 1 یا differentCount >= 2 → شباهت متوسط
  // در غیر این صورت → شباهت زیاد
  let similarityLabel: "زیاد" | "متوسط" | "کم";
  if (veryDifferentCount >= 2) {
    similarityLabel = "کم";
  } else if (veryDifferentCount === 1 || differentCount >= 2) {
    similarityLabel = "متوسط";
  } else {
    similarityLabel = "زیاد";
  }

  // Compute risk label (deterministic rules)
  // اگر veryDifferentCount >= 2 → ریسک زیاد
  // اگر veryDifferentCount == 1 یا differentCount >= 2 → ریسک متوسط
  // else → ریسک کم
  let riskLabel: "کم" | "متوسط" | "زیاد";
  if (veryDifferentCount >= 2) {
    riskLabel = "زیاد";
  } else if (veryDifferentCount === 1 || differentCount >= 2) {
    riskLabel = "متوسط";
  } else {
    riskLabel = "کم";
  }

  return {
    similarDims,
    differentDims,
    veryDifferentDims,
    similarityLabel,
    riskLabel,
    riskCountVeryDifferent: veryDifferentCount,
  };
}

