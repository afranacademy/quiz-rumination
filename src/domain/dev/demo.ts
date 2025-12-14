import type { Attempt, Answers12 } from "../quiz/types";
import { computeTotalScore, normalizeAnswers } from "../quiz/scoring";
import { computeDimensionScores, levelOfDimension } from "../quiz/dimensions";
import { compareAttempts } from "../compare/compare";
import { buildCompareCardPayload } from "../compare/payload";

/**
 * Creates a mock attempt with the given answers.
 */
function createMockAttempt(
  id: string,
  firstName: string,
  lastName: string,
  phone: string,
  answers: Answers12
): Attempt {
  const totalScore = computeTotalScore(answers);
  const dimensionScores = computeDimensionScores(answers);

  return {
    id,
    createdAt: new Date().toISOString(),
    user: {
      firstName,
      lastName,
      phone,
    },
    answers,
    totalScore,
    dimensionScores,
  };
}

/**
 * Runs a demo of the scoring and comparison logic.
 * Logs results to console.
 */
export function runDemo(): void {
  console.log("=== Rumination Quiz Domain Demo ===\n");

  // Mock attempt A: mostly low scores
  const answersA: Answers12 = normalizeAnswers([0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 4, 4]);
  const attemptA = createMockAttempt(
    "attempt-a",
    "علی",
    "احمدی",
    "+989123456789",
    answersA
  );

  // Mock attempt B: mostly high scores
  const answersB: Answers12 = normalizeAnswers([4, 3, 3, 4, 3, 4, 3, 3, 4, 3, 0, 0]);
  const attemptB = createMockAttempt(
    "attempt-b",
    "سارا",
    "رضایی",
    "+989987654321",
    answersB
  );

  console.log("Attempt A:");
  console.log("  User:", `${attemptA.user.firstName} ${attemptA.user.lastName}`);
  console.log("  Answers:", attemptA.answers);
  console.log("  Total Score:", attemptA.totalScore, "/ 48");
  console.log("  Dimension Scores:");
  for (const [key, score] of Object.entries(attemptA.dimensionScores)) {
    console.log(`    ${key}: ${score} (${levelOfDimension(score)})`);
  }

  console.log("\nAttempt B:");
  console.log("  User:", `${attemptB.user.firstName} ${attemptB.user.lastName}`);
  console.log("  Answers:", attemptB.answers);
  console.log("  Total Score:", attemptB.totalScore, "/ 48");
  console.log("  Dimension Scores:");
  for (const [key, score] of Object.entries(attemptB.dimensionScores)) {
    console.log(`    ${key}: ${score} (${levelOfDimension(score)})`);
  }

  console.log("\n--- Comparison ---");
  const comparison = compareAttempts(attemptA, attemptB);
  console.log("  Summary Similarity:", comparison.summarySimilarity);
  console.log("  Dimensions:");
  for (const [key, data] of Object.entries(comparison.dimensions)) {
    console.log(`    ${key}:`);
    console.log(`      A: ${data.aScore} (${data.aLevel})`);
    console.log(`      B: ${data.bScore} (${data.bLevel})`);
    console.log(`      Delta: ${data.delta}`);
    console.log(`      Relation: ${data.relation}`);
  }

  console.log("\n--- Compare Card Payload ---");
  const payload = buildCompareCardPayload(comparison);
  console.log("  Summary Similarity:", payload.summarySimilarity);
  console.log("  Highlights:", payload.highlights.length);
  payload.highlights.forEach((h, i) => {
    console.log(`    ${i + 1}. ${h.titleFa} (${h.relation}):`);
    console.log(`       ${h.bodyFa.substring(0, 80)}...`);
  });
  console.log("  Safety Phrases:", payload.safetyPhrasesFa.length);
  console.log("  Conversation Starters:", payload.conversationStartersFa.length);
  console.log("  Share Text Preview:");
  console.log(payload.shareTextFa.substring(0, 200) + "...");

  console.log("\n=== Demo Complete ===\n");
}

