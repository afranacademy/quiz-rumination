import type { CompareState } from "../buildCompareState";
import type { DimensionKey } from "@/domain/quiz/types";
import { 
  getDimensionNameForSnapshot,
  getSimilarityComplementarySentence,
  getSeenUnseenConsequences,
  getConversationStarters,
  getLargestSimilarityDimension,
} from "../relationalContent";
import { TEST_LINK } from "@/constants/links";
import { computeSimilarity } from "../computeSimilarity";

// Dimension labels (same as in CompareResultPage)
const DIMENSION_LABELS: Record<DimensionKey, string> = {
  stickiness: "چسبندگی فکری",
  pastBrooding: "بازگشت به گذشته",
  futureWorry: "نگرانی آینده",
  interpersonal: "حساسیت بین‌فردی",
};

export type RenderedCompareText = {
  nameA: string;
  nameB: string;
  similarityLabel: string;
  riskLabel: string;
  dominantDimension: DimensionKey;
  dominantDifferenceText: string;
  perPersonA: string;
  perPersonB: string;
  mentalMap: Array<{
    dimension: DimensionKey;
    relationLabel: string;
    aLevel: string;
    bLevel: string;
    text: string;
  }>;
  keyDifferencesText: string | null; // null if very_different (no Phase 3 template)
  similaritiesList: DimensionKey[];
  differencesList: DimensionKey[];
  loopText: string;
  triggersList: string[];
  feltExperienceText: string | null;
  safetyText: string;
};

// Level labels - unused, removed
// const LEVEL_LABELS: Record<"low" | "medium" | "high", string> = {
//   low: "کم",
//   medium: "متوسط",
//   high: "زیاد",
// };

/**
 * Builds complete share/copy text from CompareState + rendered templates.
 * This function uses the same selector functions as the UI to ensure consistency.
 */
