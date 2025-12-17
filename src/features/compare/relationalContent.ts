import type { DimensionKey } from "@/domain/quiz/types";
import { DIMENSIONS, levelOfDimension } from "@/domain/quiz/dimensions";

/**
 * Relational content generator for the "ذهن ما کنار هم" page.
 * All content is pattern-based, non-diagnostic, and focused on relational understanding.
 */

// Dimension definitions (1-line, scientific but human, process-based)
export const DIMENSION_DEFINITIONS: Record<DimensionKey, string> = {
  stickiness: "میزان تمایل ذهن به ماندن روی فکرها پس از پایان موقعیت.",
  pastBrooding: "گرایش ذهن به بازگشت مکرر به اشتباه‌ها و موقعیت‌های قبلی (مرور گذشته).",
  futureWorry: "درگیری ذهن با پیش‌بینی و کنترل رویدادهای آینده (نگرانی آینده‌محور).",
  interpersonal: "میزان توجه ذهن به نشانه‌های رفتاری و معناسازی از آن‌ها.",
};

// Alignment labels based on delta
// < 0.8 → ALIGNED (همسو)
// 0.8-1.6 → DIFFERENT (متفاوت)
// > 1.6 → VERY DIFFERENT (خیلی متفاوت)
export function getAlignmentLabel(delta: number): string {
  if (delta < 0.8) return "همسو";
  if (delta <= 1.6) return "متفاوت";
  return "خیلی متفاوت";
}

// Get the dimension with largest similarity (for aligned cases)
export function getLargestSimilarityDimension(
  dimensions: Record<DimensionKey, { delta: number; relation: "similar" | "different" | "very_different" }>
): DimensionKey | null {
  const similarDimensions: Array<{ key: DimensionKey; delta: number }> = [];
  
  for (const key of DIMENSIONS) {
    const dim = dimensions[key];
    if (!dim) continue; // Null-guard
    if (dim.relation === "similar") {
      similarDimensions.push({ key, delta: dim.delta });
    }
  }
  
  if (similarDimensions.length === 0) return null;
  
  // Find the one with smallest delta (most similar)
  similarDimensions.sort((a, b) => a.delta - b.delta);
  
  // If tie, use priority order: interpersonal > stickiness > pastBrooding > futureWorry
  if (similarDimensions.length > 1) {
    const minDelta = similarDimensions[0].delta;
    const ties = similarDimensions.filter(d => Math.abs(d.delta - minDelta) < 0.01);
    if (ties.length > 1) {
      const priorityOrder: DimensionKey[] = ["interpersonal", "stickiness", "pastBrooding", "futureWorry"];
      for (const priorityKey of priorityOrder) {
        const found = ties.find(t => t.key === priorityKey);
        if (found) return found.key;
      }
    }
  }
  
  return similarDimensions[0].key;
}

// Get the dimension with largest difference
// Priority: 1) very_different dimensions first, 2) then by priority order: interpersonal > stickiness > pastBrooding > futureWorry
// Returns both the selected dimension and whether there was a tie
export function getLargestDifferenceDimension(
  dimensions: Record<DimensionKey, { delta: number; aScore: number; bScore: number; aLevel: "low" | "medium" | "high"; bLevel: "low" | "medium" | "high"; relation?: "similar" | "different" | "very_different" }>
): { key: DimensionKey; delta: number; aScore: number; bScore: number; aLevel: "low" | "medium" | "high"; bLevel: "low" | "medium" | "high"; tied: boolean } | null {
  let maxDelta = -1;
  let maxKey: DimensionKey | null = null;
  const candidates: Array<{ key: DimensionKey; delta: number; relation?: "similar" | "different" | "very_different" }> = [];

  // Find all dimensions with the maximum delta (skip NaN/unknown)
  for (const key of DIMENSIONS) {
    const dim = dimensions[key];
    if (!dim) continue; // Null-guard
    const delta = dim.delta;
    if (typeof delta === "number" && !isNaN(delta) && delta > maxDelta) {
      maxDelta = delta;
    }
  }

  // Collect all dimensions with maxDelta (handles ties) - only valid dimensions
  for (const key of DIMENSIONS) {
    const dim = dimensions[key];
    if (!dim) continue; // Null-guard
    const delta = dim.delta;
    if (typeof delta === "number" && !isNaN(delta) && Math.abs(delta - maxDelta) < 0.01) {
      candidates.push({ 
        key, 
        delta,
        relation: dim.relation
      });
    }
  }

  // Priority 1: very_different dimensions first
  const veryDifferentCandidates = candidates.filter(c => c.relation === "very_different");
  const candidatesToUse = veryDifferentCandidates.length > 0 ? veryDifferentCandidates : candidates;

  // Priority 2: If tie, use priority order: interpersonal > stickiness > pastBrooding > futureWorry
  if (candidatesToUse.length > 1) {
    const priorityOrder: DimensionKey[] = ["interpersonal", "stickiness", "pastBrooding", "futureWorry"];
    for (const priorityKey of priorityOrder) {
      const candidate = candidatesToUse.find(c => c.key === priorityKey);
      if (candidate) {
        maxKey = candidate.key;
        break;
      }
    }
  } else if (candidatesToUse.length === 1) {
    maxKey = candidatesToUse[0].key;
  }

  if (!maxKey) return null;

  const maxDim = dimensions[maxKey];
  if (!maxDim) return null; // Null-guard

  // Check if there was a tie: if candidatesToUse has more than 1 item, it's a tie
  const tied = candidatesToUse.length > 1;

  return {
    key: maxKey,
    delta: maxDim.delta,
    aScore: maxDim.aScore,
    bScore: maxDim.bScore,
    aLevel: maxDim.aLevel,
    bLevel: maxDim.bLevel,
    tied,
  };
}

