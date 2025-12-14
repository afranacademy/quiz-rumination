import { RUMINATION_COMPARE_RULES } from "./ruminationCompareInsights";
import { quizDefinition } from "../quiz/data/afranR14";

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

export function computeComparison(input: {
  inviterAnswers: number[];
  inviteeAnswers: number[];
  inviterFirstName?: string;
  inviteeFirstName?: string;
}): ComparisonResult {
  const { inviterAnswers, inviteeAnswers } = input;

  if (inviterAnswers.length !== 12 || inviteeAnswers.length !== 12) {
    throw new Error("Answers arrays must have exactly 12 elements");
  }

  const maxDiff = 4 * 12; // 48
  let sumDiff = 0;

  const questionDiffs: Array<{
    questionIndex: number;
    diff: number;
    inviterAnswer: number;
    inviteeAnswer: number;
  }> = [];

  // Calculate differences for each question
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

  // Calculate similarity percentage
  const similarityPercent = Math.round((1 - sumDiff / maxDiff) * 100);

  // Determine similarity label
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

  // Generate insights for each question
  const allQuestions = questionDiffs.map((qd) => {
    const rule = RUMINATION_COMPARE_RULES[qd.questionIndex];
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

    const questionText = quizDefinition.items[qd.questionIndex]?.text || "";

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

  // Sort by diff to find top similarities and differences
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
