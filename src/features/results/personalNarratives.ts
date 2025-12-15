import type { LikertValue } from "@/features/quiz/types";

export type Likert = 0 | 1 | 2 | 3 | 4;
export type PersonalNarratives = Record<number, Record<Likert, string>>;

export const personalNarratives: PersonalNarratives = {
  1: {
    0: "ذهن من معمولاً بعد از عبور یک فکر، به آن نمی‌چسبد و به‌راحتی جلو می‌رود.",
    1: "اغلب از فکرها عبور می‌کنم، مگر در موضوع‌هایی که برایم اهمیت احساسی دارند.",
    2: "برخی فکرها بیش از حد لازم در ذهنم می‌مانند، حتی وقتی می‌دانم نتیجه‌ای ندارند.",
    3: "ذهنم معمولاً روی فکرهای تکراری می‌ماند و رها کردن آن‌ها برایم سخت است.",
    4: "وقتی فکری فعال می‌شود، ذهنم معمولاً به آن می‌چسبد و قطع این چرخه دشوار است.",
  },
  2: {
    0: "بعد از اشتباه، ذهنم معمولاً وارد چرخه‌ی سرزنش نمی‌شود و می‌توانم جلوتر بروم.",
    1: "گاهی اشتباه را مرور می‌کنم، اما این مرور معمولاً کوتاه و گذراست.",
    2: "برخی اشتباه‌ها باعث می‌شوند ذهنم مدتی درگیر نقد و بازبینی خودش شود.",
    3: "بعد از اشتباه، ذهنم بارها صحنه را مرور می‌کند و سرزنش ذهنی پررنگ می‌شود.",
    4: "تقریباً هر اشتباهی ذهنم را وارد چرخه‌ی مکرر مرور و خودقضاوت می‌کند.",
  },
  3: {
    0: "معمولاً بعد از بررسی گزینه‌ها می‌توانم تصمیم بگیرم و حرکت کنم.",
    1: "فقط در تصمیم‌های خاص ذهنم کمی بیش‌ازحد درگیر تحلیل می‌شود.",
    2: "گاهی تحلیل زیاد باعث می‌شود تصمیم‌گیری برایم کندتر یا سخت‌تر شود.",
    3: "تحلیل زیاد معمولاً تصمیم‌گیری را برایم فرسایشی و دشوار می‌کند.",
    4: "ذهنم اغلب آن‌قدر تحلیل می‌کند که تصمیم‌گیری متوقف یا بسیار سخت می‌شود.",
  },
  4: {
    0: "ذهنم معمولاً در زمان حال می‌ماند و کمتر بین گذشته و آینده نوسان می‌کند.",
    1: "گاهی ذهنم به گذشته یا آینده می‌رود، اما سریع به تعادل برمی‌گردد.",
    2: "برخی مواقع همزمان درگیر خاطرات گذشته و نگرانی‌های آینده می‌شوم.",
    3: "ذهنم اغلب بین ناراحتی‌های گذشته و ترس‌های آینده در رفت‌وبرگشت است.",
    4: "تقریباً همیشه ذهنم بین گذشته و آینده نوسان می‌کند و ماندن در حال سخت است.",
  },
  5: {
    0: "ذهنم معمولاً وارد مقایسه‌ی خودم با دیگران نمی‌شود.",
    1: "گاهی مقایسه فعال می‌شود، اما زود متوجه می‌شوم و از آن عبور می‌کنم.",
    2: "دیدن زندگی دیگران بعضی وقت‌ها حس کمبود را در ذهنم فعال می‌کند.",
    3: "مقایسه با دیگران اغلب باعث فعال شدن حس ناکافی بودن در ذهنم می‌شود.",
    4: "تقریباً همیشه مقایسه‌ی ذهنی باعث می‌شود خودم را کمتر یا عقب‌تر ببینم.",
  },
  6: {
    0: "معمولاً از نشانه‌های کوچک در رابطه برداشت منفی نمی‌کنم.",
    1: "گاهی ذهنم درگیر نشانه‌های کوچک می‌شود، اما زود جمعش می‌کنم.",
    2: "برخی رفتارهای مبهم باعث می‌شوند ذهنم چند سناریوی منفی بسازد.",
    3: "اغلب از پیام‌ها یا رفتارهای کوچک سناریوهای منفی شکل می‌گیرد.",
    4: "تقریباً هر نشانه‌ی مبهمی ذهنم را وارد سناریوسازی منفی می‌کند.",
  },
  7: {
    0: "برای آرام شدن وارد فکرهای تکراری نمی‌شوم.",
    1: "گاهی با فکر کردن سعی می‌کنم آرام شوم، اما زود متوقفش می‌کنم.",
    2: "بعضی وقت‌ها برای کاهش اضطراب وارد فکر کردن زیاد می‌شوم.",
    3: "اغلب با فکر کردن زیاد سعی می‌کنم اضطراب را کنترل کنم، ولی مؤثر نیست.",
    4: "تقریباً همیشه برای آرام شدن وارد چرخه‌ی فکرهای تکراری می‌شوم.",
  },
  8: {
    0: "بعد از پایان یک موقعیت، ذهنم معمولاً برنمی‌گردد آن را مرور کند.",
    1: "گاهی گذشته را مرور می‌کنم، اما این مرور کوتاه است.",
    2: "برخی موقعیت‌ها باعث می‌شوند ذهنم به دنبال «بهتر گفتن یا انجام دادن» برگردد.",
    3: "ذهنم اغلب گفتگوها و اشتباه‌های گذشته را بارها مرور می‌کند.",
    4: "تقریباً همیشه ذهنم درگیر مرور و اصلاح ذهنی اتفاق‌های گذشته می‌شود.",
  },
  9: {
    0: "احساس نمی‌کنم برای از دست ندادن چیزها باید زیاد فکر کنم.",
    1: "گاهی این نگرانی می‌آید، اما مانع جلو رفتنم نمی‌شود.",
    2: "برخی وقت‌ها فکر می‌کنم اگر زیاد بررسی نکنم، چیزی از دست می‌رود.",
    3: "اغلب حس می‌کنم باید زیاد فکر کنم تا چیزی از قلم نیفتد.",
    4: "تقریباً همیشه باور دارم فکر نکردن زیاد مساوی از دست دادن است.",
  },
  10: {
    0: "شروع و توقف فکرها معمولاً تحت کنترل خودم است.",
    1: "گاهی فکرها خودبه‌خود شروع می‌شوند، اما می‌توانم متوقفشان کنم.",
    2: "بعضی وقت‌ها فکرها خودکار شروع می‌شوند و کنترل سخت‌تر می‌شود.",
    3: "اغلب حس می‌کنم ذهنم بدون اختیار وارد فکرهای تکراری می‌شود.",
    4: "تقریباً همیشه فکرها خودبه‌خود شروع می‌شوند و توقفشان دشوار است.",
  },
  11: {
    0: "وقتی ذهنم شلوغ می‌شود، معمولاً متوجهش نمی‌شوم و در چرخه می‌مانم.",
    1: "گاهی شلوغی ذهن را می‌فهمم، اما بیرون آمدن سخت است.",
    2: "بعضی وقت‌ها می‌توانم شلوغی ذهن را تشخیص بدهم و کمی فاصله بگیرم.",
    3: "اغلب متوجه چرخه‌ی فکر می‌شوم و می‌توانم از آن خارج شوم.",
    4: "تقریباً همیشه شلوغی ذهن را تشخیص می‌دهم و آگاهانه فاصله می‌گیرم.",
  },
  12: {
    0: "بعد از مشکل، ذهنم معمولاً درگیر می‌ماند و رها کردن سخت است.",
    1: "گاهی سعی می‌کنم بپذیرم و توجه را عوض کنم، ولی ذهن برمی‌گردد.",
    2: "بعضی وقت‌ها می‌توانم بپذیرم و ذهنم را از موضوع دور کنم.",
    3: "اغلب بعد از اشتباه می‌توانم بپذیرم و توجهم را جابه‌جا کنم.",
    4: "تقریباً همیشه می‌توانم بپذیرم و ذهنم را از موضوع رها کنم.",
  },
};

