import type { DimensionKey } from "@/domain/quiz/types";

/**
 * DEV-only: Golden test cases for template selection verification.
 * These cases represent dimension-score level scenarios (not raw questions).
 */
export type GoldenCase = {
  label: string;
  aScores: Record<DimensionKey, number>;
  bScores: Record<DimensionKey, number>;
};

export const GOLDEN_CASES: GoldenCase[] = [
  // Case 1: A all low vs B all high (maximum difference)
  {
    label: "A all low (0.5) vs B all high (3.5) - maximum difference",
    aScores: {
      stickiness: 0.5,
      pastBrooding: 0.5,
      futureWorry: 0.5,
      interpersonal: 0.5,
    },
    bScores: {
      stickiness: 3.5,
      pastBrooding: 3.5,
      futureWorry: 3.5,
      interpersonal: 3.5,
    },
  },

  // Case 2: Both uniform medium (similar pattern)
  {
    label: "Both uniform medium (2.0) - similar pattern",
    aScores: {
      stickiness: 2.0,
      pastBrooding: 2.0,
      futureWorry: 2.0,
      interpersonal: 2.0,
    },
    bScores: {
      stickiness: 2.0,
      pastBrooding: 2.0,
      futureWorry: 2.0,
      interpersonal: 2.0,
    },
  },

  // Case 3: Single dominant dimension (stickiness very different, others similar)
  {
    label: "Single dominant dimension - stickiness very different, others similar",
    aScores: {
      stickiness: 0.5, // very different from B
      pastBrooding: 2.0,
      futureWorry: 2.0,
      interpersonal: 2.0,
    },
    bScores: {
      stickiness: 3.5, // very different from A
      pastBrooding: 2.1,
      futureWorry: 1.9,
      interpersonal: 2.0,
    },
  },

  // Case 4: Mixed tie across 2 dimensions (two dimensions tied at top)
  {
    label: "Mixed tie - pastBrooding and futureWorry tied at top",
    aScores: {
      stickiness: 1.0,
      pastBrooding: 3.0, // tied top
      futureWorry: 3.0, // tied top
      interpersonal: 1.5,
    },
    bScores: {
      stickiness: 1.0,
      pastBrooding: 1.0, // different from A
      futureWorry: 1.0, // different from A
      interpersonal: 1.5,
    },
  },

  // Case 5: Different relation (similar vs different dimensions)
  {
    label: "Mixed relations - some similar, some different",
    aScores: {
      stickiness: 1.5,
      pastBrooding: 1.6, // similar (delta < 0.8)
      futureWorry: 0.5, // different (delta >= 0.8 and < 1.6)
      interpersonal: 0.0, // very different (delta >= 1.6)
    },
    bScores: {
      stickiness: 2.0,
      pastBrooding: 2.0,
      futureWorry: 2.0,
      interpersonal: 4.0,
    },
  },

  // Case 6: Direction A_higher in one dimension, B_higher in another
  {
    label: "Mixed directions - A higher in stickiness, B higher in interpersonal",
    aScores: {
      stickiness: 3.5, // A higher
      pastBrooding: 2.0,
      futureWorry: 2.0,
      interpersonal: 1.0, // B higher
    },
    bScores: {
      stickiness: 1.5,
      pastBrooding: 2.0,
      futureWorry: 2.0,
      interpersonal: 3.5,
    },
  },
];