// Central human interpretation (Section 4)
// Uses dimension_type + level_A + level_B + direction (pattern-based, not user-specific)
export function generateCentralInterpretation(
  dimensionKey: DimensionKey,
  nameA: string,
  nameB: string,
  aLevel: "low" | "medium" | "high",
  bLevel: "low" | "medium" | "high",
  aScore: number,
  bScore: number,
  relation: "similar" | "different" | "very_different",
  direction: "a_higher" | "b_higher" | "equal"
): string {
  const isAligned = relation === "similar";
  const directionType: "A higher" | "B higher" | "aligned" = 
    isAligned ? "aligned" : (direction === "a_higher" ? "A higher" : "B higher");

  // Pattern-based interpretations using level + direction
  // NO "always/never", NO binary language, NO question-specific references
  const interpretations: Record<DimensionKey, Record<"A higher" | "B higher" | "aligned", { higher: string; lower: string; feelingA: string; feelingB: string }>> = {
    stickiness: {
      "A higher": {
        higher: "روی یک فکر یا موضوع می‌ماند و سخت‌تر از آن عبور می‌کند",
        lower: "راحت‌تر می‌تواند از یک موضوع عبور کند و ذهنش به موضوعات جدید می‌رود",
        feelingA: "که طرف مقابل به موضوع اهمیت نمی‌دهد یا آن را جدی نمی‌گیرد",
        feelingB: "که طرف مقابل بیش‌ازحد روی یک موضوع می‌ماند و نمی‌تواند از آن عبور کند",
      },
      "B higher": {
        higher: "روی یک فکر یا موضوع می‌ماند و سخت‌تر از آن عبور می‌کند",
        lower: "راحت‌تر می‌تواند از یک موضوع عبور کند و ذهنش به موضوعات جدید می‌رود",
        feelingA: "که طرف مقابل بیش‌ازحد روی یک موضوع می‌ماند و نمی‌تواند از آن عبور کند",
        feelingB: "که طرف مقابل به موضوع اهمیت نمی‌دهد یا آن را جدی نمی‌گیرد",
      },
      "aligned": {
        higher: "هر دو به یک اندازه روی فکرها می‌مانند یا از آنها عبور می‌کنند",
        lower: "هر دو به یک اندازه روی فکرها می‌مانند یا از آنها عبور می‌کنند",
        feelingA: "که واکنش‌های ذهنی مشابهی داریم",
        feelingB: "که واکنش‌های ذهنی مشابهی داریم",
      },
    },
    pastBrooding: {
      "A higher": {
        higher: "به اتفاقات قبلی، اشتباه‌ها یا گفتگوهای گذشته برمی‌گردد و آنها را مرور می‌کند",
        lower: "راحت‌تر می‌تواند از اتفاقات گذشته عبور کند و کمتر به آنها برمی‌گردد",
        feelingA: "که طرف مقابل گذشته را فراموش کرده یا اهمیت نمی‌دهد",
        feelingB: "که طرف مقابل در گذشته گیر کرده و نمی‌تواند جلو برود",
      },
      "B higher": {
        higher: "به اتفاقات قبلی، اشتباه‌ها یا گفتگوهای گذشته برمی‌گردد و آنها را مرور می‌کند",
        lower: "راحت‌تر می‌تواند از اتفاقات گذشته عبور کند و کمتر به آنها برمی‌گردد",
        feelingA: "که طرف مقابل در گذشته گیر کرده و نمی‌تواند جلو برود",
        feelingB: "که طرف مقابل گذشته را فراموش کرده یا اهمیت نمی‌دهد",
      },
      "aligned": {
        higher: "هر دو به یک اندازه به گذشته برمی‌گردند یا از آن عبور می‌کنند",
        lower: "هر دو به یک اندازه به گذشته برمی‌گردند یا از آن عبور می‌کنند",
        feelingA: "که واکنش‌های ذهنی مشابهی داریم",
        feelingB: "که واکنش‌های ذهنی مشابهی داریم",
      },
    },
    futureWorry: {
      "A higher": {
        higher: "درگیر پیش‌بینی و نگرانی از آینده است و تلاش می‌کند اتفاقات را کنترل کند",
        lower: "راحت‌تر با ابهام و نااطمینانی کنار می‌آید و کمتر نگران آینده است",
        feelingA: "که طرف مقابل بی‌خیال است یا آینده را جدی نمی‌گیرد",
        feelingB: "که طرف مقابل بیش‌ازحد نگران است و نمی‌تواند آرام باشد",
      },
      "B higher": {
        higher: "درگیر پیش‌بینی و نگرانی از آینده است و تلاش می‌کند اتفاقات را کنترل کند",
        lower: "راحت‌تر با ابهام و نااطمینانی کنار می‌آید و کمتر نگران آینده است",
        feelingA: "که طرف مقابل بیش‌ازحد نگران است و نمی‌تواند آرام باشد",
        feelingB: "که طرف مقابل بی‌خیال است یا آینده را جدی نمی‌گیرد",
      },
      "aligned": {
        higher: "هر دو به یک اندازه درگیر نگرانی از آینده هستند یا آرام‌ترند",
        lower: "هر دو به یک اندازه درگیر نگرانی از آینده هستند یا آرام‌ترند",
        feelingA: "که واکنش‌های ذهنی مشابهی داریم",
        feelingB: "که واکنش‌های ذهنی مشابهی داریم",
      },
    },
    interpersonal: {
      "A higher": {
        higher: "به نشانه‌های رفتاری و تغییرات ظریف در تعامل توجه بیشتری دارد و بیشتر سناریوسازی می‌کند",
        lower: "کمتر به نشانه‌های ظریف توجه می‌کند و کمتر وارد تفسیر رفتار دیگران می‌شود",
        feelingA: "که طرف مقابل متوجه نیست یا اهمیت نمی‌دهد",
        feelingB: "که طرف مقابل بیش‌ازحد حساس است یا چیزهایی می‌بیند که وجود ندارد",
      },
      "B higher": {
        higher: "به نشانه‌های رفتاری و تغییرات ظریف در تعامل توجه بیشتری دارد و بیشتر سناریوسازی می‌کند",
        lower: "کمتر به نشانه‌های ظریف توجه می‌کند و کمتر وارد تفسیر رفتار دیگران می‌شود",
        feelingA: "که طرف مقابل بیش‌ازحد حساس است یا چیزهایی می‌بیند که وجود ندارد",
        feelingB: "که طرف مقابل متوجه نیست یا اهمیت نمی‌دهد",
      },
      "aligned": {
        higher: "هر دو به یک اندازه به نشانه‌های رفتاری توجه می‌کنند",
        lower: "هر دو به یک اندازه به نشانه‌های رفتاری توجه می‌کنند",
        feelingA: "که واکنش‌های ذهنی مشابهی داریم",
        feelingB: "که واکنش‌های ذهنی مشابهی داریم",
      },
    },
  };

  const content = interpretations[dimensionKey][directionType];
  const higherName = directionType === "A higher" ? nameA : directionType === "B higher" ? nameB : nameA;
  const lowerName = directionType === "A higher" ? nameB : directionType === "B higher" ? nameA : nameB;

  if (directionType === "aligned") {
    // Dimension-specific aligned narratives
    const alignedNarratives: Record<DimensionKey, string> = {
      stickiness: `هر دوی شما نسبت به رها کردن فکرها و موضوعات واکنش مشابهی دارید. این می‌تواند باعث شود در موقعیت‌های مبهم، سرعت پردازش ذهنی نزدیک‌تری داشته باشید و کمتر در مورد "چرا طرف مقابل هنوز روی این موضوع مانده" یا "چرا خیلی سریع عوض شد" سوءتفاهم پیش بیاید.

این الگوها معمولاً ناخواسته‌اند و از فرآیندهای ذهنی طبیعی می‌آیند.`,

      pastBrooding: `هر دوی شما نسبت به گذشته و اتفاقات قبلی واکنش مشابهی دارید. این می‌تواند باعث شود در موقعیت‌های مشابه گذشته، برداشت‌های نزدیک‌تری داشته باشید و کمتر در مورد "چرا طرف مقابل هنوز گذشته را به یاد می‌آورد" یا "چرا گذشته را فراموش کرده" سوءتفاهم پیش بیاید.

این الگوها معمولاً ناخواسته‌اند و از فرآیندهای ذهنی طبیعی می‌آیند.`,

      futureWorry: `هر دوی شما نسبت به آینده و ابهام واکنش مشابهی دارید. این می‌تواند باعث شود در موقعیت‌های مبهم یا قبل از تصمیم‌گیری، سطح نگرانی نزدیک‌تری داشته باشید و کمتر در مورد "چرا طرف مقابل خیلی نگران است" یا "چرا بی‌خیال است" سوءتفاهم پیش بیاید.

این الگوها معمولاً ناخواسته‌اند و از فرآیندهای ذهنی طبیعی می‌آیند.`,

      interpersonal: `هر دوی شما نسبت به نشانه‌های رفتاری (لحن، سکوت، دیر جواب‌دادن) حساسیت مشابهی دارید. این می‌تواند باعث شود در موقعیت‌های مبهم، برداشت‌های نزدیک‌تری داشته باشید و سوءبرداشت کمتر شود.

این الگوها معمولاً ناخواسته‌اند و از فرآیندهای ذهنی طبیعی می‌آیند.`,
    };

    return alignedNarratives[dimensionKey];
  }

  // For very different interpersonal, use more specific narrative
  if (dimensionKey === "interpersonal" && relation === "very_different") {
    const balanceNote = "این بیشتر یک سبک پردازش است، نه قضاوت اخلاقی یا نیت. هر دو سبک می‌تواند در موقعیت‌های مختلف مفید باشد.";
    return `وقتی رفتارها مبهم می‌شوند، ذهن ${higherName} سریع‌تر دنبال معنا می‌گردد و ذهن ${lowerName} کمتر درگیر نشانه‌ها می‌شود. این تفاوت ممکن است یکی را به سمت نگرانی و دیگری را به سمت تعجب یا بی‌اهمیتی ببرد—بدون اینکه قصدی در کار باشد.

${balanceNote}

این واکنش‌ها معمولاً ناخواسته‌اند و از تفاوت در فرآیندهای ذهنی می‌آیند.`;
  }

  // For different/very_different (non-interpersonal), add balance note
  const balanceNote = relation === "very_different" 
    ? "هر دو سبک می‌تواند در موقعیت‌های مختلف مفید باشد.\n"
    : "";

  // Add process-focused explanations per dimension to reduce intent-reading
  const processExplanations: Record<DimensionKey, string> = {
    stickiness: "این برداشت معمولاً از تفاوت در سرعت رهاسازی فکر می‌آید، نه از میزان اهمیت‌دادن یا توجه.",
    pastBrooding: "این برداشت معمولاً از تفاوت در نیاز به پردازش گذشته می‌آید، نه از میزان اهمیت‌دادن به رابطه.",
    futureWorry: "این برداشت معمولاً از تفاوت در نیاز به قطعیت می‌آید، نه از میزان اهمیت‌دادن به آینده.",
    interpersonal: "این برداشت معمولاً از تفاوت در حساسیت به نشانه‌های رفتاری می‌آید، نه از میزان توجه یا بی‌توجهی.",
  };

  return `در موقعیت‌های حساس،
ذهن ${higherName} معمولاً ${content.higher}
در حالی که ذهن ${lowerName} بیشتر ${content.lower}

این تفاوت ممکن است باعث شود یکی احساس ${content.feelingA}
و دیگری احساس ${content.feelingB}

${processExplanations[dimensionKey]}

${balanceNote}
این واکنش‌ها معمولاً ناخواسته‌اند
و از تفاوت در فرآیندهای ذهنی می‌آیند.`;
}

