import type { CompareState } from "./buildCompareState";
import type { DimensionKey } from "@/domain/quiz/types";
import { DIMENSIONS } from "@/domain/quiz/dimensions";
import { getDimensionNameForSnapshot } from "./relationalContent";
import {
  selectDominantDifferenceTemplate,
  selectMentalMapTemplate,
  selectKeyDifferencesTemplate,
  selectLoopTemplate,
  selectTriggersTemplate,
  selectFeltExperienceTemplate,
  selectSafetyTemplate,
} from "./selectCompareTemplates";
import { renderTemplate } from "./renderTemplate";
// import { getCompareTemplate } from "./getCompareTemplate"; // Unused
import { aggregateCompareInsights } from "./aggregateCompareInsights";

// const LEVEL_LABELS: Record<"low" | "medium" | "high", string> = {
//   low: "کم",
//   medium: "متوسط",
//   high: "زیاد",
// }; // Unused

export type CompareNarratives = {
  dominantDimension: DimensionKey;
  similarityLabel: string;
  riskLabel: string;

  dominantDifferenceText: string; // Phase 1 A01-A04 (rendered)
  globalSafetyText: string;       // A99 (rendered) - same as safetyText for now

  mentalMapByDimension: Record<DimensionKey, string>; // Phase 2 Bxx (rendered)

  keyDifferencesText: string;     // Phase 3 Cxx OR Phase 7 Gxx (rendered, chosen deterministically)
  loopText: string;              // Phase 4 Dxx (rendered)
  feltExperienceText: string;     // Phase 5 Exx (rendered; may contain literal A/B – DO NOT replace unless {{A}}/{{B}})
  triggersText: string;           // Phase 6 F01-F04 (rendered; keep bullets)
  safetyText: string;             // Phase 6 F05-F08 OR Phase 8 fallback Hxx (rendered)

  // Additional metadata for UI/PDF layout (kept for backward compatibility)
  meta: {
    nameA: string;
    nameB: string;
    dominantDimension: DimensionKey;
    similarityLabel: string;
    riskLabel: string;
    riskCountVeryDifferent: number;
    dominantTied: boolean;
  };

  // Mental map with full metadata (for PDF layout)
  mentalMap: Array<{
    dimension: DimensionKey;
    relation: "similar" | "different" | "very_different";
    text: string;
    aLevel: "low" | "medium" | "high" | null;
    bLevel: "low" | "medium" | "high" | null;
    isUnknown: boolean;
  }>;

  // Loop with parsed steps (for PDF layout)
  loop: {
    title: string;
    text: string;
    steps: string[];
  };

  // Triggers with parsed list (for PDF layout)
  triggers: {
    text: string;
    list: string[];
  };

  // Similarities and differences lists (matching UI)
  similarities: DimensionKey[];
  differences: DimensionKey[];

  // Computed complementary sentence matching UI logic
  similarityComplementarySentence: string;

  // Dominant difference headline (for UI/PDF)
  dominantDifference: {
    headline: string;
    text: string;
  };
};

/**
 * Builds all narratives from CompareState using template engine ONLY.
 * Single source of truth for both UI and PDF.
 * 
 * Rules:
 * - All narratives come from selectCompareTemplates + renderTemplate
 * - keyDifferences NEVER null (fallback for very_different)
 * - loop.steps and triggers.list parsed from template text
 * - feltExperience parsed based on relation and direction
 * - headline uses dominantTied if available
 */
