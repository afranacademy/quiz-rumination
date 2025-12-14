export type AnswerValue = 0 | 1 | 2 | 3 | 4;

export type Answers12 = readonly [
  AnswerValue,
  AnswerValue,
  AnswerValue,
  AnswerValue,
  AnswerValue,
  AnswerValue,
  AnswerValue,
  AnswerValue,
  AnswerValue,
  AnswerValue,
  AnswerValue,
  AnswerValue
];

export type UserEntry = {
  firstName: string;
  lastName: string;
  phone: string;
};

export type DimensionKey =
  | "stickiness"
  | "pastBrooding"
  | "futureWorry"
  | "interpersonal";

export type Attempt = {
  id: string;
  createdAt: string; // ISO
  user: UserEntry;
  answers: Answers12;
  totalScore: number; // 0..48
  dimensionScores: Record<DimensionKey, number>; // 0..4 (avg)
};

export const QUESTION_COUNT = 12 as const;