// Neutral blended interpretation fallback (when dimension is unclear)
export function generateNeutralBlendedInterpretation(): string {
  return `ذهن‌های شما در چند الگوی کلیدی متفاوت عمل می‌کنند،
و این تفاوت‌ها ممکن است در موقعیت‌های احساسی مختلف فعال شوند،
بدون اینکه نیت یا قصد خاصی پشت آن‌ها باشد.`;
}

// Get seen/unseen consequences for a dimension (Section 9)
export function getSeenUnseenConsequences(dimensionKey: DimensionKey): {
  unseen: string[];
  seen: string[];
} {
  const consequences: Record<DimensionKey, { unseen: string[]; seen: string[] }> = {
    stickiness: {
      unseen: ["سوءبرداشت از انگیزه‌ها", "فشار برای تغییر موضوع", "دلخوری از عدم توجه", "فاصله‌ی ذهنی"],
      seen: ["درک سرعت پردازش متفاوت", "احترام به نیاز به زمان", "کاهش فشار", "گفت‌وگوی شفاف‌تر"],
    },
    pastBrooding: {
      unseen: ["فشار برای فراموش کردن", "دلخوری از بازگشت به گذشته", "سوءبرداشت از انگیزه", "فاصله‌ی ذهنی"],
      seen: ["درک نیاز به پردازش گذشته", "احترام به فرآیند یادگیری", "کاهش قضاوت", "گفت‌وگوی شفاف‌تر"],
    },
    futureWorry: {
      unseen: ["فشار برای کنترل آینده", "حساسیت به برنامه و قطعیت", "سوءبرداشت از نگرانی", "فاصله‌ی ذهنی"],
      seen: ["شفاف‌سازی توقعات درباره آینده", "کاهش درگیری ذهنی", "درک نیاز به قطعیت", "گفت‌وگوی شفاف‌تر"],
    },
    interpersonal: {
      unseen: ["برداشت‌های بی‌کلام", "سوءتفاهم از سکوت", "فشار برای توضیح", "فاصله‌ی ذهنی"],
      seen: ["شفاف‌سازی معنا/نیاز", "کاهش سناریوسازی", "درک سبک ارتباطی", "گفت‌وگوی شفاف‌تر"],
    },
  };
  
  return consequences[dimensionKey] || consequences.stickiness;
}

