import { COMPARE_TEMPLATES, findTemplatesByMetadata, type CompareTemplate } from "./templates/compareText.fa";
import type { Section, Relation, Direction, Variance } from "./templates/compareText.fa";
import type { DimensionKey } from "@/domain/quiz/types";
import type { CompareState } from "./buildCompareState";

/**
 * Get template by metadata-based lookup (NOT TEXT_ID-based).
 * Returns template with explicit fallback rules if not found.
 */
export function getCompareTemplate(args: {
  section: Section;
  dimension?: DimensionKey;
  relation?: Relation;
  direction?: Direction;
  variance?: Variance;
  compareState?: CompareState; // For fallback rules (confidence flags)
}): CompareTemplate {
  const { section, dimension, relation, direction, variance, compareState } = args;

  // Primary lookup: exact match on metadata fields
  const matches = findTemplatesByMetadata({
    section,
    dimension,
    relation,
    direction,
    variance,
  });

  if (matches.length > 0) {
    // Return first match (should be unique based on metadata)
    if (import.meta.env.DEV && matches.length > 1) {
      console.warn(
        `[getCompareTemplate] Multiple templates found for ${section} + ${dimension} + ${relation} + ${direction} + ${variance}`,
        matches.map((m) => m.id)
      );
    }
    return matches[0];
  }

  // Fallback logic: explicit rules to prevent wrong text
  if (import.meta.env.DEV) {
    console.warn(
      `[getCompareTemplate] No exact match found for ${section} + ${dimension} + ${relation} + ${direction} + ${variance}. Using fallback.`
    );
  }

  // Fallback 1: If dimension-specific and lowConfidence, try Phase 8 dimension fallback (H01-H04)
  if (dimension && compareState?.lowConfidence && !compareState.veryLowConfidence) {
    const phase8Fallback = findTemplatesByMetadata({
      section: "safety",
      dimension,
      relation: "similar",
      direction: "none",
      variance: "mixed",
    });
    if (phase8Fallback.length > 0) {
      if (import.meta.env.DEV) {
        console.warn(`[getCompareTemplate] Using Phase 8 dimension fallback for ${dimension}`);
      }
      return phase8Fallback[0];
    }
  }

  // Fallback 2: If veryLowConfidence, use Phase 8B global (H05 or H06)
  if (compareState?.veryLowConfidence) {
    const phase8BGlobal = findTemplatesByMetadata({
      section: "safety",
      dimension: "interpersonal", // H05/H06 use interpersonal as dimension
      relation: "similar",
      direction: "none",
      variance: "mixed",
    });
    // Prefer H06 (very_low_confidence) if veryLowConfidence, else H05
    const preferredId = compareState.veryLowConfidence ? "H06_global_very_low_confidence" : "H05_global_low_confidence";
    const preferred = phase8BGlobal.find((t) => t.id === preferredId);
    if (preferred) {
      if (import.meta.env.DEV) {
        console.warn(`[getCompareTemplate] Using Phase 8B global fallback: ${preferredId}`);
      }
      return preferred;
    }
    if (phase8BGlobal.length > 0) {
      if (import.meta.env.DEV) {
        console.warn(`[getCompareTemplate] Using Phase 8B global fallback: ${phase8BGlobal[0].id}`);
      }
      return phase8BGlobal[0];
    }
  }

  // Fallback 3: Use Phase 1 global safety (A99) or Phase 6 safety by dimension
  if (dimension) {
    // Try Phase 6 safety (F05-F08) for the dimension
    const phase6Safety = findTemplatesByMetadata({
      section: "safety",
      dimension,
      relation: "similar",
      direction: "none",
      variance: "none",
    });
    if (phase6Safety.length > 0) {
      if (import.meta.env.DEV) {
        console.warn(`[getCompareTemplate] Using Phase 6 safety fallback for ${dimension}`);
      }
      return phase6Safety[0];
    }
  }

  // Final fallback: Phase 1 global safety (A99)
  const globalSafety = COMPARE_TEMPLATES.find((t) => t.id === "A99_global_safety");
  if (globalSafety) {
    if (import.meta.env.DEV) {
      console.warn(`[getCompareTemplate] Using final fallback: A99_global_safety`);
    }
    return globalSafety;
  }

  // Last resort: return first template of the section (should not happen)
  const sectionTemplates = COMPARE_TEMPLATES.filter((t) => t.section === section);
  if (sectionTemplates.length > 0) {
    if (import.meta.env.DEV) {
      console.error(
        `[getCompareTemplate] CRITICAL: No fallback found, using first template of section ${section}: ${sectionTemplates[0].id}`
      );
    }
    return sectionTemplates[0];
  }

  // Should never reach here, but provide a safe default
  if (import.meta.env.DEV) {
    console.error(`[getCompareTemplate] CRITICAL: No templates found for section ${section}`);
  }
  return COMPARE_TEMPLATES[0]; // Return first template as absolute last resort
}

