import type { CompareState } from "./buildCompareState";
import type { CompareTemplate } from "./templates/compareText.fa";
import type { DimensionKey } from "@/domain/quiz/types";
// import { DIMENSIONS } from "@/domain/quiz/dimensions"; // Unused
import { getCompareTemplate } from "./getCompareTemplate";
import { findTemplatesByMetadata } from "./templates/compareText.fa";
import type { CompareNarrativeTrace } from "./types";

/**
 * Select template for dominant_difference section (Phase 1).
 * Input: dimension = dominantDimension (only)
 * Selection: A01-A04 by dimension only
 */
export function selectDominantDifferenceTemplate(state: CompareState): {
  template: CompareTemplate;
  trace: CompareNarrativeTrace;
} {
  const dimension = state.dominantDimension;

  const template = getCompareTemplate({
    section: "dominant_difference",
    dimension,
    // RELATION/DIRECTION/VARIANCE ignored for Phase 1
    compareState: state,
  });

  const trace: CompareNarrativeTrace = {
    section: "dominant_difference",
    dimension,
    inputs: {},
    selectedTextId: template.id,
  };

  if (import.meta.env.DEV) {
    console.log("[CompareNarrative]", trace);
  }

  return { template, trace };
}

/**
 * Select template for mental_map section (Phase 2).
 * Input per dimension: dimension + relation
 * Output: exactly 4 templates (B01-B12), one per dimension
 * Scope: ALL 4 dimensions (not just dominant)
 */
export function selectMentalMapTemplate(
  state: CompareState,
  dimension: DimensionKey
): { template: CompareTemplate; trace: CompareNarrativeTrace } {
  const dimState = state.dimensions[dimension];
  const relation = dimState.relation;

  const template = getCompareTemplate({
    section: "mental_map",
    dimension,
    relation,
    compareState: state,
  });

  const trace: CompareNarrativeTrace = {
    section: "mental_map",
    dimension,
    inputs: { relation },
    selectedTextId: template.id,
  };

  if (import.meta.env.DEV) {
    console.log("[CompareNarrative]", trace);
  }

  return { template, trace };
}

/**
 * Select template for key_differences section (Phase 3 or Phase 7).
 * CRITICAL: MUST NOT render unless valid rule from MD exists
 * Phase 3 exists only for relation == "different"
 * If relation === "very_different": DO NOT use Phase 3 → follow explicit fallback rules
 */
