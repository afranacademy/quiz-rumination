// Server-side comparison logic (duplicated from client for Netlify Functions)
// This computes comparison between two answer arrays

export type ComparisonResult = {
  similarityPercent: number;
  similarityLabel: string;
  similarities: Array<{
    questionIndex: number;
    questionText: string;
    diff: number;
    insight: string;
  }>;
  differences: Array<{
    questionIndex: number;
    questionText: string;
    diff: number;
    insight: string;
  }>;
  allQuestions: Array<{
    questionIndex: number;
    questionText: string;
    inviterAnswer: number;
    inviteeAnswer: number;
    diff: number;
    category: "same" | "close" | "different" | "veryDifferent";
    insight: string;
  }>;
};

const COMPARE_INSIGHTS = [
  {
    same: "هر دو نفر در این موقعیت ذهنی واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های ذهنی شما در این موقعیت نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر درگیر فکر بشه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در این موقعیت، واکنش‌های ذهنی شما خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر بعد از اشتباه، واکنش مشابهی نشون می‌دین و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما بعد از اشتباه نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر خودش رو سرزنش کنه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در این موقعیت، واکنش‌های شما بعد از اشتباه خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در تصمیم‌گیری، الگوی مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "الگوهای تصمیم‌گیری شما نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر تحلیل کنه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در تصمیم‌گیری، الگوهای شما خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در رابطه با گذشته و آینده، واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما نسبت به گذشته و آینده نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر بین گذشته و آینده در رفت‌و‌برگشت داشته باشه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در این موقعیت، واکنش‌های شما نسبت به گذشته و آینده خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در مقایسه با دیگران، واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما در مقایسه با دیگران نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر به مقایسه بپردازه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در این موقعیت، واکنش‌های شما در مقایسه با دیگران خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در رابطه‌ها، واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما در رابطه‌ها نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر سناریوهای منفی بسازه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در رابطه‌ها، واکنش‌های شما خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در مواجهه با اضطراب، واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما در مواجهه با اضطراب نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر با فکر کردن سعی کنه اضطراب رو کنترل کنه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در مواجهه با اضطراب، واکنش‌های شما خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در مرور اشتباه‌ها، واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما در مرور اشتباه‌ها نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر به عقب برگرده و اشتباه‌ها رو مرور کنه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در مرور اشتباه‌ها، واکنش‌های شما خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در رابطه با فکر کردن زیاد، واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما در رابطه با فکر کردن زیاد نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر احساس کنه که باید زیاد فکر کنه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در این موقعیت، واکنش‌های شما نسبت به فکر کردن زیاد خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در کنترل فکرها، واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما در کنترل فکرها نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر احساس کنه که نمی‌تونه فکرها رو کنترل کنه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در کنترل فکرها، واکنش‌های شما خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در خروج از چرخه فکر، واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما در خروج از چرخه فکر نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر بتونه از چرخه فکر خارج بشه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در خروج از چرخه فکر، واکنش‌های شما خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
  {
    same: "هر دو نفر در پذیرش اشتباه، واکنش مشابهی دارید و احتمالاً می‌تونید همدیگه رو درک کنین.",
    close: "واکنش‌های شما در پذیرش اشتباه نزدیک به همه و احتمالاً درک متقابل خوبی دارید.",
    different: "اینجا یکی از شما ممکنه بیشتر بتونه اشتباه رو بپذیره و ذهنش رو به چیز دیگه مشغول کنه و دیگری کمتر، که می‌تونه منبع سوءتفاهم باشه.",
    veryDifferent: "در پذیرش اشتباه، واکنش‌های شما خیلی متفاوته و ممکنه نیاز به توضیح بیشتر داشته باشه.",
  },
];

const QUESTION_TEXTS = [
  "وقتی یه فکر یا موضوع توی ذهنم می‌افته، حتی وقتی می‌دونم بی‌فایده‌ست، باز ذهنم ولش نمی‌کنه.",
  "وقتی اشتباهی می‌کنم، ذهنم مدام صحنه رو مرور می‌کنه و خودمو سرزنش می‌کنم.",
  "وقتی بین چند تا انتخاب گیر می‌کنم، اون‌قدر تحلیل می‌کنم که تصمیم‌گیری برام سخت یا غیرممکن می‌شه.",
  "بعضی وقتا هم از گذشته ناراحت می‌شم، هم از آینده می‌ترسم؛ انگار ذهنم بینشون رفت‌و‌برگشت داره.",
  "وقتی زندگی بقیه رو می‌بینم، ذهنم سریع می‌ره سمت مقایسه و حسِ کمبود.",
  "توی رابطه‌هام، یه پیام یا رفتار کوچیک باعث می‌شه تو ذهنم سناریوهای منفی بسازم.",
  "وقتی اضطراب می‌گیرم، سعی می‌کنم با فکر کردن زیاد آروم بشم، ولی معمولاً اضطرابم بیشتر می‌شه.",
  "ذهنم زیاد برمی‌گرده عقب تا اشتباه‌ها یا گفتگوهای قبلی رو مرور و «اصلاح» کنه.",
  "بعضی وقتا حس می‌کنم اگه زیاد درباره‌ی یه موضوع فکر نکنم، یه چیز مهم از دستم می‌ره.",
  "حس می‌کنم ذهنم خودش شروع می‌کنه به فکر کردن و نمی‌تونم متوقفش کنم.",
  "وقتی ذهنم شلوغ می‌شه، معمولاً می‌فهمم و می‌تونم از چرخه فکر بیام بیرون.",
  "وقتی اشتباه یا مشکل پیش میاد، سعی می‌کنم بپذیرمش و ذهنمو به چیز دیگه مشغول کنم.",
];

export function computeComparisonServer(
  inviterAnswers: number[],
  inviteeAnswers: number[]
): ComparisonResult {
  if (inviterAnswers.length !== 12 || inviteeAnswers.length !== 12) {
    throw new Error("Answers arrays must have exactly 12 elements");
  }

  const maxDiff = 4 * 12;
  let sumDiff = 0;

  const questionDiffs: Array<{
    questionIndex: number;
    diff: number;
    inviterAnswer: number;
    inviteeAnswer: number;
  }> = [];

  for (let i = 0; i < 12; i++) {
    const diff = Math.abs(inviterAnswers[i] - inviteeAnswers[i]);
    sumDiff += diff;
    questionDiffs.push({
      questionIndex: i,
      diff,
      inviterAnswer: inviterAnswers[i],
      inviteeAnswer: inviteeAnswers[i],
    });
  }

  const similarityPercent = Math.round((1 - sumDiff / maxDiff) * 100);

  let similarityLabel: string;
  if (similarityPercent >= 80) {
    similarityLabel = "شباهت زیاد";
  } else if (similarityPercent >= 60) {
    similarityLabel = "شباهت متوسط";
  } else if (similarityPercent >= 40) {
    similarityLabel = "شباهت کم";
  } else {
    similarityLabel = "تفاوت زیاد";
  }

  const allQuestions = questionDiffs.map((qd) => {
    const rule = COMPARE_INSIGHTS[qd.questionIndex];
    if (!rule) {
      throw new Error(`Missing compare rule for question ${qd.questionIndex}`);
    }

    let category: "same" | "close" | "different" | "veryDifferent";
    let insight: string;

    if (qd.diff === 0) {
      category = "same";
      insight = rule.same;
    } else if (qd.diff === 1) {
      category = "close";
      insight = rule.close;
    } else if (qd.diff === 2) {
      category = "different";
      insight = rule.different;
    } else {
      category = "veryDifferent";
      insight = rule.veryDifferent;
    }

    const questionText = QUESTION_TEXTS[qd.questionIndex] || "";

    return {
      questionIndex: qd.questionIndex,
      questionText,
      inviterAnswer: qd.inviterAnswer,
      inviteeAnswer: qd.inviteeAnswer,
      diff: qd.diff,
      category,
      insight,
    };
  });

  const sortedByDiff = [...allQuestions].sort((a, b) => a.diff - b.diff);
  const similarities = sortedByDiff.slice(0, 3).map((q) => ({
    questionIndex: q.questionIndex,
    questionText: q.questionText,
    diff: q.diff,
    insight: q.insight,
  }));

  const differences = sortedByDiff
    .slice(-3)
    .reverse()
    .map((q) => ({
      questionIndex: q.questionIndex,
      questionText: q.questionText,
      diff: q.diff,
      insight: q.insight,
    }));

  return {
    similarityPercent,
    similarityLabel,
    similarities,
    differences,
    allQuestions,
  };
}
