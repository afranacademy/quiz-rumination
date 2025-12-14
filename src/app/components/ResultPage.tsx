import { RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { ResultHeader } from "@/features/quiz/components/ResultHeader";
import { ResultBlocks } from "@/features/quiz/components/ResultBlocks";
import { RecommendationSection } from "@/features/quiz/components/RecommendationCard";
import { SocialShareSection } from "@/features/quiz/components/SocialShareSection";
import { EthicsNoticeCard } from "@/features/quiz/components/EthicsNoticeCard";
import { Icon } from "@/features/quiz/components/Icon";
import { afranR14ResultContent } from "@/features/quiz/results/afranR14Results";
import { getLevelLabel } from "@/features/quiz/results/levelLabels";
import type { LevelKey } from "@/features/quiz/types";

interface ResultPageProps {
  score: number;
  level: LevelKey;
  firstName: string | null;
  onRetake: () => void;
  isPreviewMode?: boolean;
  attemptData?: {
    quiz_id: string;
    score_band_id: number | null;
    dimension_scores: Record<string, number>;
  } | null;
  attemptId?: string | null;
}

export function ResultPage({ score, level, firstName, onRetake, isPreviewMode = false, attemptData, attemptId }: ResultPageProps) {
  const content = afranR14ResultContent[level];
  
  // Level-specific icons
  const levelIcons: Record<LevelKey, string> = {
    low: "level-low",
    medium: "level-medium",
    high: "level-high",
  };

  return (
    <div className="min-h-screen px-4 py-6" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-none sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto space-y-4 sm:space-y-6">
        {/* Feature3 wiring test badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-foreground/60 text-[10px] sm:text-xs font-normal">
            Feature3 wiring test: OK
          </div>
        </div>

        {/* DEV-ONLY: Preview Mode Badge */}
        {isPreviewMode && (
          <div className="flex justify-center">
            <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm text-primary text-xs font-medium">
              حالت پیش‌نمایش طراحی
            </div>
          </div>
        )}

        {/* Result Header */}
        <ResultHeader firstName={firstName} score={score} level={level} />

        {/* Title Section - Contrasting Color */}
        <div className="bg-primary/15 backdrop-blur-2xl border border-primary/30 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6 text-right">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <Icon name={levelIcons[level]} className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white/90 shrink-0" title={content.title} />
            <h2 className="text-base sm:text-lg md:text-xl text-foreground font-medium">{content.title}</h2>
          </div>
          <h3 className="text-sm sm:text-base md:text-lg text-foreground/90 font-normal pr-8 sm:pr-10 leading-7 sm:leading-8">{content.headline}</h3>
        </div>

        {/* Main Result Body Card */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6 text-right">
          {/* Explanation Blocks */}
          <ResultBlocks blocks={content.blocks} />
        </div>

        {/* Recommendation Section - Distinct Warm Accent Card */}
        <RecommendationSection
          title={content.recommendation.title}
          paragraphs={content.recommendation.paragraphs}
          ctas={content.recommendation.ctas}
          level={level}
          firstName={firstName}
          levelLabel={getLevelLabel(level)}
          score={score}
        />

        {/* Social Share Section */}
        <SocialShareSection
          level={level}
          firstName={firstName}
          score={score}
          levelLabel={getLevelLabel(level)}
          attemptData={attemptData}
          attemptId={attemptId}
        />

        {/* Ethics Notice Card */}
        <EthicsNoticeCard />

        {/* Retake Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onRetake}
            className="w-full sm:w-auto px-5 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 text-sm sm:text-base md:text-lg rounded-2xl min-h-[48px] bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            انجام مجدد آزمون
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-white/5 border border-white/10 text-center backdrop-blur-sm">
          <p className="text-xs sm:text-sm text-muted-foreground/80 leading-7">
            این آزمون یک ابزار آموزشی است و جایگزین مشاوره یا تشخیص حرفه‌ای نیست. برای ارزیابی دقیق‌تر، با یک متخصص سلامت روان مشورت کنید.
          </p>
        </div>
      </div>
    </div>
  );
}