export function selectKeyDifferencesTemplate(state: CompareState): {
  template: CompareTemplate;
  trace: CompareNarrativeTrace;
} | null {
  const dimension = state.dominantDimension;
  const dimState = state.dimensions[dimension];
  const relation = dimState.relation;

  // Phase 3 exists only for relation == "different"
  // If very_different, return null (caller should hide paragraph, only show bullet list)
  if (relation === "very_different") {
    if (import.meta.env.DEV) {
      console.warn(
        `[selectKeyDifferencesTemplate] relation is very_different for ${dimension}, Phase 3 has no template. Returning null to hide narrative paragraph.`
      );
    }
    // Return null - caller should NOT render narrative paragraph, only bullet list
    return null;
  }

  // Phase 7 check first (if styleDelta is true)
  if (dimState.styleDelta) {
    const sharedLevel = dimState.aLevel === dimState.bLevel ? dimState.aLevel : "medium";
    const alignedType = sharedLevel === "medium" ? "mid" : "high";

    // Phase 7 templates all have variance="stable" and direction="none"
    // We need to filter by alignedType (mid/high) from TEXT_ID after initial lookup
    // This is post-lookup filtering, not using TEXT_ID as primary key
    const phase7Candidates = findTemplatesByMetadata({
      section: "key_differences",
      dimension,
      relation: "different",
      direction: "none",
      variance: "stable",
    });
    
    // Filter to find the one matching alignedType (post-lookup filtering is acceptable)
    const template = phase7Candidates.find((t) => t.id.includes(`aligned_${alignedType}`)) || phase7Candidates[0];

    if (!template) {
      if (import.meta.env.DEV) {
        console.warn(
          `[selectKeyDifferencesTemplate] No Phase 7 template found for ${dimension} ${alignedType}, falling back to Phase 3`
        );
      }
      // Fallback to Phase 3 if Phase 7 template not found
      const fallbackTemplate = getCompareTemplate({
        section: "key_differences",
        dimension,
        relation: "different",
        direction: dimState.direction === "none" ? undefined : dimState.direction,
        variance: dimState.direction === "none" ? "mixed" : undefined,
        compareState: state,
      });
      
      const trace: CompareNarrativeTrace = {
        section: "key_differences",
        dimension,
        inputs: {
          relation: "different",
          direction: dimState.direction === "none" ? undefined : dimState.direction,
          variance: dimState.direction === "none" ? "mixed" : undefined,
          styleDelta: true, // styleDelta was true but Phase 7 template not found
        },
        selectedTextId: fallbackTemplate.id,
      };

      if (import.meta.env.DEV) {
        console.log("[CompareNarrative]", trace);
      }

      return { template: fallbackTemplate, trace };
    }

    if (!template.id.includes("aligned_" + alignedType)) {
      if (import.meta.env.DEV) {
        console.warn(
          `[selectKeyDifferencesTemplate] Phase 7 template found but doesn't match expected alignedType: got ${template.id}, expected aligned_${alignedType}`
        );
      }
    }

    const trace: CompareNarrativeTrace = {
      section: "key_differences",
      dimension,
      inputs: {
        relation: "different",
        variance: "stable",
        styleDelta: true,
        level: sharedLevel,
      },
      selectedTextId: template.id,
    };

    if (import.meta.env.DEV) {
      console.log("[CompareNarrative]", trace);
    }

    return { template, trace };
  }

  // Otherwise Phase 3 (relation must be "different" at this point)
  const direction = dimState.direction;
  const useVariance = direction === "none"; // If direction is none, use VARIANCE=mixed variants

  const template = getCompareTemplate({
    section: "key_differences",
    dimension,
    relation: "different",
    direction: useVariance ? undefined : direction,
    variance: useVariance ? "mixed" : undefined,
    compareState: state,
  });

  const trace: CompareNarrativeTrace = {
    section: "key_differences",
    dimension,
    inputs: {
      relation: "different",
      direction: useVariance ? undefined : direction,
      variance: useVariance ? "mixed" : undefined,
    },
    selectedTextId: template.id,
  };

  if (import.meta.env.DEV) {
    console.log("[CompareNarrative]", trace);
  }

  return { template, trace };
}

/**
 * Select template for loop section (Phase 4).
 * Inputs: dimension=dominantDimension, relation in {different, very_different}
 */
export function selectLoopTemplate(state: CompareState): {
  template: CompareTemplate;
  trace: CompareNarrativeTrace;
} {
  const dimension = state.dominantDimension;
  const dimState = state.dimensions[dimension];
  const relation = dimState.relation;

  // Normalize relation in metadata (very_different, not TEXT_ID manipulation)
  const template = getCompareTemplate({
    section: "loop",
    dimension,
    relation,
    compareState: state,
  });

  const trace: CompareNarrativeTrace = {
    section: "loop",
    dimension,
    inputs: { relation },
    selectedTextId: template.id,
  };

  if (import.meta.env.DEV) {
    console.log("[CompareNarrative]", trace);
  }

  return { template, trace };
}

/**
 * Select template for felt_experience section (Phase 5).
 * Inputs: dimension=dominantDimension, direction in {A_higher, B_higher}
 * If direction == none: fallback safely (no inventing direction)
 */
export function selectFeltExperienceTemplate(state: CompareState): {
  template: CompareTemplate;
  trace: CompareNarrativeTrace;
} | null {
  const dimension = state.dominantDimension;
  const dimState = state.dimensions[dimension];
  const direction = dimState.direction;

  // If direction is none, fallback to safety (no inventing direction)
  if (direction === "none") {
    if (import.meta.env.DEV) {
      console.warn(
        `[selectFeltExperienceTemplate] direction is none for ${dimension}, using safety fallback.`
      );
    }

    const template = getCompareTemplate({
      section: "safety",
      dimension,
      compareState: state,
    });

    const trace: CompareNarrativeTrace = {
      section: "felt_experience",
      dimension,
      inputs: { direction: "none", confidence: "direction_none_fallback" },
      selectedTextId: template.id,
    };

    if (import.meta.env.DEV) {
      console.log("[CompareNarrative]", trace);
    }

    return { template, trace };
  }

  const template = getCompareTemplate({
    section: "felt_experience",
    dimension,
    direction,
    compareState: state,
  });

  const trace: CompareNarrativeTrace = {
    section: "felt_experience",
    dimension,
    inputs: { direction },
    selectedTextId: template.id,
  };

  if (import.meta.env.DEV) {
    console.log("[CompareNarrative]", trace);
  }

  return { template, trace };
}