export function getCompareNarratives(
  state: CompareState,
  vars: { A: string; B: string }
): CompareNarratives {
  const { A: nameA, B: nameB } = vars;

  // 1. Dominant Difference
  const dominantDiff = selectDominantDifferenceTemplate(state);
  const dominantDifferenceText = renderTemplate(
    dominantDiff.template.text,
    { A: nameA, B: nameB },
    dominantDiff.template.section
  );
  const dimensionLabel = getDimensionNameForSnapshot(state.dominantDimension);
  const headline = state.dominantTied
    ? `یکی از بزرگ‌ترین تفاوت‌های ذهنی شما در: ${dimensionLabel}`
    : `بزرگ‌ترین تفاوت ذهنی شما در: ${dimensionLabel}`;

  // 2. Mental Map (all 4 dimensions)
  const mentalMap = DIMENSIONS.map((dim) => {
    const mapTemplate = selectMentalMapTemplate(state, dim);
    const dimState = state.dimensions[dim];
    if (!dimState) return null; // Null-guard
    
    // Check if dimension is unknown (NaN scores)
    const isUnknown = !dimState.valid || 
      isNaN(dimState.aScore ?? NaN) || 
      isNaN(dimState.bScore ?? NaN) || 
      isNaN(dimState.delta ?? NaN);
    
    return {
      dimension: dim,
      relation: dimState.relation,
      text: renderTemplate(mapTemplate.template.text, { A: nameA, B: nameB }, mapTemplate.template.section),
      aLevel: isUnknown ? null : dimState.aLevel,
      bLevel: isUnknown ? null : dimState.bLevel,
      isUnknown,
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  // 3. Key Differences (can be null for very_different)
  const keyDiffResult = selectKeyDifferencesTemplate(state);
  let keyDifferencesText: string | null = null;
  // let _usedPhase7 = false; // Unused
  
  if (keyDiffResult) {
    // Phase 3 or Phase 7 template found
    keyDifferencesText = renderTemplate(
      keyDiffResult.template.text,
      { A: nameA, B: nameB },
      keyDiffResult.template.section
    );
    // Check if it's Phase 7 (variance === "stable")
    // _usedPhase7 = keyDiffResult.template.variance === "stable"; // Unused
  }
  // If null, caller should handle very_different case (no narrative paragraph, only bullet list)

  // 4. Loop
  const loopTemplate = selectLoopTemplate(state);
  const loopText = renderTemplate(loopTemplate.template.text, { A: nameA, B: nameB }, loopTemplate.template.section);
  const loopSteps = loopText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  
  const dimState = state.dimensions[state.dominantDimension];
  const loopRelation = dimState.relation;
  const loopTitle =
    loopRelation === "similar"
      ? "وقتی این همسویی فعال می‌شود، معمولاً این چرخه شکل می‌گیرد:"
      : "وقتی این تفاوت فعال می‌شود، معمولاً این چرخه شکل می‌گیرد:";

  // 5. Triggers
  const triggersTemplate = selectTriggersTemplate(state);
  const triggersText = renderTemplate(triggersTemplate.template.text, { A: nameA, B: nameB }, triggersTemplate.template.section);
  const triggersList = triggersText
    .split("\n")
    .map((line) => line.replace(/^•\s*/, "").trim())
    .filter((line) => line.length > 0);

  // 6. Felt Experience
  const feltResult = selectFeltExperienceTemplate(state);
  const feltExperienceText = feltResult
    ? renderTemplate(feltResult.template.text, { A: nameA, B: nameB }, feltResult.template.section)
    : null;

  // 7. Safety
  const safetyTemplate = selectSafetyTemplate(state);
  const safetyText = renderTemplate(safetyTemplate.template.text, { A: nameA, B: nameB }, safetyTemplate.template.section);
  
  // Global safety text (A99) - for now, use same as safetyText
  // If A99 template exists separately, it should be selected here
  const globalSafetyText = safetyText;

  // 8. Aggregate insights for similarities/differences lists (matching UI)
  const insights = aggregateCompareInsights(state);
  const similarities = insights.similarDims;
  const differences = [...insights.veryDifferentDims, ...insights.differentDims];

  // 9. Similarity Complementary Sentence (matching UI logic)
  // UI computes this based on veryDifferentCount from insights
  const veryDifferentCount = insights.veryDifferentDims.length;
  let similarityComplementarySentence: string;
  if (veryDifferentCount >= 3) {
    similarityComplementarySentence = "در اکثر الگوهای کلیدی، ذهن‌های شما متفاوت واکنش نشان می‌دهند.";
  } else if (veryDifferentCount >= 1) {
    similarityComplementarySentence = "در چند الگوی کلیدی، ذهن‌های شما متفاوت واکنش نشان می‌دهند.";
  } else {
    // Check if there are any different dimensions (not just very_different)
    const differentCount = insights.differentDims.length;
    if (differentCount > 0) {
      similarityComplementarySentence = "در برخی الگوهای کلیدی، تفاوت دیده می‌شود.";
    } else {
      similarityComplementarySentence = "در بسیاری از موقعیت‌ها، واکنش ذهنی شما به هم نزدیک است.";
    }
  }

  // Build mentalMapByDimension (flat Record for easy access)
  const mentalMapByDimension: Record<DimensionKey, string> = {} as Record<DimensionKey, string>;
  for (const item of mentalMap) {
    mentalMapByDimension[item.dimension] = item.text;
  }
  // Ensure all dimensions are present (use empty string for missing)
  for (const dim of DIMENSIONS) {
    if (!(dim in mentalMapByDimension)) {
      mentalMapByDimension[dim] = "";
    }
  }

  // Key differences text: handle Phase 7 and fallback for very_different
  // If keyDiffResult is null (very_different), use empty string (caller should handle)
  let finalKeyDifferencesText: string;
  if (keyDifferencesText === null) {
    // very_different case - no narrative paragraph, only bullet list
    finalKeyDifferencesText = "";
  } else {
    finalKeyDifferencesText = keyDifferencesText;
  }

  // Felt experience text: handle null case
  const finalFeltExperienceText = feltExperienceText ?? "";

  return {
    // Flat structure (primary API)
    dominantDimension: state.dominantDimension,
    similarityLabel: state.similarityLabel,
    riskLabel: state.riskLabel,
    dominantDifferenceText,
    globalSafetyText,
    mentalMapByDimension,
    keyDifferencesText: finalKeyDifferencesText,
    loopText,
    feltExperienceText: finalFeltExperienceText,
    triggersText,
    safetyText,

    // Additional metadata for UI/PDF layout (backward compatibility)
    meta: {
      nameA,
      nameB,
      dominantDimension: state.dominantDimension,
      similarityLabel: state.similarityLabel,
      riskLabel: state.riskLabel,
      riskCountVeryDifferent: state.riskCountVeryDifferent,
      dominantTied: state.dominantTied ?? false,
    },
    dominantDifference: {
      headline,
      text: dominantDifferenceText,
    },
    mentalMap,
    loop: {
      title: loopTitle,
      text: loopText,
      steps: loopSteps,
    },
    triggers: {
      text: triggersText,
      list: triggersList,
    },
    similarities,
    differences,
    similarityComplementarySentence,
  };
}

