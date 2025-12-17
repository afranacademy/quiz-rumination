import type { DimensionKey } from "@/domain/quiz/types";
import { levelOfDimension } from "@/domain/quiz/dimensions";
import { COMPARE_TEMPLATES } from "./templates/compareText.fa";
import { getDimensionNameForSnapshot } from "./relationalContent";

const EPSILON = 0.01; // For tie detection

const LEVEL_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

type PerPersonProfileSummary = {
  levelsByDim: Record<DimensionKey, "low" | "medium" | "high">;
  isUniform: boolean;
  overallIntensity: "low" | "medium" | "high";
  topDimension: DimensionKey | "none";
  tieType: "uniform" | "mixed_tie" | "single";
};

/**
 * Computes per-person profile summary using existing categorical levels only (no numeric averaging).
 * Returns comprehensive profile including uniform detection, overallIntensity (mode-based), topDimension, and tieType.
 */
function computePerPersonProfileSummary(
  dimensionScores: Record<DimensionKey, number>
): PerPersonProfileSummary {
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];

  // Compute levelsByDim using existing levelOfDimension function
  const levelsByDim: Record<DimensionKey, "low" | "medium" | "high"> = {} as Record<
    DimensionKey,
    "low" | "medium" | "high"
  >;
  for (const key of dimensionKeys) {
    const score = dimensionScores[key];
    if (typeof score === "number" && !isNaN(score)) {
      levelsByDim[key] = levelOfDimension(score);
    } else {
      // Default to low if invalid
      levelsByDim[key] = "low";
    }
  }

  // Check if uniform (all 4 levels are equal)
  const firstLevel = levelsByDim[dimensionKeys[0]];
  const isUniform = dimensionKeys.every((key) => levelsByDim[key] === firstLevel);

  // Compute overallIntensity
  let overallIntensity: "low" | "medium" | "high";
  if (isUniform) {
    // If uniform, use the shared level
    overallIntensity = firstLevel;
  } else {
    // Non-uniform: compute mode (most frequent level)
    const levelCounts: Record<"low" | "medium" | "high", number> = {
      low: 0,
      medium: 0,
      high: 0,
    };
    for (const key of dimensionKeys) {
      levelCounts[levelsByDim[key]]++;
    }

    // Find mode (most frequent)
    const maxCount = Math.max(levelCounts.low, levelCounts.medium, levelCounts.high);
    const modeLevels: Array<"low" | "medium" | "high"> = [];
    if (levelCounts.low === maxCount) modeLevels.push("low");
    if (levelCounts.medium === maxCount) modeLevels.push("medium");
    if (levelCounts.high === maxCount) modeLevels.push("high");

    // If single mode exists, use it
    if (modeLevels.length === 1) {
      overallIntensity = modeLevels[0];
    } else {
      // Mode tie: use deterministic priority (high > medium > low)
      // This uses only categorical comparison, no numeric thresholds
      if (modeLevels.includes("high")) {
        overallIntensity = "high";
      } else if (modeLevels.includes("medium")) {
        overallIntensity = "medium";
      } else {
        overallIntensity = "low";
      }
    }
  }

  // Determine topDimension
  let topDimension: DimensionKey | "none" = "none";
  if (!isUniform) {
    // Find max score (using normalized dimension scores, same as Compare uses)
    let maxScore = -Infinity;
    for (const key of dimensionKeys) {
      const score = dimensionScores[key];
      if (typeof score === "number" && !isNaN(score) && score > maxScore) {
        maxScore = score;
      }
    }

    // Collect all dimensions within epsilon of max
    const candidates: DimensionKey[] = [];
    for (const key of dimensionKeys) {
      const score = dimensionScores[key];
      if (typeof score === "number" && !isNaN(score) && Math.abs(score - maxScore) < EPSILON) {
        candidates.push(key);
      }
    }

    if (candidates.length > 0) {
      // Pick deterministically using stable order
      for (const key of dimensionKeys) {
        if (candidates.includes(key)) {
          topDimension = key;
          break;
        }
      }
    }
  }

  // Determine tieType
  let tieType: "uniform" | "mixed_tie" | "single";
  if (isUniform) {
    tieType = "uniform";
  } else if (topDimension !== "none") {
    // Check if multiple dimensions tied at max
    const topScore = dimensionScores[topDimension as DimensionKey];
    const tiedCount = dimensionKeys.filter(
      (key) =>
        typeof dimensionScores[key] === "number" &&
        !isNaN(dimensionScores[key]) &&
        Math.abs(dimensionScores[key] - topScore) < EPSILON
    ).length;

    if (tiedCount > 1) {
      tieType = "mixed_tie";
    } else {
      tieType = "single";
    }
  } else {
    tieType = "single"; // Fallback
  }

  return {
    levelsByDim,
    isUniform,
    overallIntensity,
    topDimension,
    tieType,
  };
}