// Contextual triggers based on dominant dimension (Section 8)
export function getContextualTriggers(dimensionKey: DimensionKey): string[] {
  const triggers: Record<DimensionKey, string[]> = {
    stickiness: [
      "بعد از بحث یا گفت‌وگو",
      "وقتی موضوعی تمام شده اما هنوز در ذهن است",
      "در موقعیت‌های استرس‌زا",
      "وقتی یکی می‌خواهد موضوع را عوض کند",
    ],
    pastBrooding: [
      "بعد از اشتباه یا سوءتفاهم",
      "وقتی خاطره‌ای قدیمی زنده می‌شود",
      "در موقعیت‌های مشابه گذشته",
      "وقتی یکی می‌خواهد از گذشته عبور کند",
    ],
    futureWorry: [
      "در تصمیم‌گیری‌های مهم",
      "وقتی ابهام یا نااطمینانی وجود دارد",
      "قبل از رویدادها یا قرارها",
      "در موقعیت‌های استرس‌زا",
    ],
    interpersonal: [
      "وقتی پیام‌ها دیر جواب داده می‌شوند",
      "در تغییرات ظریف در رفتار",
      "بعد از گفت‌وگو یا تعامل",
      "وقتی نشانه‌های غیرکلامی متفاوت است",
    ],
  };

  return triggers[dimensionKey] || [];
}

/**
 * Gets contextual triggers combining dominant dimension and second person's top dimension.
 * Returns 3 triggers from dominant dimension + 1-2 triggers from second person's top dimension.
 * 
 * Note: Future enhancement - order triggers by emotional weight first, then situational
 * (More emotional triggers first, then situational triggers)
 * This can be implemented in a later phase if needed.
 */
export function getCombinedContextualTriggers(
  dominantDimension: DimensionKey,
  secondPersonTopDimension: DimensionKey | null
): string[] {
  const dominantTriggers = getContextualTriggers(dominantDimension);
  const triggers: string[] = [];
  
  // Add 3 triggers from dominant dimension
  triggers.push(...dominantTriggers.slice(0, 3));
  
  // Add 1-2 triggers from second person's top dimension (if different and available)
  if (secondPersonTopDimension && secondPersonTopDimension !== dominantDimension) {
    const secondPersonTriggers = getContextualTriggers(secondPersonTopDimension);
    // Add 1-2 unique triggers (avoid duplicates)
    for (const trigger of secondPersonTriggers) {
      if (!triggers.includes(trigger) && triggers.length < 5) {
        triggers.push(trigger);
      }
    }
  }
  
  return triggers;
}

