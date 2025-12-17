import type { DimensionKey } from "@/domain/quiz/types";

export type Section =
  | "dominant_difference"
  | "mental_map"
  | "key_differences"
  | "loop"
  | "felt_experience"
  | "triggers"
  | "safety";

export type Relation = "similar" | "different" | "very_different";

export type Direction = "A_higher" | "B_higher" | "none";

export type Variance = "none" | "mixed" | "stable";

export type CompareTemplate = {
  id: string; // TEXT_ID
  section: Section;
  dimension?: DimensionKey;
  relation?: Relation;
  direction?: Direction;
  variance?: Variance;
  text: string; // EXACT multi-line text, preserved verbatim
};

/**
 * Template library for Compare Result page narratives.
 * All 66 templates from MD spec, preserving exact text verbatim.
 * Metadata normalized at load time (e.g., relation casing).
 */
export const COMPARE_TEMPLATES: CompareTemplate[] = [
  // PHASE 1 — Foundation (Dominant Difference DNA)
  {
    id: "A01_stickiness_none",
    section: "dominant_difference",
    dimension: "stickiness",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `این بُعد به نحوه‌ی ماندن یا رها شدن فکرها بعد از یک موقعیت مربوط است.
این‌که ذهن بعد از پایان یک موضوع، چقدر سریع از آن عبور می‌کند یا چقدر تمایل دارد دوباره به آن برگردد.
تفاوت در این بُعد معمولاً درباره‌ی سرعت خروج ذهن از فکرهاست، نه اهمیت دادن یا ندادن به موضوع.`,
  },
  {
    id: "A02_pastBrooding_none",
    section: "dominant_difference",
    dimension: "pastBrooding",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `این بُعد به میزان بازگشت ذهن به اتفاق‌ها، اشتباه‌ها یا گفت‌وگوهای قبلی مربوط می‌شود.
این‌که ذهن چقدر تمایل دارد گذشته را دوباره مرور کند تا آن را بفهمد، اصلاح کند یا از آن معنا بسازد.
تفاوت در این بُعد معمولاً درباره‌ی نحوه‌ی پردازش تجربه‌های قبلی است، نه گیر ماندن در گذشته.`,
  },
  {
    id: "A03_futureWorry_none",
    section: "dominant_difference",
    dimension: "futureWorry",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `این بُعد به درگیری ذهن با آینده، پیش‌بینی رویدادها و تلاش برای آماده‌بودن مربوط است.
این‌که ذهن چقدر زود به جلو می‌رود و شروع به تصور پیامدها، خطرها یا احتمالات می‌کند.
تفاوت در این بُعد معمولاً درباره‌ی میزان نیاز ذهن به اطمینان است، نه بدبینی یا خوش‌بینی.`,
  },
  {
    id: "A04_interpersonal_none",
    section: "dominant_difference",
    dimension: "interpersonal",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `این بُعد به میزان توجه ذهن به نشانه‌های رفتاری در رابطه‌ها مربوط است؛
مثل پیام، لحن، سکوت، تغییرات ظریف یا رفتارهای غیرکلامی.
تفاوت در این بُعد معمولاً درباره‌ی حساسیت ذهن به معناست، نه وابستگی یا توقع.`,
  },
  {
    id: "A99_global_safety",
    section: "safety",
    dimension: "interpersonal",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `این متن‌ها قرار نیست بگویند چه کسی درست است.
قرار است نشان دهند ذهن‌ها چطور متفاوت واکنش نشان می‌دهند.`,
  },

  // PHASE 2 — Mental Map (12 texts)
  {
    id: "B01_stickiness_similar",
    section: "mental_map",
    dimension: "stickiness",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `در این بُعد، ذهن هر دو نفر تمایل مشابهی در ماندن یا رها کردن فکرها بعد از یک موقعیت دارد.
وقتی موضوعی تمام می‌شود، ذهن‌ها معمولاً با سرعتی نزدیک از آن عبور می‌کنند یا روی آن می‌مانند.
این همسویی می‌تواند باعث شود ریتم ذهنی دو طرف در پایان موقعیت‌ها قابل پیش‌بینی‌تر باشد.`,
  },
  {
    id: "B02_stickiness_different",
    section: "mental_map",
    dimension: "stickiness",
    relation: "different",
    direction: "none",
    variance: "none",
    text: `در این بُعد، تفاوت‌هایی در میزان ماندن ذهن روی فکرها دیده می‌شود.
یکی ممکن است بعد از یک اتفاق، سریع‌تر از فکر عبور کند، در حالی که دیگری تمایل دارد مدت بیشتری با آن بماند.
این تفاوت معمولاً به سبک پردازش ذهنی مربوط است، نه حساسیت یا اهمیت دادن بیشتر.`,
  },
  {
    id: "B03_stickiness_very_different",
    section: "mental_map",
    dimension: "stickiness",
    relation: "very_different",
    direction: "none",
    variance: "none",
    text: `در این بُعد، فاصله‌ی قابل‌توجهی در نحوه‌ی رها یا نگه‌داشتن فکرها وجود دارد.
ذهن‌ها ممکن است بعد از یک موقعیت، زمان بسیار متفاوتی را درگیر همان موضوع بمانند یا از آن عبور کنند.
این اختلاف در ریتم ذهنی می‌تواند زمینه‌ی سوءبرداشت ایجاد کند، حتی اگر موضوع از نظر هر دو حل‌شده یا مهم نباشد.`,
  },
  {
    id: "B04_pastBrooding_similar",
    section: "mental_map",
    dimension: "pastBrooding",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `در این بُعد، ذهن هر دو نفر الگوی نسبتاً مشابهی در برگشت به اتفاق‌ها و اشتباه‌های قبلی دارد.
وقتی یک موقعیت تمام می‌شود، میزان مرور ذهنی گذشته برای هر دو در سطحی نزدیک رخ می‌دهد.
این همسویی می‌تواند باعث شود نحوه‌ی عبور از تجربه‌های قبلی برای هر دو قابل‌درک‌تر باشد.`,
  },
  {
    id: "B05_pastBrooding_different",
    section: "mental_map",
    dimension: "pastBrooding",
    relation: "different",
    direction: "none",
    variance: "none",
    text: `در این بُعد، تفاوت‌هایی در میزان برگشت ذهن به اتفاق‌ها و اشتباه‌های قبلی دیده می‌شود.
یکی ممکن است بعد از یک تجربه، کمتر به گذشته برگردد، در حالی که دیگری تمایل دارد آن را بیشتر مرور کند.
این تفاوت معمولاً به شیوه‌ی پردازش ذهنی تجربه‌ها مربوط است، نه گیرکردن یا ناتوانی در رها کردن.`,
  },
  {
    id: "B06_pastBrooding_very_different",
    section: "mental_map",
    dimension: "pastBrooding",
    relation: "very_different",
    direction: "none",
    variance: "none",
    text: `در این بُعد، فاصله‌ی چشمگیری در میزان بازگشت ذهن به گذشته وجود دارد.
ذهن‌ها ممکن است بعد از یک اتفاق، زمان بسیار متفاوتی را صرف مرور، بازبینی یا بازسازی آن کنند.
این اختلاف می‌تواند باعث شود یک نفر احساس کند موضوع تمام شده، در حالی که برای دیگری هنوز زنده و فعال است.`,
  },
  {
    id: "B07_futureWorry_similar",
    section: "mental_map",
    dimension: "futureWorry",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `در این بُعد، ذهن هر دو نفر الگوی نسبتاً مشابهی در مواجهه با آینده دارد.
میزان درگیری ذهن با پیش‌بینی، برنامه‌ریزی یا نگرانی درباره‌ی اتفاق‌های پیشِ‌رو برای هر دو نزدیک به هم است.
این همسویی می‌تواند باعث شود نگاه آن‌ها به آینده، ریتم و حساسیت مشابهی داشته باشد.`,
  },
  {
    id: "B08_futureWorry_different",
    section: "mental_map",
    dimension: "futureWorry",
    relation: "different",
    direction: "none",
    variance: "none",
    text: `در این بُعد، تفاوت‌هایی در میزان توجه ذهن به آینده دیده می‌شود.
یکی ممکن است بیشتر درگیر پیش‌بینی و کنترل اتفاق‌های پیشِ‌رو باشد، در حالی که دیگری با فشار ذهنی کمتری به آینده نگاه می‌کند.
این تفاوت معمولاً به سبک مواجهه با عدم قطعیت مربوط است، نه خوش‌بینی یا بدبینی شخصی.`,
  },
  {
    id: "B09_futureWorry_very_different",
    section: "mental_map",
    dimension: "futureWorry",
    relation: "very_different",
    direction: "none",
    variance: "none",
    text: `در این بُعد، فاصله‌ی قابل‌توجهی در میزان نگرانی یا پیش‌نگری نسبت به آینده وجود دارد.
ذهن‌ها ممکن است با شدت بسیار متفاوتی به عدم قطعیت‌ها واکنش نشان دهند؛ یکی بیشتر درگیر سنجش پیامدها و دیگری کمتر مشغول آن‌هاست.
این اختلاف می‌تواند باعث شود یک نفر نیاز بیشتری به اطمینان داشته باشد، در حالی که دیگری با ابهام راحت‌تر کنار می‌آید.`,
  },
  {
    id: "B10_interpersonal_similar",
    section: "mental_map",
    dimension: "interpersonal",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `در این بُعد، ذهن هر دو نفر به نشانه‌های رفتاری در رابطه توجهی نسبتاً مشابه دارد.
پیام‌ها، لحن، سکوت یا تغییرات رفتاری معمولاً به شکل نزدیک‌تری تفسیر می‌شوند.
این همسویی می‌تواند باعث شود برداشت‌ها قابل پیش‌بینی‌تر و سوءبرداشت‌ها کمتر شوند، بدون اینکه به معنای یکسان بودن احساس‌ها باشد.`,
  },
  {
    id: "B11_interpersonal_different",
    section: "mental_map",
    dimension: "interpersonal",
    relation: "different",
    direction: "none",
    variance: "none",
    text: `در این بُعد، ذهن‌ها به نشانه‌های رفتاری با شدت یا مسیر متفاوتی توجه می‌کنند.
یکی ممکن است زودتر به پیام، لحن یا تغییرات رفتاری معنا بدهد، در حالی که دیگری کمتر درگیر این نشانه‌ها می‌شود.
این تفاوت معمولاً به تفاوت در سبک تفسیر ذهنی برمی‌گردد، نه میزان اهمیت دادن به رابطه.`,
  },
  {
    id: "B12_interpersonal_very_different",
    section: "mental_map",
    dimension: "interpersonal",
    relation: "very_different",
    direction: "none",
    variance: "none",
    text: `در این بُعد، تفاوت قابل‌توجهی در نحوه‌ی توجه ذهن‌ها به نشانه‌های رفتاری وجود دارد.
ذهن‌ها ممکن است از یک پیام یا رفتار، برداشت‌های کاملاً متفاوتی بسازند.
این فاصله‌ی تفسیری می‌تواند احتمال سوءبرداشت را بیشتر کند، حتی زمانی که نیت یا احساس دو طرف منفی نیست.`,
  },

  // PHASE 3 — Key Differences (12 texts)
  {
    id: "C01_stickiness_A_higher",
    section: "key_differences",
    dimension: "stickiness",
    relation: "different",
    direction: "A_higher",
    variance: "none",
    text: `در موقعیت‌های ذهنی حل‌نشده، ذهن نفر اول معمولاً مدت بیشتری روی یک فکر یا موضوع می‌ماند،
در حالی که ذهن نفر دوم راحت‌تر می‌تواند از آن عبور کند و توجهش را به موضوع بعدی ببرد.
این تفاوت می‌تواند باعث شود یکی احساس کند موضوع هنوز ناتمام است و دیگری فکر کند زمانِ جلو رفتن رسیده.`,
  },
  {
    id: "C02_stickiness_B_higher",
    section: "key_differences",
    dimension: "stickiness",
    relation: "different",
    direction: "B_higher",
    variance: "none",
    text: `در موقعیت‌های ذهنی ناتمام، ذهن نفر دوم بیشتر تمایل دارد روی یک فکر یا مسئله بماند،
در حالی که ذهن نفر اول زودتر از آن فاصله می‌گیرد.
این تفاوت ممکن است یکی را درگیرتر و دیگری را رهاکننده‌تر نشان دهد، بدون اینکه نیت یا ترجیح ارزشی در کار باشد.`,
  },
  {
    id: "C03_stickiness_none",
    section: "key_differences",
    dimension: "stickiness",
    relation: "different",
    direction: "none",
    variance: "mixed",
    text: `در این بُعد، شدت درگیری ذهنی نزدیک است، اما شیوه‌ی ماندن یا عبور از فکرها فرق می‌کند.
هر دو ذهن ممکن است درگیر شوند، اما یکی با مکث طولانی‌تر و دیگری با جابه‌جایی سریع‌تر توجه.
این تفاوت بیشتر به سبک پردازش ذهنی مربوط است تا میزان اهمیت دادن.`,
  },
  {
    id: "C04_pastBrooding_A_higher",
    section: "key_differences",
    dimension: "pastBrooding",
    relation: "different",
    direction: "A_higher",
    variance: "none",
    text: `بعد از اشتباه‌ها یا موقعیت‌های گذشته، ذهن نفر اول بیشتر به عقب برمی‌گردد و آن‌ها را مرور می‌کند،
در حالی که ذهن نفر دوم زودتر از گذشته فاصله می‌گیرد.
این تفاوت می‌تواند یکی را درگیر فهم یا اصلاح نشان دهد و دیگری را متمرکز بر زمان حال، بدون اینکه یکی درست‌تر باشد.`,
  },
  {
    id: "C05_pastBrooding_B_higher",
    section: "key_differences",
    dimension: "pastBrooding",
    relation: "different",
    direction: "B_higher",
    variance: "none",
    text: `ذهن نفر دوم تمایل بیشتری به بازگشت و مرور اتفاق‌های گذشته دارد،
در حالی که ذهن نفر اول سریع‌تر به زمان حال برمی‌گردد.
این تفاوت ممکن است باعث شود یکی دنبال جمع‌بندی باشد و دیگری ترجیح دهد تمرکز را حفظ کند.`,
  },
  {
    id: "C06_pastBrooding_none",
    section: "key_differences",
    dimension: "pastBrooding",
    relation: "different",
    direction: "none",
    variance: "mixed",
    text: `هر دو ذهن به گذشته توجه می‌کنند، اما با الگوی متفاوت.
یکی ممکن است برای فهم یا اصلاح برگردد و دیگری فقط در موقعیت‌های خاص.
این تفاوت بیشتر به شیوه‌ی پردازش تجربه‌ها مربوط است، نه گیر کردن یا بی‌توجهی.`,
  },
  {
    id: "C07_futureWorry_A_higher",
    section: "key_differences",
    dimension: "futureWorry",
    relation: "different",
    direction: "A_higher",
    variance: "none",
    text: `در مواجهه با آینده، ذهن نفر اول بیشتر درگیر پیش‌بینی و سنجش پیامدهاست،
در حالی که ذهن نفر دوم با فشار کمتری به جلو نگاه می‌کند.
این تفاوت می‌تواند باعث شود یکی دنبال اطمینان باشد و دیگری راحت‌تر با ابهام کنار بیاید.`,
  },
  {
    id: "C08_futureWorry_B_higher",
    section: "key_differences",
    dimension: "futureWorry",
    relation: "different",
    direction: "B_higher",
    variance: "none",
    text: `ذهن نفر دوم نسبت به آینده حساس‌تر عمل می‌کند و بیشتر به پیامدهای احتمالی فکر می‌کند،
در حالی که ذهن نفر اول نگرانی کمتری را تجربه می‌کند.
این تفاوت معمولاً از شیوه‌ی مدیریت عدم قطعیت می‌آید، نه منفی‌نگری یا بی‌مسئولیتی.`,
  },
  {
    id: "C09_futureWorry_none",
    section: "key_differences",
    dimension: "futureWorry",
    relation: "different",
    direction: "none",
    variance: "mixed",
    text: `هر دو ذهن به آینده توجه دارند، اما تمرکز و زاویه‌ی نگاه متفاوت است.
یکی ممکن است بیشتر روی سناریوها بماند و دیگری روی حرکت رو‌به‌جلو.
این تفاوت بیشتر سبک مواجهه با آینده است، نه شدت نگرانی.`,
  },
  {
    id: "C10_interpersonal_A_higher",
    section: "key_differences",
    dimension: "interpersonal",
    relation: "different",
    direction: "A_higher",
    variance: "none",
    text: `در تعامل‌ها، ذهن نفر اول بیشتر به نشانه‌های رفتاری مثل لحن، سکوت یا تغییرات ظریف توجه می‌کند،
در حالی که ذهن نفر دوم کمتر وارد تفسیر این نشانه‌ها می‌شود.
این تفاوت ممکن است یکی را حساس‌تر و دیگری را ساده‌تر در ارتباط نشان دهد، بدون قصد یا نیت منفی.`,
  },
  {
    id: "C11_interpersonal_B_higher",
    section: "key_differences",
    dimension: "interpersonal",
    relation: "different",
    direction: "B_higher",
    variance: "none",
    text: `ذهن نفر دوم نسبت به پیام‌ها و نشانه‌های رفتاری حساس‌تر عمل می‌کند،
در حالی که ذهن نفر اول کمتر درگیر معناپردازی آن‌هاست.
این تفاوت می‌تواند باعث شود یکی دنبال معنا بگردد و دیگری رفتارها را مستقیم‌تر ببیند.`,
  },
  {
    id: "C12_interpersonal_none",
    section: "key_differences",
    dimension: "interpersonal",
    relation: "different",
    direction: "none",
    variance: "mixed",
    text: `هر دو ذهن به ارتباط توجه دارند، اما شیوه‌ی برداشت متفاوت است.
یکی ممکن است بیشتر به جزئیات رفتاری توجه کند و دیگری به پیام کلی.
این تفاوت سبک ارتباطی است، نه میزان اهمیت دادن به رابطه.`,
  },

  // PHASE 4 — Misunderstanding Loop (8 texts)
  {
    id: "D01_stickiness_different",
    section: "loop",
    dimension: "stickiness",
    relation: "different",
    direction: "none",
    variance: "none",
    text: `در یک موقعیت مبهم یا ناتمام،
یکی از ذهن‌ها تمایل دارد بیشتر روی فکر یا موضوع بماند،
در حالی که ذهن دیگر زودتر از آن عبور می‌کند و توجهش را جابه‌جا می‌کند.
این تفاوت می‌تواند باعث شود یکی احساس کند موضوع ناتمام رها شده
و دیگری حس کند بیش‌ازحد روی آن مکث می‌شود؛
این سوءبرداشت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.`,
  },
  {
    id: "D02_stickiness_very_different",
    section: "loop",
    dimension: "stickiness",
    relation: "very_different",
    direction: "none",
    variance: "none",
    text: `در یک موقعیت حساس،
یکی از ذهن‌ها به‌طور واضح روی فکرها می‌ماند و رها کردن برایش دشوار است،
در حالی که ذهن دیگر خیلی سریع از موضوع عبور می‌کند.
این فاصله‌ی پردازشی می‌تواند سوءتفاهم ایجاد کند؛
یکی فشارِ ماندن را تجربه کند و دیگری حس بی‌اهمیتی برداشت شود،
در حالی که این واکنش‌ها معمولاً بدون نیت منفی شکل می‌گیرند.`,
  },
  {
    id: "D03_pastBrooding_different",
    section: "loop",
    dimension: "pastBrooding",
    relation: "different",
    direction: "none",
    variance: "none",
    text: `پس از یک اتفاق یا گفت‌وگوی گذشته،
یکی از ذهن‌ها به عقب برمی‌گردد و آن را مرور می‌کند،
در حالی که ذهن دیگر تمرکزش را سریع‌تر به زمان حال برمی‌گرداند.
این تفاوت می‌تواند باعث شود یکی دنبال فهم یا اصلاح باشد
و دیگری فکر کند موضوع تمام شده؛
این برداشت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.`,
  },
  {
    id: "D04_pastBrooding_very_different",
    section: "loop",
    dimension: "pastBrooding",
    relation: "very_different",
    direction: "none",
    variance: "none",
    text: `در مواجهه با یک تجربه‌ی قبلی،
یکی از ذهن‌ها به‌طور مداوم به اشتباه‌ها یا گفتگوهای گذشته برمی‌گردد،
در حالی که ذهن دیگر خیلی کم به عقب نگاه می‌کند.
این فاصله می‌تواند سوءبرداشت بسازد؛
یکی احساس کند دیده نمی‌شود و دیگری احساس کند گذشته رها نمی‌شود،
در حالی که این واکنش‌ها معمولاً بدون قصد یا نیت منفی‌اند.`,
  },
  {
    id: "D05_futureWorry_different",
    section: "loop",
    dimension: "futureWorry",
    relation: "different",
    direction: "none",
    variance: "none",
    text: `در یک موقعیت نامطمئن،
یکی از ذهن‌ها زودتر به آینده و پیامدهای احتمالی فکر می‌کند،
در حالی که ذهن دیگر با تمرکز بیشتری در لحظه می‌ماند.
این تفاوت می‌تواند باعث شود یکی نگرانِ آماده نبودن باشد
و دیگری حس کند نگرانی بیش‌ازحد است؛
این برداشت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.`,
  },
  {
    id: "D06_futureWorry_very_different",
    section: "loop",
    dimension: "futureWorry",
    relation: "very_different",
    direction: "none",
    variance: "none",
    text: `در شرایط پرابهام،
یکی از ذهن‌ها به‌شدت درگیر پیش‌بینی آینده و کنترل پیامدها می‌شود،
در حالی که ذهن دیگر فشار بسیار کمتری از آینده تجربه می‌کند.
این اختلاف می‌تواند سوءتفاهم ایجاد کند؛
یکی احساس ناامنی کند و دیگری حس کند نگرانی بی‌دلیل است،
در حالی که این واکنش‌ها معمولاً بدون نیت منفی‌اند.`,
  },
  {
    id: "D07_interpersonal_different",
    section: "loop",
    dimension: "interpersonal",
    relation: "different",
    direction: "none",
    variance: "none",
    text: `در یک تعامل مبهم،
یکی از ذهن‌ها به نشانه‌های رفتاری مثل لحن، سکوت یا تغییرات ظریف توجه می‌کند،
در حالی که ذهن دیگر کمتر وارد تفسیر این نشانه‌ها می‌شود.
این تفاوت می‌تواند باعث شود یکی دنبال معنا بگردد
و دیگری از این میزان توجه متعجب شود؛
این برداشت‌ها معمولاً بدون قصد یا نیت منفی شکل می‌گیرند.`,
  },
  {
    id: "D08_interpersonal_very_different",
    section: "loop",
    dimension: "interpersonal",
    relation: "very_different",
    direction: "none",
    variance: "none",
    text: `در یک موقعیت ارتباطی حساس،
یکی از ذهن‌ها رفتارها و پیام‌ها را به‌طور پررنگ تفسیر می‌کند،
در حالی که ذهن دیگر آن‌ها را مستقیم‌تر و ساده‌تر می‌بیند.
این فاصله‌ی پردازشی می‌تواند سوءتفاهم بسازد؛
یکی احساس نادیده‌گرفته‌شدن کند و دیگری حس کند بیش‌ازحد معنا ساخته می‌شود،
در حالی که این واکنش‌ها معمولاً بدون قصد یا نیت منفی‌اند.`,
  },

  // PHASE 5 — Felt Experience (8 texts)
  {
    id: "E01_stickiness_A_higher",
    section: "felt_experience",
    dimension: "stickiness",
    relation: "different",
    direction: "A_higher",
    variance: "none",
    text: `A ممکن است حس کند بعضی موضوع‌ها هنوز ناتمام‌اند و نیاز دارند بیشتر در ذهن بمانند.
در مقابل، B ممکن است احساس کند عبور از موضوع و رفتن به جلو برایش طبیعی‌تر و کم‌فشارتر است.`,
  },
  {
    id: "E02_stickiness_B_higher",
    section: "felt_experience",
    dimension: "stickiness",
    relation: "different",
    direction: "B_higher",
    variance: "none",
    text: `B ممکن است حس کند بعضی فکرها هنوز رها نشده‌اند و لازم است بیشتر با آن‌ها بماند.
در حالی که A ممکن است احساس کند جابه‌جا کردن توجه و جلو رفتن برایش ساده‌تر است.`,
  },
  {
    id: "E03_pastBrooding_A_higher",
    section: "felt_experience",
    dimension: "pastBrooding",
    relation: "different",
    direction: "A_higher",
    variance: "none",
    text: `A ممکن است احساس کند لازم است اتفاق‌های گذشته دوباره مرور شوند تا بهتر فهمیده یا اصلاح شوند.
در مقابل، B ممکن است حس کند تمرکز روی زمان حال برایش آرامش‌بخش‌تر است.`,
  },
  {
    id: "E04_pastBrooding_B_higher",
    section: "felt_experience",
    dimension: "pastBrooding",
    relation: "different",
    direction: "B_higher",
    variance: "none",
    text: `B ممکن است حس کند بعضی تجربه‌های قبلی هنوز در ذهنش زنده‌اند و نیاز به پردازش دارند.
در حالی که A ممکن است احساس کند گذشته تمام شده و بهتر است در لحظه بماند.`,
  },
  {
    id: "E05_futureWorry_A_higher",
    section: "felt_experience",
    dimension: "futureWorry",
    relation: "different",
    direction: "A_higher",
    variance: "none",
    text: `A ممکن است احساس کند فکر کردن به آینده کمک می‌کند آماده‌تر باشد و غافلگیر نشود.
در مقابل، B ممکن است حس کند تمرکز کمتر روی آینده باعث آرامش ذهنی بیشتری می‌شود.`,
  },
  {
    id: "E06_futureWorry_B_higher",
    section: "felt_experience",
    dimension: "futureWorry",
    relation: "different",
    direction: "B_higher",
    variance: "none",
    text: `B ممکن است حس کند بررسی آینده به او احساس امنیت می‌دهد.
در حالی که A ممکن است احساس کند زندگی در لحظه برایش طبیعی‌تر و کم‌فشارتر است.`,
  },
  {
    id: "E07_interpersonal_A_higher",
    section: "felt_experience",
    dimension: "interpersonal",
    relation: "different",
    direction: "A_higher",
    variance: "none",
    text: `A ممکن است احساس کند نشانه‌های رفتاری، لحن یا سکوت‌ها مهم‌اند و نیاز به توجه دارند.
در مقابل، B ممکن است حس کند ارتباط‌ها را ساده‌تر و مستقیم‌تر تجربه می‌کند.`,
  },
  {
    id: "E08_interpersonal_B_higher",
    section: "felt_experience",
    dimension: "interpersonal",
    relation: "different",
    direction: "B_higher",
    variance: "none",
    text: `B ممکن است حس کند رفتارها و پیام‌ها معناهای ظریف‌تری دارند که باید دیده شوند.
در حالی که A ممکن است احساس کند این نشانه‌ها همیشه بار معنایی خاصی ندارند.`,
  },

  // PHASE 6 — Triggers + Safety (8 texts)
  {
    id: "F01_stickiness_triggers",
    section: "triggers",
    dimension: "stickiness",
    relation: "different",
    direction: "none",
    variance: "mixed",
    text: `• بعد از یک بحث یا گفت‌وگوی حل‌نشده
• وقتی موضوعی از نظر یکی تمام شده اما برای دیگری نه
• هنگام فشار زمانی یا خستگی ذهنی
• وقتی یکی می‌خواهد سریع جلو برود و دیگری مکث می‌کند`,
  },
  {
    id: "F02_pastBrooding_triggers",
    section: "triggers",
    dimension: "pastBrooding",
    relation: "different",
    direction: "none",
    variance: "mixed",
    text: `• بعد از اشتباه، سوءتفاهم یا ناراحتی
• وقتی موقعیتی یادآور تجربه‌های قبلی می‌شود
• در زمان‌های تنهایی یا سکوت
• هنگام مقایسه‌ی «اگر آن‌طور می‌شد» با وضعیت فعلی`,
  },
  {
    id: "F03_futureWorry_triggers",
    section: "triggers",
    dimension: "futureWorry",
    relation: "different",
    direction: "none",
    variance: "mixed",
    text: `• هنگام تصمیم‌گیری یا تغییرات مهم
• وقتی نتیجه یا مسیر نامشخص است
• در موقعیت‌های پرریسک یا ناپایدار
• وقتی صحبت از آینده‌ی نزدیک یا دور می‌شود`,
  },
  {
    id: "F04_interpersonal_triggers",
    section: "triggers",
    dimension: "interpersonal",
    relation: "different",
    direction: "none",
    variance: "mixed",
    text: `• وقتی پیام‌ها دیر پاسخ داده می‌شوند
• در تغییرات ظریف لحن یا رفتار
• هنگام سکوت یا ابهام در ارتباط
• بعد از تعامل‌هایی که توضیح شفافی ندارند`,
  },
  {
    id: "F05_stickiness_safety",
    section: "safety",
    dimension: "stickiness",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `این تفاوت معمولاً به شیوه‌ی رها کردن یا نگه‌داشتن فکرها مربوط است، نه میزان اهمیت دادن یا بی‌توجهی به موضوع‌ها.`,
  },
  {
    id: "F06_pastBrooding_safety",
    section: "safety",
    dimension: "pastBrooding",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `بازگشت ذهن به گذشته معمولاً تلاشی برای فهم، معنا دادن یا نظم‌دادن تجربه‌هاست، نه گیر کردن در اشتباه‌ها یا ناتوانی در رها کردن.`,
  },
  {
    id: "F07_futureWorry_safety",
    section: "safety",
    dimension: "futureWorry",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `فکر کردن به آینده می‌تواند راهی برای احساس آمادگی و امنیت باشد، نه نشانه‌ی بدبینی، ضعف یا کنترل‌گری.`,
  },
  {
    id: "F08_interpersonal_safety",
    section: "safety",
    dimension: "interpersonal",
    relation: "similar",
    direction: "none",
    variance: "none",
    text: `توجه بیشتر به نشانه‌های رفتاری معمولاً به سبک معنا‌سازی ذهن مربوط است، نه حساسیت بیش‌ازحد، سوءظن یا وابستگی.`,
  },

  // PHASE 7 — Aligned but Different Style (8 texts)
  {
    id: "G01_stickiness_aligned_mid",
    section: "key_differences",
    dimension: "stickiness",
    relation: "different",
    direction: "none",
    variance: "stable",
    text: `در این بُعد، شدت درگیری ذهنی هر دو نفر در سطحی نزدیک قرار دارد،
اما شیوه‌ی ماندن یا عبور از فکرها متفاوت است.
یکی ممکن است با مکث ذهنی جلو برود و دیگری با جابه‌جایی سریع‌تر توجه.
این تفاوت به سبک تنظیم ذهن مربوط است، نه میزان درگیری.`,
  },
  {
    id: "G02_stickiness_aligned_high",
    section: "key_differences",
    dimension: "stickiness",
    relation: "different",
    direction: "none",
    variance: "stable",
    text: `هر دو ذهن در این بُعد فعال‌اند و فکرها برایشان اهمیت دارد،
اما مسیر پردازش متفاوت است.
یکی تمایل دارد بیشتر با فکر بماند و دیگری سریع‌تر از آن عبور کند.
این اختلاف، تفاوت در شیوه‌ی پردازش است، نه اهمیت دادن.`,
  },
  {
    id: "G03_pastBrooding_aligned_mid",
    section: "key_differences",
    dimension: "pastBrooding",
    relation: "different",
    direction: "none",
    variance: "stable",
    text: `هر دو ذهن به تجربه‌های گذشته توجه نشان می‌دهند،
اما نحوه‌ی برگشت و مرور متفاوت است.
یکی گذشته را تحلیلی‌تر مرور می‌کند و دیگری گزینشی‌تر.
این تفاوت به سبک پردازش تجربه‌ها مربوط است، نه شدت درگیری.`,
  },
  {
    id: "G04_pastBrooding_aligned_high",
    section: "key_differences",
    dimension: "pastBrooding",
    relation: "different",
    direction: "none",
    variance: "stable",
    text: `ذهن هر دو نفر به گذشته فعالانه برمی‌گردد،
اما هدف و مسیر این بازگشت یکسان نیست.
یکی بیشتر به فهم و بازسازی توجه دارد و دیگری به جمع‌بندی و عبور.
این تفاوت، اختلاف در شیوه‌ی معنا‌سازی است، نه ماندن در گذشته.`,
  },
  {
    id: "G05_futureWorry_aligned_mid",
    section: "key_differences",
    dimension: "futureWorry",
    relation: "different",
    direction: "none",
    variance: "stable",
    text: `هر دو ذهن به آینده توجه دارند،
اما زاویه‌ی نگاه متفاوت است.
یکی آینده را برای آمادگی بررسی می‌کند و دیگری برای جهت‌گیری کلی.
این تفاوت، تفاوت در سبک مواجهه با عدم قطعیت است.`,
  },
  {
    id: "G06_futureWorry_aligned_high",
    section: "key_differences",
    dimension: "futureWorry",
    relation: "different",
    direction: "none",
    variance: "stable",
    text: `در این بُعد، ذهن هر دو نفر به‌طور پررنگ درگیر آینده است،
اما شیوه‌ی این درگیری فرق می‌کند.
یکی بیشتر روی سنجش پیامدها می‌ماند و دیگری روی حرکت رو‌به‌جلو.
این تفاوت به سبک پردازش آینده مربوط است، نه میزان نگرانی.`,
  },
  {
    id: "G07_interpersonal_aligned_mid",
    section: "key_differences",
    dimension: "interpersonal",
    relation: "different",
    direction: "none",
    variance: "stable",
    text: `هر دو ذهن به ارتباط توجه دارند،
اما مسیر تفسیر نشانه‌ها متفاوت است.
یکی بیشتر روی جزئیات رفتاری تمرکز می‌کند و دیگری روی پیام کلی.
این تفاوت، تفاوت در سبک معنا‌سازی ارتباط است.`,
  },
  {
    id: "G08_interpersonal_aligned_high",
    section: "key_differences",
    dimension: "interpersonal",
    relation: "different",
    direction: "none",
    variance: "stable",
    text: `هر دو ذهن نسبت به نشانه‌های ارتباطی حساس‌اند،
اما عمق و مسیر تفسیر متفاوت است.
یکی لایه‌های بیشتری از معنا می‌سازد و دیگری ساده‌تر دریافت می‌کند.
این اختلاف، تفاوت در سبک پردازش ارتباطی است، نه حساسیت بیش‌ازحد.`,
  },

  // PHASE 8 — Fallback (Low Confidence / Data Uncertain)
  {
    id: "H01_stickiness_low_confidence",
    section: "safety",
    dimension: "stickiness",
    relation: "similar",
    direction: "none",
    variance: "mixed",
    text: `در این بُعد، الگوی ذهنی ممکن است بسته به موقعیت تغییر کند.
داده‌های موجود بیشتر یک گرایش کلی را نشان می‌دهند، نه یک الگوی ثابت.`,
  },
  {
    id: "H02_pastBrooding_low_confidence",
    section: "safety",
    dimension: "pastBrooding",
    relation: "similar",
    direction: "none",
    variance: "mixed",
    text: `پردازش ذهنی تجربه‌های گذشته می‌تواند در زمان‌ها و موقعیت‌های مختلف متفاوت باشد.
این نتیجه بیشتر بازتاب یک تمایل موقعیتی است تا یک سبک پایدار.`,
  },
  {
    id: "H03_futureWorry_low_confidence",
    section: "safety",
    dimension: "futureWorry",
    relation: "similar",
    direction: "none",
    variance: "mixed",
    text: `نحوه‌ی مواجهه با آینده معمولاً تحت تأثیر شرایط فعلی قرار می‌گیرد.
این الگو ممکن است با تغییر فشار ذهنی یا موقعیت تغییر کند.`,
  },
  {
    id: "H04_interpersonal_low_confidence",
    section: "safety",
    dimension: "interpersonal",
    relation: "similar",
    direction: "none",
    variance: "mixed",
    text: `توجه به نشانه‌های ارتباطی می‌تواند بسته به رابطه یا موقعیت نوسان داشته باشد.
این نتیجه بیشتر یک الگوی احتمالی را نشان می‌دهد تا یک ویژگی ثابت.`,
  },
  {
    id: "H05_global_low_confidence",
    section: "safety",
    dimension: "interpersonal",
    relation: "similar",
    direction: "none",
    variance: "mixed",
    text: `این مقایسه بر اساس داده‌های فعلی ساخته شده و ممکن است همه‌ی موقعیت‌ها را پوشش ندهد.
الگوهای ذهنی انسان‌ها معمولاً پویا و وابسته به شرایط‌اند.`,
  },
  {
    id: "H06_global_very_low_confidence",
    section: "safety",
    dimension: "interpersonal",
    relation: "similar",
    direction: "none",
    variance: "mixed",
    text: `در این مقایسه، داده‌ها برای نتیجه‌گیری دقیق محدود بوده‌اند.
بهتر است این صفحه به‌عنوان یک تصویر کلی دیده شود، نه یک توصیف کامل.`,
  },
];

/**
 * Helper function to find templates by metadata (metadata-based lookup, not TEXT_ID)
 */
export function findTemplatesByMetadata(filters: {
  section?: Section;
  dimension?: DimensionKey;
  relation?: Relation;
  direction?: Direction;
  variance?: Variance;
}): CompareTemplate[] {
  return COMPARE_TEMPLATES.filter((template) => {
    if (filters.section && template.section !== filters.section) return false;
    if (filters.dimension && template.dimension !== filters.dimension) return false;
    if (filters.relation && template.relation !== filters.relation) return false;
    if (filters.direction && template.direction !== filters.direction) return false;
    if (filters.variance && template.variance !== filters.variance) return false;
    return true;
  });
}

