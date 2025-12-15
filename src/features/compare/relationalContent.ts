import type { DimensionKey } from "@/domain/quiz/types";

/**
 * Relational content generator for the "ذهن ما کنار هم" page.
 * All content is pattern-based, non-diagnostic, and focused on relational understanding.
 */

// Dimension definitions (1-line, scientific but human, process-based)
export const DIMENSION_DEFINITIONS: Record<DimensionKey, string> = {
  stickiness: "چسبندگی فکری: میزان تمایل ذهن برای ماندن روی یک فکر، حتی پس از پایان موقعیت",
  pastBrooding: "نشخوار گذشته: گرایش ذهن برای بازگشت مکرر به اشتباه‌ها، گفتگوها یا موقعیت‌های قبلی",
  futureWorry: "نگرانی آینده: میزان درگیری ذهن با پیش‌بینی، احتمال‌سنجی و تلاش برای کنترل اتفاقات پیش‌رو",
  interpersonal: "حساسیت بین‌فردی: میزان توجه ذهن به نشانه‌های رفتاری، پیام‌ها و تغییرات ظریف در تعامل با دیگران",
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

// Get the dimension with largest difference
// Fallback: If tie or unclear, use priority order: stickiness > pastBrooding > futureWorry > interpersonal
export function getLargestDifferenceDimension(
  dimensions: Record<DimensionKey, { delta: number; aScore: number; bScore: number; aLevel: "low" | "medium" | "high"; bLevel: "low" | "medium" | "high" }>
): { key: DimensionKey; delta: number; aScore: number; bScore: number; aLevel: "low" | "medium" | "high"; bLevel: "low" | "medium" | "high" } | null {
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
  let maxDelta = -1;
  let maxKey: DimensionKey | null = null;
  const candidates: Array<{ key: DimensionKey; delta: number }> = [];

  // Find all dimensions with the maximum delta
  for (const key of dimensionKeys) {
    if (dimensions[key].delta > maxDelta) {
      maxDelta = dimensions[key].delta;
    }
  }

  // Collect all dimensions with maxDelta (handles ties)
  for (const key of dimensionKeys) {
    if (Math.abs(dimensions[key].delta - maxDelta) < 0.01) {
      candidates.push({ key, delta: dimensions[key].delta });
    }
  }

  // If tie, use priority order
  if (candidates.length > 1) {
    const priorityOrder: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
    for (const priorityKey of priorityOrder) {
      const candidate = candidates.find(c => c.key === priorityKey);
      if (candidate) {
        maxKey = candidate.key;
        break;
      }
    }
  } else if (candidates.length === 1) {
    maxKey = candidates[0].key;
  }

  if (!maxKey) return null;

  return {
    key: maxKey,
    delta: dimensions[maxKey].delta,
    aScore: dimensions[maxKey].aScore,
    bScore: dimensions[maxKey].bScore,
    aLevel: dimensions[maxKey].aLevel,
    bLevel: dimensions[maxKey].bLevel,
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
  bScore: number
): string {
  const isAHigher = aScore > bScore;
  const direction: "A higher" | "B higher" | "aligned" = 
    Math.abs(aScore - bScore) < 0.8 ? "aligned" : (isAHigher ? "A higher" : "B higher");

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

  const content = interpretations[dimensionKey][direction];
  const higherName = direction === "A higher" ? nameA : direction === "B higher" ? nameB : nameA;
  const lowerName = direction === "A higher" ? nameB : direction === "B higher" ? nameA : nameB;

  if (direction === "aligned") {
    return `در موقعیت‌های حساس،
ذهن‌های شما در این بُعد مشابه عمل می‌کنند.

این شباهت ممکن است باعث شود ${content.feelingA}
و درک متقابل راحت‌تر باشد.

این الگوها معمولاً ناخواسته‌اند
و از فرآیندهای ذهنی طبیعی می‌آیند.`;
  }

  return `در موقعیت‌های حساس،
ذهن ${higherName} معمولاً ${content.higher}
در حالی که ذهن ${lowerName} بیشتر ${content.lower}

این تفاوت ممکن است باعث شود یکی احساس ${content.feelingA}
و دیگری احساس ${content.feelingB}

این واکنش‌ها معمولاً ناخواسته‌اند
و از تفاوت در فرآیندهای ذهنی می‌آیند.`;
}

// Neutral blended interpretation fallback (when dimension is unclear)
export function generateNeutralBlendedInterpretation(): string {
  return `ذهن‌های شما در چند الگوی کلیدی متفاوت عمل می‌کنند،
و این تفاوت‌ها ممکن است در موقعیت‌های احساسی مختلف فعال شوند،
بدون اینکه نیت یا قصد خاصی پشت آن‌ها باشد.`;
}

// Contextual triggers based on dominant dimension (Section 5)
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

// Conversation starters (Section 6)
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
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
  
  for (const key of dimensionKeys) {
    const dim = dimensions[key];
    if (dim.aLevel !== "low" || dim.bLevel !== "low") {
      return true; // At least one user has MEDIUM or HIGH on at least one dimension
    }
  }
  
  return false; // Both users are LOW on all dimensions
}

// Generate safe share text (pattern-based, no numbers, safe to forward)
export function generateSafeShareText(
  nameA: string,
  nameB: string,
  overallSimilarity: "low" | "medium" | "high",
  largestDiffKey: DimensionKey | null
): string {
  const similarityText: Record<"low" | "medium" | "high", string> = {
    low: "کم",
    medium: "متوسط",
    high: "زیاد",
  };

  const lines: string[] = [
    "ما یه مقایسه‌ی ذهنی انجام دادیم",
    "برای فهم بهتر تفاوت‌هامون، نه قضاوت.",
    "",
    "این صفحه نشون می‌ده ذهن‌هامون",
    "توی بعضی موقعیت‌ها چطور متفاوت عمل می‌کنن،",
    "و چرا بعضی سوءتفاهم‌ها ناخواسته پیش میاد.",
    "",
    `شباهت کلی: ${similarityText[overallSimilarity]}`,
  ];

  if (largestDiffKey) {
    lines.push("");
    lines.push(`بزرگ‌ترین تفاوت: ${getDimensionNameForSnapshot(largestDiffKey)}`);
  }

  lines.push("");
  lines.push("این مقایسه برای درک بهتر ذهن‌هاست، نه قضاوت یا تشخیص.");
  lines.push("نتایج تقریبی‌اند و ممکن است با شرایط تغییر کنند.");

  return lines.join("\n");
}