const FALLBACK_TEXT = "پاسخ ثبت نشده";

/**
 * Gets personal narrative lines for all 12 questions based on user answers.
 * Uses raw answer values (0-4) directly - does NOT reverse for questions 11 and 12.
 * 
 * @param answers - Array of 12 answers (0-4) in order (answers[0] = Question 1, answers[11] = Question 12)
 * @returns Array of 12 narrative strings in question order
 */
export function getPersonalNarrativeLines(answers: LikertValue[]): string[] {
  // Validate answers array length
  if (!answers || !Array.isArray(answers) || answers.length !== 12) {
    if (import.meta.env.DEV) {
      console.warn("[getPersonalNarrativeLines] Invalid answers array:", {
        answers,
        length: answers?.length,
      });
    }
    // Return array of fallback texts
    return new Array(12).fill(FALLBACK_TEXT);
  }

  const narratives: string[] = [];

  // Process each question (1-12)
  for (let i = 0; i < 12; i++) {
    const questionId = i + 1; // Question IDs are 1-indexed
    const answer = answers[i];

    // Debug logging for each question
    if (import.meta.env.DEV) {
      console.log(`[getPersonalNarrativeLines] Processing Q${questionId}:`, {
        index: i,
        answer,
        answerType: typeof answer,
      });
    }

    // Validate answer value
    if (
      answer === null ||
      answer === undefined ||
      typeof answer !== "number" ||
      answer < 0 ||
      answer > 4 ||
      !Number.isInteger(answer)
    ) {
      if (import.meta.env.DEV) {
        console.warn(
          `[getPersonalNarrativeLines] Invalid answer for question ${questionId}:`,
          answer
        );
      }
      narratives.push(FALLBACK_TEXT);
      continue;
    }

    // Look up narrative (use raw answer value, do NOT reverse for Q11/Q12)
    const questionMap = personalNarratives[questionId];
    if (!questionMap) {
      if (import.meta.env.DEV) {
        console.warn(
          `[getPersonalNarrativeLines] Missing narrative map for question ${questionId}`
        );
      }
      narratives.push(FALLBACK_TEXT);
      continue;
    }

    const narrative = questionMap[answer as Likert];
    if (!narrative || typeof narrative !== "string") {
      if (import.meta.env.DEV) {
        console.warn(
          `[getPersonalNarrativeLines] Missing narrative for question ${questionId}, answer ${answer}`
        );
      }
      narratives.push(FALLBACK_TEXT);
      continue;
    }

    // Debug: Log selected narrative
    if (import.meta.env.DEV) {
      console.log(`[getPersonalNarrativeLines] Q${questionId} (answer=${answer}):`, {
        narrativePreview: narrative.substring(0, 60) + "...",
      });
    }

    narratives.push(narrative);
  }

  // Ensure we always return exactly 12 strings
  if (narratives.length !== 12) {
    if (import.meta.env.DEV) {
      console.error(
        `[getPersonalNarrativeLines] Expected 12 narratives, got ${narratives.length}`
      );
    }
    // Pad with fallback if needed
    while (narratives.length < 12) {
      narratives.push(FALLBACK_TEXT);
    }
    // Truncate if somehow we got more
    return narratives.slice(0, 12);
  }

  return narratives;
}

