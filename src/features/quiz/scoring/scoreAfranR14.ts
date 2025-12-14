import type { LikertValue, ScoreBreakdown } from "../types";

export function reverseLikert(v: LikertValue): LikertValue {
  const map: Record<LikertValue, LikertValue> = {
    0: 4,
    1: 3,
    2: 2,
    3: 1,
    4: 0,
  };
  return map[v];
}

export function scoreAfranR14(
  answers: Record<number, LikertValue>
): ScoreBreakdown {
  const reversedItemIds = [11, 12];
  let total = 0;

  for (let itemId = 1; itemId <= 12; itemId++) {
    const answer = answers[itemId];
    if (answer === undefined) {
      continue;
    }

    const isReversed = reversedItemIds.includes(itemId);
    const score = isReversed ? reverseLikert(answer) : answer;
    total += score;
  }

  const maxTotal = 48;
  const normalized = total / maxTotal;

  return {
    total,
    maxTotal,
    normalized,
    reversedItemIds,
  };
}
