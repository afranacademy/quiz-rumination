import type { LevelConfig, LevelKey } from "../types";

export const levelConfig: LevelConfig[] = [
  {
    key: "low",
    titleFa: "کم",
    min: 0,
    max: 16,
  },
  {
    key: "medium",
    titleFa: "متوسط",
    min: 17,
    max: 32,
  },
  {
    key: "high",
    titleFa: "زیاد",
    min: 33,
    max: 48,
  },
];

export function getLevel(
  total: number,
  config: LevelConfig[] = levelConfig
): LevelKey {
  for (const level of config) {
    if (total >= level.min && total <= level.max) {
      return level.key;
    }
  }
  // Fallback to high if no match (shouldn't happen with proper config)
  return "high";
}
