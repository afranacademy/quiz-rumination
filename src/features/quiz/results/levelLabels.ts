import type { LevelKey } from "../types";

export const levelLabels: Record<LevelKey, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

export function getLevelLabel(level: LevelKey): string {
  return levelLabels[level];
}