export function buildCompareShareText(
  state: CompareState,
  rendered: RenderedCompareText
): string {
  const lines: string[] = [];

  // 1. Title + subtitle
  lines.push("ذهن ما کنار هم");
  lines.push("برای فهم بهتر تفاوت‌ها، نه قضاوت");
  lines.push("");

  // 2. Names line
  lines.push(`${rendered.nameA} × ${rendered.nameB}`);
  lines.push("");

  // 3. Similarity + Risk summary
  lines.push(`شباهت کلی: ${rendered.similarityLabel}`);
  lines.push(`ریسک سوءتفاهم: ${rendered.riskLabel}`);
  lines.push("");

  // 4. "بزرگ‌ترین تفاوت..." line + Phase 1 DNA paragraph
  const dimensionLabel = getDimensionNameForSnapshot(rendered.dominantDimension);
  // ✅ FIX: Use state.dominantTied (exactly as in UI)
  const headline = state.dominantTied
    ? `یکی از بزرگ‌ترین تفاوت‌های ذهنی شما در: ${dimensionLabel}`
    : `بزرگ‌ترین تفاوت ذهنی شما در: ${dimensionLabel}`;
  lines.push(headline);
  lines.push("");
  lines.push(rendered.dominantDifferenceText);
  lines.push("");

  // ✅ FIX: Add complementary sentence (exactly as in UI)
  const dimensionDeltas = {
    stickiness: state.dimensions.stickiness.delta,
    pastBrooding: state.dimensions.pastBrooding.delta,
    futureWorry: state.dimensions.futureWorry.delta,
    interpersonal: state.dimensions.interpersonal.delta,
  };
  const overallSimilarity = computeSimilarity(dimensionDeltas);
  const complementarySentence = getSimilarityComplementarySentence(overallSimilarity);
  lines.push(complementarySentence);
  lines.push("");

  // 5. Per-person mind style blocks
  lines.push(`سبک ذهنی ${rendered.nameA}:`);
  lines.push(rendered.perPersonA);
  lines.push("");
  lines.push(`سبک ذهنی ${rendered.nameB}:`);
  lines.push(rendered.perPersonB);
  lines.push("");

  // 6. Mental map for all 4 dimensions
  lines.push("نقشه‌ی ذهنی");
  lines.push("");
  for (const mapItem of rendered.mentalMap) {
    lines.push(`${DIMENSION_LABELS[mapItem.dimension]} — ${mapItem.relationLabel}`);
    lines.push(`${rendered.nameA}: ${mapItem.aLevel} | ${rendered.nameB}: ${mapItem.bLevel}`);
    lines.push(mapItem.text);
    lines.push("");
  }

  // ✅ FIX: Change title to "جمع‌بندی شباهت و تفاوت" (exactly as in UI)
  lines.push("جمع‌بندی شباهت و تفاوت");
  lines.push("");
  
  // Similarities
    lines.push("شباهت‌ها:");
    if (rendered.similaritiesList.length > 0) {
      for (const dim of rendered.similaritiesList) {
        lines.push(`• ${DIMENSION_LABELS[dim]}`);
      }
    } else {
    // ✅ FIX: Add the new explanatory line (exactly as in UI)
    lines.push("در این نتایج، همسویی کامل کمتر دیده می‌شود؛ این نشانه‌ی تفاوت سبک‌هاست، نه مشکل.");
    lines.push("شباهت‌ها اینجا بیشتر در «ریتم و سبک پردازش» دیده می‌شوند، نه الزاماً در «سطح شدت».");
    }
    lines.push("");
  
  // Differences
    lines.push("تفاوت‌ها:");
    if (rendered.differencesList.length > 0) {
      for (const dim of rendered.differencesList) {
        const dimState = state.dimensions[dim];
        const veryDiffLabel = dimState.relation === "very_different" ? " (خیلی متفاوت)" : "";
        lines.push(`• ${DIMENSION_LABELS[dim]}${veryDiffLabel}`);
      }
    } else {
      lines.push("در این نتایج، تفاوت چشمگیری بین شما دیده نشد. این یعنی در چند الگوی کلیدی، واکنش ذهنی‌تان شبیه‌تر است.");
    }
  
  // ✅ FIX: Add quantized phrasing (exactly as in UI)
  if (rendered.differencesList.length > 0) {
    const veryDifferentCount = rendered.differencesList.filter(
      dim => state.dimensions[dim].relation === "very_different"
    ).length;
    let quantizedPhrase: string;
    if (veryDifferentCount >= 3) {
      quantizedPhrase = "در اکثر الگوهای کلیدی، ذهن‌های شما متفاوت واکنش نشان می‌دهند.";
    } else if (veryDifferentCount >= 1) {
      quantizedPhrase = "در چند الگوی کلیدی، ذهن‌های شما متفاوت واکنش نشان می‌دهند.";
    } else {
      quantizedPhrase = "در برخی الگوهای کلیدی، تفاوت دیده می‌شود.";
    }
    lines.push(quantizedPhrase);
  }
  lines.push("");

  // 8. Key Differences narrative (Phase 3 or bridge sentence for very_different)
  if (rendered.keyDifferencesText) {
    lines.push(rendered.keyDifferencesText);
    lines.push("");
  } else {
    // Bridge sentence for very_different
    lines.push("این تفاوت‌ها بیشتر به تفاوتِ ریتم پردازش ذهنی مربوط است تا نیت یا ارزش‌گذاری.");
    lines.push("");
  }

  // ✅ FIX: Loop title based on relation (exactly as in UI)
  const relation = state.dimensions[state.dominantDimension].relation;
  const loopTitle = relation === "similar"
    ? "وقتی این همسویی فعال می‌شود، معمولاً این چرخه شکل می‌گیرد:"
    : "وقتی این تفاوت فعال می‌شود، معمولاً این چرخه شکل می‌گیرد:";
  lines.push(loopTitle);
  lines.push(rendered.loopText);
  lines.push("");
  if (rendered.triggersList.length > 0) {
    lines.push("موقعیت‌های فعال‌ساز:");
    for (const trigger of rendered.triggersList) {
      lines.push(`• ${trigger}`);
    }
    lines.push("");
  }

  // ✅ FIX: Add Seen/Unseen Consequences (exactly as in UI)
  const maxDelta = Math.max(
    ...Object.values(state.dimensions)
      .filter(d => d.valid)
      .map(d => d.delta)
  );
  const dimensionToUse = maxDelta < 0.8
    ? getLargestSimilarityDimension({
        stickiness: { delta: state.dimensions.stickiness.delta, relation: state.dimensions.stickiness.relation },
        pastBrooding: { delta: state.dimensions.pastBrooding.delta, relation: state.dimensions.pastBrooding.relation },
        futureWorry: { delta: state.dimensions.futureWorry.delta, relation: state.dimensions.futureWorry.relation },
        interpersonal: { delta: state.dimensions.interpersonal.delta, relation: state.dimensions.interpersonal.relation },
      })
    : state.dominantDimension;
  
  if (dimensionToUse) {
    const consequences = getSeenUnseenConsequences(dimensionToUse);
    lines.push("پیامد دیده نشدن / دیده شدن");
    lines.push("");
    lines.push("اگر دیده نشود:");
    for (const item of consequences.unseen) {
      lines.push(`• ${item}`);
    }
    lines.push("");
    lines.push("اگر دیده شود:");
    for (const item of consequences.seen) {
      lines.push(`• ${item}`);
    }
    lines.push("");
  }

  // ✅ FIX: Felt Experience title based on relation (exactly as in UI)
  if (rendered.feltExperienceText) {
    const feltTitle = relation === "similar"
      ? "این همسویی ممکن است این‌طور حس شود"
      : "این تفاوت ممکن است این‌طور حس شود";
    lines.push(feltTitle);
    lines.push(rendered.feltExperienceText);
    lines.push("");
  }

  // ✅ FIX: Add Conversation Starters (exactly as in UI)
  if (dimensionToUse) {
    const conversationRelation = maxDelta < 0.8 ? "similar" : relation;
    const questions = getConversationStarters(dimensionToUse, conversationRelation);
    if (questions.length > 0) {
      lines.push("شروع گفت‌وگو");
      lines.push("");
      for (const q of questions) {
        lines.push(q);
      }
      lines.push("");
    }
  }

  // 11. Final safety block (ONLY ONCE - the same one rendered in UI)
  lines.push(rendered.safetyText);
  lines.push("");

  // 12. Test invite line
  lines.push("تکمیل آزمون سنجش نشخوار فکری:");
  lines.push(TEST_LINK);

  return lines.join("\n");
}

