import { GOLDEN_CASES } from "./compareGoldenCases";
import { buildCompareState } from "../buildCompareState";
import {
  selectDominantDifferenceTemplate,
  selectMentalMapTemplate,
  selectKeyDifferencesTemplate,
  selectLoopTemplate,
  selectFeltExperienceTemplate,
  selectTriggersTemplate,
  selectSafetyTemplate,
} from "../selectCompareTemplates";
import type { DimensionKey } from "@/domain/quiz/types";
import { levelOfDimension } from "@/domain/quiz/dimensions";

/**
 * DEV-only: Creates a mock Comparison from dimension scores.
 * This bypasses the answer-to-dimension mapping for testing purposes.
 */
function createMockComparison(
  aScores: Record<DimensionKey, number>,
  bScores: Record<DimensionKey, number>
): import("@/domain/compare/types").Comparison {
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];

  const dimensions: Record<
    DimensionKey,
    {
      aScore: number;
      bScore: number;
      delta: number;
      relation: "similar" | "different" | "very_different";
      direction: "a_higher" | "b_higher" | "equal";
      aLevel: "low" | "medium" | "high";
      bLevel: "low" | "medium" | "high";
    }
  > = {} as any;

  let similarCount = 0;

  for (const key of dimensionKeys) {
    const aScore = aScores[key];
    const bScore = bScores[key];
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
    id: `compare-test-${Date.now()}`,
    createdAt: new Date().toISOString(),
    attemptAId: "test-attempt-a",
    attemptBId: "test-attempt-b",
    summarySimilarity,
    dimensions,
  };
}

/**
 * DEV-only: Runs golden test cases and logs template selections.
 * Guard: Only runs in DEV mode, never in PROD.
 */
export function runCompareGoldenCases(): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.group("[CompareGoldenCases] Running template selection tests");

  for (const testCase of GOLDEN_CASES) {
    console.group(`\n📋 Case: ${testCase.label}`);

    try {
      // Create mock Comparison from dimension scores
      const comparison = createMockComparison(testCase.aScores, testCase.bScores);

      // Build CompareState
      const compareState = buildCompareState({
        comparison,
        nameA: "TestA",
        nameB: "TestB",
      });

      // Log state summary
      console.log("State:", {
        dominantDimension: compareState.dominantDimension,
        similarityLabel: compareState.similarityLabel,
        lowConfidence: compareState.lowConfidence,
        veryLowConfidence: compareState.veryLowConfidence,
        dimensions: Object.entries(compareState.dimensions).map(([key, dim]) => ({
          dimension: key,
          relation: dim.relation,
          direction: dim.direction,
        })),
      });

      // Select templates for each section
      const selections: Record<string, string> = {};

      // Dominant difference
      try {
        const { template } = selectDominantDifferenceTemplate(compareState);
        selections["dominant_difference"] = template.id;
      } catch (e) {
        selections["dominant_difference"] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
      }

      // Mental map (all 4 dimensions)
      const mentalMapSelections: Record<string, string> = {};
      const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
      for (const dim of dimensionKeys) {
        try {
          const { template } = selectMentalMapTemplate(compareState, dim);
          mentalMapSelections[dim] = template.id;
        } catch (e) {
          mentalMapSelections[dim] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
      selections["mental_map"] = JSON.stringify(mentalMapSelections);

      // Key differences
      try {
        const result = selectKeyDifferencesTemplate(compareState);
        selections["key_differences"] = result ? result.template.id : "null (very_different)";
      } catch (e) {
        selections["key_differences"] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
      }

      // Loop
      try {
        const { template } = selectLoopTemplate(compareState);
        selections["loop"] = template.id;
      } catch (e) {
        selections["loop"] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
      }

      // Felt experience
      try {
        const { template } = selectFeltExperienceTemplate(compareState);
        selections["felt_experience"] = template.id;
      } catch (e) {
        selections["felt_experience"] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
      }

      // Triggers
      try {
        const { template } = selectTriggersTemplate(compareState);
        selections["triggers"] = template.id;
      } catch (e) {
        selections["triggers"] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
      }

      // Safety
      try {
        const { template } = selectSafetyTemplate(compareState);
        selections["safety"] = template.id;
      } catch (e) {
        selections["safety"] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
      }

      // Log selections
      console.log("Selected templates:", selections);
    } catch (e) {
      console.error(`❌ Error in case "${testCase.label}":`, e);
    }

    console.groupEnd();
  }

  console.groupEnd();
}

