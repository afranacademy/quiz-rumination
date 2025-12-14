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
      relation: "similar" | "different";
      aLevel: "low" | "medium" | "high";
      bLevel: "low" | "medium" | "high";
    }
  >;
};