// Conversation starters - relation-aware (Section 11)
export function getConversationStarters(
  dimensionKey: DimensionKey,
  relation: "similar" | "different" | "very_different"
): string[] {
  // Fixed question
  const fixedQuestion = "این تفاوت بیشتر کجا خودش را نشان می‌دهد؟";
  
  if (relation === "similar") {
    // Questions for aligned dimensions - focus on strengthening alignment
    const alignedQuestions: Record<DimensionKey, string[]> = {
      stickiness: [
        "چه موقعیت‌هایی باعث می‌شود هر دو به شکل مشابه روی موضوعات بمانیم یا از آنها عبور کنیم؟",
        "چطور می‌توانیم از این شباهت برای بهبود گفت‌وگو استفاده کنیم؟",
      ],
      pastBrooding: [
        "چه موقعیت‌هایی باعث می‌شود هر دو به شکل مشابه به گذشته برگردیم یا از آن عبور کنیم؟",
        "چطور می‌توانیم از این شباهت برای بهبود گفت‌وگو استفاده کنیم؟",
      ],
      futureWorry: [
        "چه موقعیت‌هایی باعث می‌شود هر دو به شکل مشابه نسبت به آینده نگران باشیم؟",
        "چطور می‌توانیم از این شباهت برای بهبود گفت‌وگو استفاده کنیم؟",
      ],
      interpersonal: [
        "چه موقعیت‌هایی باعث می‌شود هر دو به شکل مشابه نشانه‌های رفتاری را تفسیر کنیم؟",
        "چطور می‌توانیم از این شباهت برای بهبود گفت‌وگو استفاده کنیم؟",
      ],
    };
    return [fixedQuestion, ...alignedQuestions[dimensionKey]];
  }
  
  // Different/very different - focus on reducing misunderstanding
  const differentQuestions: Record<DimensionKey, string[]> = {
    stickiness: ["وقتی یک موضوع هنوز برای یکی ناتمام است…"],
    pastBrooding: ["وقتی گذشته دوباره برمی‌گردد…"],
    futureWorry: ["در موقعیت‌های مبهم…"],
    interpersonal: ["وقتی پیام یا رفتار مبهم است…"],
  };
  
  return [fixedQuestion, ...differentQuestions[dimensionKey]];
}

// Legacy export for backward compatibility
export const CONVERSATION_STARTERS = [
  "این تفاوت بیشتر کجا خودش را نشان می‌دهد؟",
  "وقتی این اتفاق می‌افتد، هرکدام چه حسی داریم؟",
  "کدام بخش این مقایسه برایت آشناتر بود؟",
];

// Safety statement (Section 6)
export const SAFETY_STATEMENT = `این مقایسه برای درک بهتر ذهن‌هاست، نه قضاوت یا تشخیص.
نتایج تقریبی‌اند و ممکن است با شرایطی مثل استرس، خواب یا موقعیت تغییر کنند.
تفاوت ذهنی ≠ مشکل رابطه‌ای.`;

// Get dimension name for snapshot (Section 2)
export function getDimensionNameForSnapshot(dimensionKey: DimensionKey): string {
  const names: Record<DimensionKey, string> = {
    stickiness: "نحوه‌ی رها کردن فکرها",
    pastBrooding: "نحوه‌ی برخورد با گذشته",
    futureWorry: "نحوه‌ی مواجهه با آینده",
    interpersonal: "نحوه‌ی تفسیر رفتار دیگران",
  };
  return names[dimensionKey];
}

// Check if CTA should be shown (at least one dimension is MEDIUM or HIGH for either user)
export function shouldShowCTA(
  dimensions: Record<DimensionKey, { aLevel: "low" | "medium" | "high"; bLevel: "low" | "medium" | "high" }>
): boolean {
  for (const key of DIMENSIONS) {
    const dim = dimensions[key];
    if (!dim) continue; // Null-guard
    if (dim.aLevel !== "low" || dim.bLevel !== "low") {
      return true; // At least one user has MEDIUM or HIGH on at least one dimension
    }
  }
  
  return false; // Both users are LOW on all dimensions
}

/**
 * Calculates misunderstanding risk based on number of very_different dimensions.
 * 
 * Mapping (finalized contract):
 * - 0 very_different → "low" (ریسک سوءتفاهم: کم)
 * - 1 very_different → "medium" (ریسک سوءتفاهم: متوسط)
 * - 2-4 very_different → "high" (ریسک سوءتفاهم: زیاد)
 * 
 * Note: This mapping is used in CompareResultPage UI to display the risk level.
 * The relation "very_different" is determined when delta >= 1.6 for a dimension.
 */
export function getMisunderstandingRisk(
  dimensions: Record<DimensionKey, { relation: "similar" | "different" | "very_different" }>
): "low" | "medium" | "high" {
  let veryDifferentCount = 0;
  
  for (const key of DIMENSIONS) {
    const dim = dimensions[key];
    if (!dim) continue; // Null-guard
    if (dim.relation === "very_different") {
      veryDifferentCount++;
    }
  }
  
  if (veryDifferentCount === 0) {
    return "low";
  } else if (veryDifferentCount === 1) {
    return "medium";
  } else {
    return "high";
  }
}

// Get text explanation for misunderstanding risk
export function getMisunderstandingRiskText(risk: "low" | "medium" | "high"): string {
  const texts: Record<"low" | "medium" | "high", string> = {
    low: "الگوهای ذهنی شما معمولاً به سوءتفاهم منجر نمی‌شوند.",
    medium: "در برخی موقعیت‌ها احتمال سوءبرداشت وجود دارد.",
    high: "در چند الگوی کلیدی، احتمال سوءتفاهم بیشتر است.",
  };
  return texts[risk];
}

// Get top dimension for a person (highest mean score)
// Tie-break: 1) Higher level (HIGH > MEDIUM > LOW), 2) Priority order: interpersonal > stickiness > pastBrooding > futureWorry
export function getTopDimensionForPerson(
  dimensionScores: Record<DimensionKey, number>
): DimensionKey | null {
  // Find max score
  let maxScore = -1;
  for (const key of DIMENSIONS) {
    const score = dimensionScores[key];
    if (typeof score === "number" && !isNaN(score) && score > maxScore) {
      maxScore = score;
    }
  }
  
  // Collect all dimensions with max score
  const candidates: Array<{ key: DimensionKey; score: number; level: "low" | "medium" | "high" }> = [];
  for (const key of DIMENSIONS) {
    const score = dimensionScores[key];
    if (typeof score === "number" && !isNaN(score) && Math.abs(score - maxScore) < 0.01) {
      candidates.push({
        key,
        score,
        level: levelOfDimension(score)
      });
    }
  }
  
  if (candidates.length === 0) return null;
  
  // Tie-break 1: Higher level (HIGH > MEDIUM > LOW)
  const levelOrder: Record<"low" | "medium" | "high", number> = { low: 1, medium: 2, high: 3 };
  candidates.sort((a, b) => levelOrder[b.level] - levelOrder[a.level]);
  const topLevel = candidates[0].level;
  const topLevelCandidates = candidates.filter(c => c.level === topLevel);
  
  // Tie-break 2: Stable order (use DIMENSIONS order) for deterministic selection
  // When all dimensions are tied (e.g., all 0), pick first in stable order: stickiness, pastBrooding, futureWorry, interpersonal
  if (topLevelCandidates.length > 1) {
    // Use stable DIMENSIONS order, not priority order
    for (const key of DIMENSIONS) {
      const candidate = topLevelCandidates.find(c => c.key === key);
      if (candidate) {
        return candidate.key;
      }
    }
  }
  
  return topLevelCandidates[0].key;
}

