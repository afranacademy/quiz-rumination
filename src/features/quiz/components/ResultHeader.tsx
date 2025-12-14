import { ResultBadge } from "@/app/components/ResultBadge";
import { BrandLogo } from "@/components/BrandLogo";
import type { LevelKey } from "../types";

interface ResultHeaderProps {
  firstName: string | null;
  score: number;
  level: LevelKey;
}

export function ResultHeader({ firstName, score, level }: ResultHeaderProps) {
  const maxScore = 48;
  const greeting = firstName ? `${firstName}، نتیجه‌ی آزمونت آماده‌ست` : "نتیجه‌ی آزمونت آماده‌ست";

  return (
    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-4 sm:p-5 md:p-6 lg:p-8 text-center space-y-4 sm:space-y-5 md:space-y-6">
      {/* Logo */}
      <div className="flex justify-center">
        <BrandLogo size="md" />
      </div>
      <h1 className="text-lg sm:text-xl md:text-2xl text-foreground font-semibold leading-tight px-2">
        نتیجه آزمون سنجش نشخوار فکری
        <span className="block text-sm sm:text-base md:text-lg text-muted-foreground mt-1 font-normal">
          (ذهن وراج)
        </span>
      </h1>
      <p className="text-sm sm:text-base md:text-lg text-foreground/90">{greeting}</p>
      
      <div className="inline-block">
        <ResultBadge level={level} className="text-base sm:text-lg md:text-xl px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4" />
      </div>
      
      <div className="flex items-center justify-center gap-2 sm:gap-3 text-muted-foreground/80 flex-wrap">
        <span className="text-xs sm:text-sm md:text-base">امتیاز شما:</span>
        <span className="text-2xl sm:text-3xl md:text-4xl font-medium text-foreground">{score}</span>
        <span className="text-xs sm:text-sm md:text-base">از {maxScore}</span>
      </div>
    </div>
  );
}
