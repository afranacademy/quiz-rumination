import type { Comparison } from "@/domain/compare/types";
import type { DimensionKey } from "@/domain/quiz/types";
import { DIMENSIONS } from "@/domain/quiz/dimensions";
import { getLargestDifferenceDimension } from "./relationalContent";
// import { computeSimilarity } from "./computeSimilarity"; // Unused
import { getMisunderstandingRisk } from "./relationalContent";

export type Direction = "A_higher" | "B_higher" | "none";
export type Level = "low" | "medium" | "high";
export type Relation = "similar" | "different" | "very_different";

export type DimensionState = {
  dimension: DimensionKey;
  aScore: number;
  bScore: number;
  aLevel: Level;
  bLevel: Level;
  delta: number;
  relation: Relation;
  direction: Direction; // Normalized: A_higher, B_higher, or none (if equal within epsilon)
  styleDelta: boolean; // ONLY if already provided by existing output; otherwise always false
  valid: boolean; // true if scores are valid (not NaN), false otherwise
};

export type CompareState = {
  nameA: string;
  nameB: string;
  dominantDimension: DimensionKey;
  dominantTied: boolean; // true when multiple dimensions share the same max delta
  similarityLabel: string; // From existing computeSimilarity or summarySimilarity
  riskLabel: string; // From getMisunderstandingRisk
  riskCountVeryDifferent: number;
  dimensions: Record<DimensionKey, DimensionState>;
  lowConfidence: boolean; // ONLY when data truly incomplete
  veryLowConfidence: boolean; // ONLY when data severely incomplete
};

const EPSILON = 0.0001; // For direction normalization (not a new threshold)

/**
 * Builds CompareState strictly from existing Comparison outputs.
 * MUST NOT re-score, re-weight, or reinterpret answers.
 * Uses ONLY existing computed results.
 */
export function buildCompareState(input: {
  comparison: Comparison;
  nameA: string;
  nameB: string;
  styleDeltaPerDimension?: Record<DimensionKey, boolean>; // Optional: if already computed
}): CompareState {
  const { comparison, nameA, nameB, styleDeltaPerDimension } = input;

  // Build dimension states from existing Comparison outputs
  // MUST produce DimensionState for all 4 dimensions
  const dimensions: Record<DimensionKey, DimensionState> = {} as Record<DimensionKey, DimensionState>;
  let validDimensionsCount = 0;
  let veryDifferentCount = 0;

  for (const key of DIMENSIONS) {
    const dim = comparison.dimensions[key];
    
    // Null-guard: if dimension is missing from comparison, create invalid state
    if (!dim) {
      dimensions[key] = {
        dimension: key,
        aScore: NaN,
        bScore: NaN,
        aLevel: "low",
        bLevel: "low",
        delta: NaN,
        relation: "similar",
        direction: "none",
        styleDelta: false,
        valid: false,
      };
      continue;
    }
    
    // Check if dimension is valid (not NaN)
    const isValid = !isNaN(dim.aScore) && !isNaN(dim.bScore) && !isNaN(dim.delta);
    if (isValid) {
      validDimensionsCount++;
    }

    // Count very_different for risk calculation (only if valid)
    if (isValid && dim.relation === "very_different") {
      veryDifferentCount++;
    }

    // Normalize direction: "a_higher"/"b_higher"/"equal" → "A_higher"/"B_higher"/"none"
    let normalizedDirection: Direction;
    if (!isValid) {
      normalizedDirection = "none";
    } else if (dim.direction === "equal" || Math.abs(dim.aScore - dim.bScore) < EPSILON) {
      normalizedDirection = "none";
    } else if (dim.direction === "a_higher") {
      normalizedDirection = "A_higher";
    } else if (dim.direction === "b_higher") {
      normalizedDirection = "B_higher";
    } else {
      // Fallback: compute from scores if direction not set
      if (dim.aScore > dim.bScore + EPSILON) {
        normalizedDirection = "A_higher";
      } else if (dim.bScore > dim.aScore + EPSILON) {
        normalizedDirection = "B_higher";
      } else {
        normalizedDirection = "none";
      }
    }

    // styleDelta: ONLY if already provided, otherwise always false
    const styleDelta = styleDeltaPerDimension?.[key] ?? false;

    dimensions[key] = {
      dimension: key,
      aScore: dim.aScore,
      bScore: dim.bScore,
      aLevel: dim.aLevel,
      bLevel: dim.bLevel,
      delta: dim.delta,
      relation: dim.relation,
      direction: normalizedDirection,
      styleDelta,
      valid: isValid,
    };
  }

  // Compute dominant dimension using existing logic
  const largestDiff = getLargestDifferenceDimension({
    stickiness: dimensions.stickiness,
    pastBrooding: dimensions.pastBrooding,
    futureWorry: dimensions.futureWorry,
    interpersonal: dimensions.interpersonal,
  });
  const dominantDimension = largestDiff?.key ?? "stickiness"; // Fallback
  const dominantTied = largestDiff?.tied ?? false;

  // Compute similarity label from existing summarySimilarity
  const similarityLabelMap: Record<"low" | "medium" | "high", string> = {
    low: "شباهت کم",
    medium: "شباهت متوسط",
    high: "شباهت زیاد",
  };
  const similarityLabel = similarityLabelMap[comparison.summarySimilarity] || "شباهت متوسط";

  // Compute risk label from existing getMisunderstandingRisk logic
  const risk = getMisunderstandingRisk({
    stickiness: { relation: dimensions.stickiness.relation },
    pastBrooding: { relation: dimensions.pastBrooding.relation },
    futureWorry: { relation: dimensions.futureWorry.relation },
    interpersonal: { relation: dimensions.interpersonal.relation },
  });
  // Quantized phrasing for risk label based on actual veryDifferentCount
  let riskLabel: string;
  if (risk === "low") {
    riskLabel = "الگوهای ذهنی شما معمولاً به سوءتفاهم منجر نمی‌شوند.";
  } else if (risk === "medium") {
    riskLabel = "در برخی موقعیت‌ها احتمال سوءبرداشت وجود دارد.";
  } else {
    // risk === "high" - use quantized phrasing
    if (veryDifferentCount >= 3) {
      riskLabel = "در اکثر الگوهای کلیدی، احتمال سوءتفاهم بیشتر است.";
    } else {
      riskLabel = "در چند الگوی کلیدی، احتمال سوءتفاهم بیشتر است.";
    }
  }

  // Detect confidence: ONLY when data truly incomplete
  // lowConfidence: valid dimensions < 3 OR any dimension has NaN/missing scores
  const lowConfidence = validDimensionsCount < 3 || validDimensionsCount < DIMENSIONS.length;
  // veryLowConfidence: valid dimensions < 2 (severely incomplete)
  const veryLowConfidence = validDimensionsCount < 2;

  return {
    nameA,
    nameB,
    dominantDimension,
    dominantTied,
    similarityLabel,
    riskLabel,
    riskCountVeryDifferent: veryDifferentCount,
    dimensions,
    lowConfidence,
    veryLowConfidence,
  };
}