// Generate mind snapshot for a person
export function generateMindSnapshot(
  name: string,
  topDimension: DimensionKey,
  dimensionScores: Record<DimensionKey, number>
): string {
  const dimensionContexts: Record<DimensionKey, string> = {
    stickiness: "بعد از بحث یا موضوع ناتمام",
    pastBrooding: "بعد از اشتباه یا تعارض",
    futureWorry: "ابهام یا تصمیم",
    interpersonal: "پیام یا لحن یا سکوت",
  };
  
  const dimensionLabels: Record<DimensionKey, string> = {
    stickiness: "چسبندگی فکری",
    pastBrooding: "گذشته‌محوری",
    futureWorry: "آینده‌نگری",
    interpersonal: "حساسیت بین‌فردی",
  };
  
  const context = dimensionContexts[topDimension];
  const dimensionLabel = dimensionLabels[topDimension];
  
  return `در دو هفته‌ی اخیر، برجسته‌ترین الگوی ذهنی ${name} بیشتر در حوزه‌ی "${dimensionLabel}" بوده است.

این یعنی ذهن او در موقعیت‌های مرتبط با ${context} فعال‌تر می‌شود.

سایر الگوهای ذهنی او معمولاً نقش کم‌رنگ‌تر یا موقعیتی دارند.`;
}

// Generate misunderstanding loop for a dimension
export function generateMisunderstandingLoop(
  dimensionKey: DimensionKey,
  relation: "similar" | "different" | "very_different"
): string[] {
  if (relation === "similar") {
    // Aligned loop
    const alignedLoops: Record<DimensionKey, string[]> = {
      stickiness: [
        "یک موقعیت مبهم یا حساس رخ می‌دهد…",
        "هر دو ذهن به شکل مشابه فعال می‌شود…",
        "برداشت‌های نزدیک شکل می‌گیرد و گفت‌وگو راحت‌تر می‌شود…",
      ],
      pastBrooding: [
        "یک موقعیت مبهم یا حساس رخ می‌دهد…",
        "هر دو ذهن به شکل مشابه فعال می‌شود…",
        "برداشت‌های نزدیک شکل می‌گیرد و گفت‌وگو راحت‌تر می‌شود…",
      ],
      futureWorry: [
        "یک موقعیت مبهم یا حساس رخ می‌دهد…",
        "هر دو ذهن به شکل مشابه فعال می‌شود…",
        "برداشت‌های نزدیک شکل می‌گیرد و گفت‌وگو راحت‌تر می‌شود…",
      ],
      interpersonal: [
        "یک موقعیت مبهم یا حساس رخ می‌دهد…",
        "هر دو ذهن به شکل مشابه فعال می‌شود…",
        "برداشت‌های نزدیک شکل می‌گیرد و گفت‌وگو راحت‌تر می‌شود…",
      ],
    };
    return alignedLoops[dimensionKey] || alignedLoops.stickiness;
  }

  // Different loop (for relation === "different")
  const differentLoops: Record<DimensionKey, string[]> = {
    stickiness: [
      "یک موقعیت مبهم یا حساس رخ می‌دهد…",
      "یکی ذهنش روی موضوع می‌ماند تا برایش تمام شود؛ دیگری زودتر عبور می‌کند تا بتواند ادامه بدهد.",
      "برداشت‌های متفاوت شکل می‌گیرد و احساس فاصله یا فشار ایجاد می‌شود… این برداشت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
    ],
    pastBrooding: [
      "یک موقعیت مبهم یا حساس رخ می‌دهد…",
      "یکی به گذشته برمی‌گردد تا درس بگیرد؛ دیگری زودتر از گذشته عبور می‌کند تا جلو برود.",
      "برداشت‌های متفاوت شکل می‌گیرد و احساس فاصله یا فشار ایجاد می‌شود… این برداشت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
    ],
    futureWorry: [
      "یک موقعیت مبهم یا حساس رخ می‌دهد…",
      "یکی تلاش می‌کند آینده را پیش‌بینی و کنترل کند؛ دیگری راحت‌تر با ابهام کنار می‌آید.",
      "برداشت‌های متفاوت شکل می‌گیرد و احساس فاصله یا فشار ایجاد می‌شود… این برداشت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
    ],
    interpersonal: [
      "یک موقعیت مبهم یا حساس رخ می‌دهد…",
      "یکی به نشانه‌های رفتاری توجه می‌کند و دنبال معنا می‌گردد؛ دیگری کمتر درگیر تفسیر رفتار می‌شود.",
      "برداشت‌های متفاوت شکل می‌گیرد و احساس فاصله یا فشار ایجاد می‌شود… این برداشت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
    ],
  };

  // Very different loop (for relation === "very_different")
  // CRITICAL: All 4 dimensions must be fully defined - do not reuse or comment out
  // Note: futureWorry very_different ≠ futureWorry different (different emotional tone)
  // Note: interpersonal very_different has stronger emotional weight than interpersonal different
  const veryDifferentLoops: Record<DimensionKey, string[]> = {
    stickiness: [
      "یک موقعیت مبهم یا حساس رخ می‌دهد…",
      "یکی ذهنش روی موضوع می‌ماند تا برایش تمام شود؛ دیگری زودتر عبور می‌کند تا بتواند ادامه بدهد.",
      "برداشت‌های بسیار متفاوت شکل می‌گیرد و احتمال سوءتفاهم بیشتر می‌شود… این تفاوت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
    ],
    pastBrooding: [
      "یک موقعیت مبهم یا حساس رخ می‌دهد…",
      "یکی به گذشته برمی‌گردد تا درس بگیرد؛ دیگری زودتر از گذشته عبور می‌کند تا جلو برود.",
      "برداشت‌های بسیار متفاوت شکل می‌گیرد و احتمال سوءتفاهم بیشتر می‌شود… این تفاوت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
    ],
    futureWorry: [
      "یک موقعیت مبهم یا حساس رخ می‌دهد…",
      "یکی تلاش می‌کند آینده را پیش‌بینی و کنترل کند؛ دیگری راحت‌تر با ابهام کنار می‌آید.",
      "برداشت‌های بسیار متفاوت شکل می‌گیرد و احتمال سوءتفاهم بیشتر می‌شود… این تفاوت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
    ],
    interpersonal: [
      "یک موقعیت مبهم یا حساس رخ می‌دهد…",
      "یکی به نشانه‌های رفتاری توجه می‌کند و دنبال معنا می‌گردد؛ دیگری کمتر درگیر تفسیر رفتار می‌شود.",
      "برداشت‌های بسیار متفاوت شکل می‌گیرد و احتمال سوءتفاهم بیشتر می‌شود… این تفاوت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
    ],
  };

  // Handle relation type and missing dimension keys safely
  if (relation === "very_different") {
    const loops = veryDifferentLoops[dimensionKey];
    if (loops) {
      return loops;
    }
    // Fallback: return generic neutral loop if dimension key is missing
    return [
      "یک موقعیت مبهم یا حساس رخ می‌دهد…",
      "ذهن‌ها با سرعت و جهت متفاوت واکنش نشان می‌دهند…",
      "برداشت‌های متفاوت شکل می‌گیرد… این تفاوت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
    ];
  }

  // For "different" relation
  const loops = differentLoops[dimensionKey];
  if (loops) {
    return loops;
  }
  // Fallback: return generic neutral loop if dimension key is missing
  return [
    "یک موقعیت مبهم یا حساس رخ می‌دهد…",
    "ذهن‌ها با سرعت و جهت متفاوت واکنش نشان می‌دهند…",
    "برداشت‌های متفاوت شکل می‌گیرد… این تفاوت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.",
  ];
}

