import type { DimensionKey } from "../quiz/types";

export type Comparison = {
  id: string;
  createdAt: string; // ISO
  attemptAId: string;
  attemptBId: string;
  summarySimilarity: "low" | "medium" | "high";
  dimensions: Record<
    DimensionKey,
    {
      aScore: number;
      bScore: number;
      delta: number; // abs(aScore - bScore), rounded to 1 decimal
      relation: "similar" | "different" | "very_different";
      direction: "a_higher" | "b_higher" | "equal"; // which person has higher score
      aLevel: "low" | "medium" | "high";
      bLevel: "low" | "medium" | "high";
    }
  >;
};