/**
 * Gets Phase-1 DNA template text for a dimension (first sentence only).
 * Extracts from A01-A04 templates.
 */
function getPhase1DNASnippet(dimension: DimensionKey): string {
  const template = COMPARE_TEMPLATES.find(
    (t) => t.section === "dominant_difference" && t.dimension === dimension
  );

  if (!template) {
    return "";
  }

  // Extract first sentence only (first line, stop at first period or newline)
  const lines = template.text.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return "";
  }

  // Take first line (which is the first sentence)
  const firstLine = lines[0].trim();
  
  // If first line contains a period, extract up to period
  const periodIndex = firstLine.indexOf(".");
  if (periodIndex !== -1) {
    return firstLine.substring(0, periodIndex + 1);
  }
  
  return firstLine;
}

/**
 * Generates per-person profile text.
 * - Detects uniform/mixed_tie/single patterns properly
 * - Uses Phase-1 DNA text (first sentence only, not triggers)
 * - Includes intensity label based on mode of levels (no numeric averaging)
 */
export function generatePerPersonProfile(
  name: string,
  dimensionScores: Record<DimensionKey, number>
): string {
  const summary = computePerPersonProfileSummary(dimensionScores);
  const { isUniform, overallIntensity, topDimension, tieType } = summary;
  const overallIntensityLabel = LEVEL_LABELS[overallIntensity];

  // Case A: uniform tie
  if (tieType === "uniform") {
    let mainText: string;
    if (overallIntensity === "low") {
      mainText = `در دو هفته‌ی اخیر، الگوی ذهنی ${name} در بُعدهای مختلف تقریباً هم‌سطح و کم بوده است.
یعنی ذهن او معمولاً در بیشتر موقعیت‌ها کمتر وارد چرخه‌های طولانیِ فکر می‌شود و سریع‌تر عبور می‌کند.`;
    } else if (overallIntensity === "medium") {
      mainText = `در دو هفته‌ی اخیر، الگوی ذهنی ${name} در بُعدهای مختلف تقریباً هم‌سطح و متوسط بوده است.
یعنی ذهن او بسته به موقعیت می‌تواند درگیر شود، اما معمولاً از یک نقطه به بعد برمی‌گردد به تعادل.`;
    } else {
      // high
      mainText = `در دو هفته‌ی اخیر، الگوی ذهنی ${name} در بُعدهای مختلف تقریباً هم‌سطح و زیاد بوده است.
یعنی ذهن او در بسیاری از موقعیت‌ها سریع‌تر فعال می‌شود و احتمال ماندن در چرخه‌های فکری در چند بُعد بالاتر است.`;
    }
    return `${mainText}\n\nسطح کلی الگوها برای ${name}: ${overallIntensityLabel}`;
  }

  // Case B: mixed_tie
  if (tieType === "mixed_tie") {
    const mainText = `در دو هفته‌ی اخیر، چند بُعد برای ${name} نزدیک به هم فعال بوده‌اند و یک بُعدِ واحد به‌طور قطعی غالب نیست.`;
    return `${mainText}\n\nسطح کلی الگوها برای ${name}: ${overallIntensityLabel}`;
  }

  // Case C: single topDimension
  if (topDimension !== "none") {
    const dimensionTitle = getDimensionNameForSnapshot(topDimension);
    const dimensionScore = dimensionScores[topDimension];
    const level = levelOfDimension(dimensionScore);
    const levelLabel = LEVEL_LABELS[level];

    // Get Phase-1 DNA snippet (first sentence only)
    const dnaSnippet = getPhase1DNASnippet(topDimension);

    // Build output
    let output = `در دو هفته‌ی اخیر، برجسته‌ترین الگوی ذهنی ${name} بیشتر در حوزه‌ی "${dimensionTitle}" بوده است.\n\n`;
    
    if (dnaSnippet) {
      output += `${dnaSnippet}\n\n`;
    }
    
    output += `سطح این بُعد برای ${name}: ${levelLabel}`;

    return output;
  }

  // Fallback (should not happen)
  return `در دو هفته‌ی اخیر، الگوی ذهنی ${name} در بُعدهای مختلف تقریباً هم‌سطح بوده است.`;
}

