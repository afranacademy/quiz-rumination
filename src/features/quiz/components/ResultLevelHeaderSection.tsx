import { Icon } from "./Icon";
import type { LevelKey } from "../types";

interface ResultLevelHeaderSectionProps {
  level: LevelKey;
  title: string;
  headline: string;
}

export function ResultLevelHeaderSection({ level, title, headline }: ResultLevelHeaderSectionProps) {
  // Level-specific icons
  const levelIcons: Record<LevelKey, string> = {
    low: "level-low",
    medium: "level-medium",
    high: "level-high",
  };

  return (
    <div className="bg-primary/15 backdrop-blur-2xl border border-primary/30 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6 text-right mb-4 sm:mb-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <Icon name={levelIcons[level]} className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white/90 shrink-0" title={title} />
        <h2 className="text-base sm:text-lg md:text-xl text-foreground font-medium">{title}</h2>
      </div>
      <h3 className="text-sm sm:text-base md:text-lg text-foreground/90 font-normal pr-8 sm:pr-10 leading-7 sm:leading-8">{headline}</h3>
    </div>
  );
}