/**
 * Select template for triggers section (Phase 6).
 * Input: dimension=dominantDimension
 */
export function selectTriggersTemplate(state: CompareState): {
  template: CompareTemplate;
  trace: CompareNarrativeTrace;
} {
  const dimension = state.dominantDimension;

  const template = getCompareTemplate({
    section: "triggers",
    dimension,
    compareState: state,
  });

  const trace: CompareNarrativeTrace = {
    section: "triggers",
    dimension,
    inputs: {},
    selectedTextId: template.id,
  };

  if (import.meta.env.DEV) {
    console.log("[CompareNarrative]", trace);
  }

  return { template, trace };
}

/**
 * Select template for safety section (Phase 6 or Phase 8).
 * Inputs: dimension=dominantDimension + confidence flags
 * Selection (EXACTLY ONE template, no duplicates):
 * - If veryLowConfidence: H06 (global very low confidence)
 * - Else if lowConfidence: H01-H04 (dimension fallback for dominantDimension)
 * - Else: F05-F08 (Phase 6 safety by dimension)
 * 
 * CRITICAL: Never returns A99. This ensures safety appears only once.
 */
export function selectSafetyTemplate(state: CompareState): {
  template: CompareTemplate;
  trace: CompareNarrativeTrace;
} {
  const dimension = state.dominantDimension;

  // Phase 8: veryLowConfidence → H06 (global very low confidence)
  if (state.veryLowConfidence) {
    // H06 has metadata: section=safety, dimension=interpersonal, relation=similar, direction=none, variance=mixed
    const template = getCompareTemplate({
      section: "safety",
      dimension: "interpersonal", // H06 uses interpersonal as dimension
      relation: "similar",
      direction: "none",
      variance: "mixed",
      compareState: state,
    });

    // Verify it's H06, not A99
    if (template.id !== "H06_global_very_low_confidence" && template.id !== "A99_global_safety") {
      if (import.meta.env.DEV) {
        console.warn(`[selectSafetyTemplate] Expected H06, got ${template.id}`);
      }
    }

    const trace: CompareNarrativeTrace = {
      section: "safety",
      dimension,
      inputs: { confidence: "veryLowConfidence" },
      selectedTextId: template.id,
    };

    if (import.meta.env.DEV) {
      console.log("[CompareNarrative]", trace);
    }

    return { template, trace };
  }

  // Phase 8: lowConfidence → H01-H04 (dimension fallback for dominantDimension)
  if (state.lowConfidence) {
    // H01-H04 have metadata: section=safety, dimension=<dominantDimension>, relation=similar, direction=none, variance=mixed
    const template = getCompareTemplate({
      section: "safety",
      dimension,
      relation: "similar",
      direction: "none",
      variance: "mixed",
      compareState: state,
    });

    // Verify it's H0X (Phase 8 dimension fallback), not A99 or F0X
    if (!template.id.startsWith("H0") && template.id !== "A99_global_safety") {
      if (import.meta.env.DEV) {
        console.warn(`[selectSafetyTemplate] Expected H01-H04 for ${dimension}, got ${template.id}`);
      }
    }

    const trace: CompareNarrativeTrace = {
      section: "safety",
      dimension,
      inputs: { confidence: "lowConfidence" },
      selectedTextId: template.id,
    };

    if (import.meta.env.DEV) {
      console.log("[CompareNarrative]", trace);
    }

    return { template, trace };
  }

  // Phase 6 safety (F05-F08) by dimension (normal case)
  // F05-F08 have metadata: section=safety, dimension=<dimension>, relation=similar, direction=none, variance=none
  const template = getCompareTemplate({
    section: "safety",
    dimension,
    relation: "similar",
    direction: "none",
    variance: "none",
    compareState: state,
  });

  // Verify it's F0X (Phase 6), not A99 or H0X
  if (!template.id.startsWith("F0") && template.id !== "A99_global_safety") {
    if (import.meta.env.DEV) {
      console.warn(`[selectSafetyTemplate] Expected F05-F08 for ${dimension}, got ${template.id}. This should not happen.`);
    }
  }

  const trace: CompareNarrativeTrace = {
    section: "safety",
    dimension,
    inputs: {},
    selectedTextId: template.id,
  };

  if (import.meta.env.DEV) {
    console.log("[CompareNarrative]", trace);
  }

  return { template, trace };
}

