import type { Comparison } from "./types";
import type { DimensionKey } from "../quiz/types";
import { formatInviteText } from "@/utils/inviteCta";

export type CompareRelation = "similar" | "different";

export type CompareDimensionPayload = {
  key: DimensionKey;
  titleFa: string;
  relation: CompareRelation;
  bodyFa: string;
  definitionFa: string;
};

export type CompareCardPayload = {
  summarySimilarity: "low" | "medium" | "high";
  highlights: CompareDimensionPayload[];
  safetyPhrasesFa: string[];
  conversationStartersFa: string[];
  shareTextFa: string;
};

// Dimension titles (FA)
const DIMENSION_TITLES: Record<DimensionKey, string> = {
  stickiness: "چسبندگی فکری",
  pastBrooding: "گذشته‌محوری و خودسرزنشی",
  futureWorry: "آینده‌نگری و نگرانی",
  interpersonal: "حساسیت بین‌فردی و سناریوسازی",
};

// Main texts for similar relation
const SIMILAR_TEXTS: Record<DimensionKey, string> = {
  stickiness:
    "«ذهن هر دو نفر از نظر گیر کردن روی فکرها شبیه هم عمل می‌کنه؛ یا هر دو زود عبور می‌کنن، یا هر دو مدت بیشتری درگیر می‌مونن. این شباهت معمولاً باعث می‌شه واکنش‌های ذهنی همدیگه قابل‌پیش‌بینی‌تر باشه.»",
  pastBrooding:
    "«هر دو ذهن در برخورد با اشتباه‌ها یا موقعیت‌های قبلی واکنش مشابهی دارن؛ یا هر دو زود عبور می‌کنن، یا هر دو بیشتر مرور می‌کنن. این شباهت می‌تونه درک متقابل رو ساده‌تر کنه.»",
  futureWorry:
    "«ذهن هر دو نفر در مواجهه با آینده واکنش مشابهی داره؛ یا هر دو نسبتاً آرام‌اند، یا هر دو بیشتر پیش‌بینی و نگرانی می‌کنن. این شباهت می‌تونه باعث هم‌فهمی در موقعیت‌های مبهم بشه.»",
  interpersonal:
    "«هر دو نفر در رابطه‌ها حساسیت مشابهی دارن؛ یا هر دو زود سناریوسازی می‌کنن، یا هر دو کمتر وارد این فضا می‌شن. این شباهت معمولاً باعث می‌شه واکنش‌های رابطه‌ای قابل‌پیش‌بینی‌تر باشه.»",
};

// Main texts for different relation
const DIFFERENT_TEXTS: Record<DimensionKey, string> = {
  stickiness:
    "«یکی از شما زود از فکرها عبور می‌کنه، در حالی که دیگری بیشتر درگیر می‌مونه. این تفاوت ممکنه به‌اشتباه به‌صورت «بی‌اهمیتی» یا «گیر دادن» برداشت بشه، در حالی که ریشه‌اش فقط تفاوت در سرعت رهاسازی ذهنه.»",
  pastBrooding:
    "«یکی از شما بعد از اشتباه سریع جلو می‌ره، در حالی که دیگری بیشتر به عقب برمی‌گرده و مرور می‌کنه. این تفاوت ممکنه به‌شکل «بی‌تفاوتی» در برابر «خودخوری» دیده بشه، اما در اصل تفاوت در نحوه‌ی پردازش گذشته است.»",
  futureWorry:
    "«یکی از شما بیشتر به آینده فکر می‌کنه و سعی می‌کنه همه‌چیز رو پیش‌بینی کنه، در حالی که دیگری کمتر درگیر این روند می‌شه. این تفاوت ممکنه به‌صورت «نگرانی زیاد» در برابر «سهل‌گیری» برداشت بشه، در حالی که فقط تفاوت در سبک مواجهه با آینده است.»",
  interpersonal:
    "«یکی از شما از نشانه‌های کوچک سریع‌تر سناریو می‌سازه، در حالی که دیگری معمولاً ساده‌تر عبور می‌کنه. این تفاوت ممکنه به‌صورت «حساسیت زیاد» در برابر «بی‌توجهی» دیده بشه، در حالی که ریشه‌اش تفاوت در پردازش نشانه‌های رابطه‌ایه.»",
};

// Scientific definitions (FA)
const DEFINITIONS: Record<DimensionKey, string> = {
  stickiness:
    "چسبندگی فکری به میزان تمایل ذهن برای ماندن روی یک فکر، حتی پس از پایان موقعیت مربوط می‌شود. در روابط انسانی، این بُعد تعیین می‌کند آیا فرد می‌تواند از یک موضوع عبور کند یا آن را در تعامل‌های بعدی نیز با خود حمل می‌کند. سطح این بُعد بر طول و شدت درگیری‌های ذهنی و هیجانی در رابطه اثر می‌گذارد.",
  pastBrooding:
    "گذشته‌محوری به گرایش ذهن برای بازگشت مکرر به اشتباه‌ها، گفتگوها یا موقعیت‌های قبلی اشاره دارد. در روابط، این بُعد بر نحوه‌ی پردازش تعارض‌ها و خاطرات مشترک اثر می‌گذارد و تعیین می‌کند گذشته چقدر در حالِ رابطه حضور دارد. سطح آن می‌تواند تجربه‌ی تداوم یا پایان‌یافتگی موقعیت‌ها را تحت‌تأثیر قرار دهد.",
  futureWorry:
    "آینده‌نگری به میزان درگیری ذهن با پیش‌بینی، احتمال‌سنجی و تلاش برای کنترل اتفاق‌های پیشِ‌رو مربوط است. در روابط انسانی، این بُعد نقش مهمی در واکنش به ابهام، نااطمینانی و تصمیم‌های مشترک دارد. سطح آن مشخص می‌کند ذهن تا چه حد به آینده به‌عنوان منبع امنیت یا تهدید نگاه می‌کند.",
  interpersonal:
    "حساسیت بین‌فردی به میزان توجه ذهن به نشانه‌های رفتاری، پیام‌ها و تغییرات ظریف در تعامل با دیگران اشاره دارد. در روابط، این بُعد بر نحوه‌ی تفسیر رفتار طرف مقابل و ساخت معنا از تعامل‌ها اثر می‌گذارد. سطح آن تعیین می‌کند ذهن تا چه حد فعالانه به دنبال معنا در رفتارهای بین‌فردی می‌گردد.",
};

