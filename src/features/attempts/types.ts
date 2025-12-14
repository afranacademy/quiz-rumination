import type { DimensionKey } from "@/domain/quiz/types";

export type DimensionScores = Record<DimensionKey, number>;

export type AttemptPayload = {
  quizId: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  answers: number[]; // length 12, values 0-4
  totalScore: number; // 0-48
  bandId: number;
  dimensionScores: DimensionScores;
};

export type CreatedAttempt = {
  id: string;
  createdAt: string;
};