// Generate emotional experience for both people
export function generateEmotionalExperience(
  dimensionKey: DimensionKey,
  nameA: string,
  nameB: string,
  aLevel: "low" | "medium" | "high",
  bLevel: "low" | "medium" | "high",
  relation?: "similar" | "different" | "very_different"
): { forA: string; forB: string; shared?: string } {
  // If aligned, return shared text
  if (relation === "similar") {
    const sharedTexts: Record<DimensionKey, string> = {
      stickiness: "هر دوی شما احتمالاً وقتی موضوعی تمام شده اما هنوز در ذهن است، به شکل مشابه واکنش نشان می‌دهید؛ این شباهت می‌تواند باعث شود سریع‌تر همدیگر را بفهمید.",
      pastBrooding: "هر دوی شما احتمالاً وقتی گذشته دوباره برمی‌گردد، به شکل مشابه واکنش نشان می‌دهید؛ این شباهت می‌تواند باعث شود سریع‌تر همدیگر را بفهمید.",
      futureWorry: "هر دوی شما احتمالاً در موقعیت‌های مبهم یا قبل از تصمیم‌گیری، به شکل مشابه واکنش نشان می‌دهید؛ این شباهت می‌تواند باعث شود سریع‌تر همدیگر را بفهمید.",
      interpersonal: "هر دوی شما احتمالاً وقتی نشانه‌های رفتاری مبهم می‌شود، ذهن‌تان دنبال معنا می‌گردد؛ این شباهت می‌تواند باعث شود سریع‌تر همدیگر را بفهمید.",
    };
    return { forA: "", forB: "", shared: sharedTexts[dimensionKey] };
  }
  const experiences: Record<DimensionKey, Record<"low" | "medium" | "high", { higher: string; lower: string }>> = {
    stickiness: {
      high: { higher: "احساس می‌کند موضوع مهم است و باید حل شود", lower: "احساس می‌کند موضوع تمام شده و باید جلو رفت" },
      medium: { higher: "احساس می‌کند موضوع مهم است و باید حل شود", lower: "احساس می‌کند موضوع تمام شده و باید جلو رفت" },
      low: { higher: "احساس می‌کند موضوع مهم است و باید حل شود", lower: "احساس می‌کند موضوع تمام شده و باید جلو رفت" },
    },
    pastBrooding: {
      high: { higher: "احساس می‌کند گذشته هنوز مهم است", lower: "احساس می‌کند باید از گذشته عبور کرد" },
      medium: { higher: "احساس می‌کند گذشته هنوز مهم است", lower: "احساس می‌کند باید از گذشته عبور کرد" },
      low: { higher: "احساس می‌کند گذشته هنوز مهم است", lower: "احساس می‌کند باید از گذشته عبور کرد" },
    },
    futureWorry: {
      high: { higher: "احساس می‌کند باید آینده را کنترل کرد", lower: "احساس می‌کند باید با ابهام کنار آمد" },
      medium: { higher: "احساس می‌کند باید آینده را کنترل کرد", lower: "احساس می‌کند باید با ابهام کنار آمد" },
      low: { higher: "احساس می‌کند باید آینده را کنترل کرد", lower: "احساس می‌کند باید با ابهام کنار آمد" },
    },
    interpersonal: {
      high: { higher: "احساس می‌کند نشانه‌ها مهم هستند", lower: "احساس می‌کند نشانه‌ها را بیش‌ازحد جدی گرفته می‌شود" },
      medium: { higher: "احساس می‌کند نشانه‌ها مهم هستند", lower: "احساس می‌کند نشانه‌ها را بیش‌ازحد جدی گرفته می‌شود" },
      low: { higher: "احساس می‌کند نشانه‌ها مهم هستند", lower: "احساس می‌کند نشانه‌ها را بیش‌ازحد جدی گرفته می‌شود" },
    },
  };
  
  const levelOrder: Record<"low" | "medium" | "high", number> = { low: 1, medium: 2, high: 3 };
  const aLevelOrder = levelOrder[aLevel];
  const bLevelOrder = levelOrder[bLevel];
  const isAHigher = aLevelOrder > bLevelOrder;
  const isBHigher = bLevelOrder > aLevelOrder;
  
  const expA = experiences[dimensionKey][aLevel];
  const expB = experiences[dimensionKey][bLevel];
  
  const forA = isAHigher ? expA.higher : (isBHigher ? expA.lower : expA.higher);
  const forB = isBHigher ? expB.higher : (isAHigher ? expB.lower : expB.higher);
  
  return { forA, forB };
}