// Safety phrases (FA)
const SAFETY_PHRASES: string[] = [
  "«این تفاوت‌ها درباره‌ی نیت، علاقه یا ارزش افراد قضاوت نمی‌کنن.»",
  "«الگوهای ذهنی متفاوت می‌تونن همگی سالم باشن.»",
  "«تفاوت در نحوه‌ی فکر کردن ≠ مشکل در رابطه.»",
  "«این نتایج تقریبی‌اند و ممکنه با شرایطی مثل استرس یا خستگی تغییر کنن.»",
];

// Conversation starters (FA)
const CONVERSATION_STARTERS: string[] = [
  "«این تفاوت‌ها معمولاً توی چه موقعیت‌هایی بیشتر خودشون رو نشون می‌دن؟»",
  "«وقتی این تفاوت فعال می‌شه، هرکدوم چه حسی پیدا می‌کنیم؟»",
  "«کدوم بخش این مقایسه برات آشناتر بود؟»",
  "«فکر می‌کنی کجاها می‌تونیم همدیگه رو بهتر بفهمیم؟»",
];

/**
 * Builds a UI-ready payload from a Comparison.
 * Highlights are selected based on: different relations first, then by delta descending.
 * Maximum 3 highlights.
 */
export function buildCompareCardPayload(comparison: Comparison): CompareCardPayload {
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];

  // Separate dimensions by relation
  const differentDimensions: Array<{ key: DimensionKey; delta: number }> = [];
  const similarDimensions: Array<{ key: DimensionKey; delta: number }> = [];

  for (const key of dimensionKeys) {
    const dim = comparison.dimensions[key];
    if (dim.relation === "different") {
      differentDimensions.push({ key, delta: dim.delta });
    } else {
      similarDimensions.push({ key, delta: dim.delta });
    }
  }

  // Sort by delta descending
  differentDimensions.sort((a, b) => b.delta - a.delta);
  similarDimensions.sort((a, b) => b.delta - a.delta);

  // Select up to 3 highlights: different first, then similar
  const selectedKeys: DimensionKey[] = [];
  selectedKeys.push(...differentDimensions.slice(0, 3).map((d) => d.key));
  if (selectedKeys.length < 3) {
    selectedKeys.push(...similarDimensions.slice(0, 3 - selectedKeys.length).map((d) => d.key));
  }

  // Build highlight payloads
  const highlights: CompareDimensionPayload[] = selectedKeys.map((key) => {
    const dim = comparison.dimensions[key];
    return {
      key,
      titleFa: DIMENSION_TITLES[key],
      relation: dim.relation,
      bodyFa: dim.relation === "similar" ? SIMILAR_TEXTS[key] : DIFFERENT_TEXTS[key],
      definitionFa: DEFINITIONS[key],
    };
  });

  // Select 2 conversation starters (first 2)
  const conversationStartersFa = CONVERSATION_STARTERS.slice(0, 2);

  // Build share text
  const similarDims = highlights.filter((h) => h.relation === "similar");
  const differentDims = highlights.filter((h) => h.relation === "different");

  const shareLines: string[] = [
    "کارت «ذهن ما کنار هم»",
    "",
    "این مقایسه نشون می‌ده ذهن ما در موقعیت‌های مختلف چطور کار می‌کنه. این نتیجه برای درک بهتر طراحی شده، نه تشخیص یا قضاوت.",
    "",
  ];

  if (similarDims.length > 0) {
    shareLines.push("شباهت‌ها:");
    similarDims.forEach((dim) => {
      shareLines.push(`• ${dim.titleFa}`);
    });
    shareLines.push("");
  }

  if (differentDims.length > 0) {
    shareLines.push("تفاوت‌ها:");
    differentDims.forEach((dim) => {
      shareLines.push(`• ${dim.titleFa}`);
    });
    shareLines.push("");
  }

  shareLines.push(
    "تو هم می‌تونی آزمون «ذهن وراج» رو انجام بدی و نتیجه‌ات رو به اشتراک بذاری:",
    formatInviteText(true) // Include URL for share text
  );

  const shareTextFa = shareLines.join("\n");

  return {
    summarySimilarity: comparison.summarySimilarity,
    highlights,
    safetyPhrasesFa: SAFETY_PHRASES,
    conversationStartersFa,
    shareTextFa,
  };
}

