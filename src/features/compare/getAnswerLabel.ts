import { quizDefinition } from "../quiz/data/afranR14";

export function getAnswerLabel(answer: number): string {
  if (answer < 0 || answer > 4) {
    return "نامشخص";
  }
  return quizDefinition.scale.labels[answer];
}