// Get similarity complementary sentence
export function getSimilarityComplementarySentence(similarity: "low" | "medium" | "high"): string {
  const sentences: Record<"low" | "medium" | "high", string> = {
    high: "در بسیاری از موقعیت‌ها، واکنش ذهنی شما به هم نزدیک است.",
    medium: "در برخی موقعیت‌ها همسو و در برخی متفاوت واکنش نشان می‌دهید.",
    low: "در چند الگوی کلیدی، ذهن‌های شما متفاوت واکنش نشان می‌دهند.",
  };
  return sentences[similarity];
}

// Generate dimension summary with levels
export function generateDimensionSummary(
  relation: "similar" | "different" | "very_different",
  aLevel: "low" | "medium" | "high",
  bLevel: "low" | "medium" | "high"
): string {
  if (relation === "similar") {
    if (aLevel === "low" && bLevel === "low") {
      return "این بُعد برای هر دو نفر کم‌فعال است و معمولاً نقش کم‌رنگ‌تری دارد.";
    } else if (aLevel === "high" && bLevel === "high") {
      return "هر دو در این بُعد فعال‌ترند و واکنش مشابهی نشان می‌دهند.";
    } else {
      return "این بُعد برای هر دو نفر مشابه عمل می‌کند.";
    }
  } else if (relation === "different") {
    return "در این بُعد، سبک پردازش ذهنی متفاوت است.";
  } else {
    return "در این بُعد، احتمال سوءبرداشت بیشتر است.";
  }
}

// Get similarities and differences lists
export function getSimilaritiesAndDifferences(
  dimensions: Record<DimensionKey, { relation: "similar" | "different" | "very_different"; delta: number }>
): { similarities: DimensionKey[]; differences: DimensionKey[] } {
  const similarities: DimensionKey[] = [];
  const differences: DimensionKey[] = [];
  
  for (const key of DIMENSIONS) {
    const dim = dimensions[key];
    if (!dim) continue; // Null-guard
    if (dim.relation === "similar") {
      similarities.push(key);
    } else {
      differences.push(key);
    }
  }
  
  // Sort differences by delta (descending)
  differences.sort((a, b) => {
    const dimA = dimensions[a];
    const dimB = dimensions[b];
    if (!dimA || !dimB) return 0; // Null-guard
    return dimB.delta - dimA.delta;
  });
  
  return { similarities, differences };
}

import { buildInviteTextForCopy } from "@/utils/inviteCta";

// Update generateSafeShareText with standard text
export function generateSafeShareText(
  nameA: string,
  nameB: string,
  overallSimilarity: "low" | "medium" | "high",
  largestDiffKey: DimensionKey | null
): string {
  const lines: string[] = [
    "این صفحه نشان می‌دهد ذهن دو نفر از نظر نشخوار فکری چگونه شبیه یا متفاوت عمل می‌کند.",
    "هدف آن قضاوت یا تشخیص نیست؛ کمک می‌کند سوءتفاهم‌ها را انسانی‌تر بفهمیم.",
  ];

  if (largestDiffKey) {
    lines.push("");
    lines.push(`بزرگ‌ترین تفاوت ما در: ${getDimensionNameForSnapshot(largestDiffKey)}`);
  }

  lines.push("");
  lines.push(buildInviteTextForCopy()); // CTA + URL on separate line

  return lines.join("\n");
}

// DEV: Unit-like test for generateMisunderstandingLoop
if (import.meta.env.DEV) {
  // Test very_different case to ensure it returns an array
  const testResult = generateMisunderstandingLoop("stickiness", "very_different");
  if (!Array.isArray(testResult)) {
    console.error("[relationalContent] DEV ASSERTION FAILED: generateMisunderstandingLoop('stickiness', 'very_different') must return array, got:", typeof testResult);
  } else if (testResult.length === 0) {
    console.warn("[relationalContent] DEV WARNING: generateMisunderstandingLoop('stickiness', 'very_different') returned empty array");
  } else {
    console.log("[relationalContent] DEV TEST PASSED: generateMisunderstandingLoop('stickiness', 'very_different') returns array of length", testResult.length);
  }
  
  // Test all dimension keys with very_different
  for (const key of DIMENSIONS) {
    const result = generateMisunderstandingLoop(key, "very_different");
    if (!Array.isArray(result) || result.length === 0) {
      console.error(`[relationalContent] DEV ASSERTION FAILED: generateMisunderstandingLoop('${key}', 'very_different') returned invalid result:`, result);
    }
  }
}

