import { RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { ResultHeader } from "@/features/quiz/components/ResultHeader";
import { RecommendationSection } from "@/features/quiz/components/RecommendationCard";
import { SocialShareSection } from "@/features/quiz/components/SocialShareSection";
import { EthicsNoticeCard } from "@/features/quiz/components/EthicsNoticeCard";
import { ResultLevelHeaderSection } from "@/features/quiz/components/ResultLevelHeaderSection";
import { ResultExplanationSection } from "@/features/quiz/components/ResultExplanationSection";
import { afranR14ResultContent } from "@/features/quiz/results/afranR14Results";
import { getLevelLabel } from "@/features/quiz/results/levelLabels";
import type { LevelKey } from "@/features/quiz/types";
import { useEffect } from "react";

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

  // DEV: Check for duplicate card rendering
  useEffect(() => {
    if (import.meta.env.DEV) {
      const checkDuplicates = () => {
        const compareTitles = Array.from(document.querySelectorAll('h2, h3'))
          .map(el => el.textContent?.trim())
          .filter(text => text?.includes('ذهن ما کنار هم'));
        
        const patternTitles = Array.from(document.querySelectorAll('h2, h3, [class*="CardTitle"]'))
          .map(el => el.textContent?.trim())
          .filter(text => text?.includes('الگوی ذهنی من'));

        if (compareTitles.length > 1) {
          console.warn('[ResultPage] ⚠️ DUPLICATE DETECTED: Found', compareTitles.length, 'instances of "ذهن ما کنار هم" in DOM');
        }
        if (patternTitles.length > 1) {
          console.warn('[ResultPage] ⚠️ DUPLICATE DETECTED: Found', patternTitles.length, 'instances of "الگوی ذهنی من" in DOM');
        }
      };
      
      // Check after initial render
      setTimeout(checkDuplicates, 100);
    }
  }, []);

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

        {/* Section A: Level Header Section - Standalone header block */}
        <ResultLevelHeaderSection 
          level={level}
          title={content.title}
          headline={content.headline}
        />

        {/* Section B: Explanation Section - Detailed explanation blocks */}
        <ResultExplanationSection blocks={content.blocks} />

        {/* Recommendation Section - Distinct Warm Accent Card */}
        <RecommendationSection
          title={content.recommendation.title}
          paragraphs={content.recommendation.paragraphs}
          ctas={content.recommendation.ctas}
          level={level}
          firstName={firstName}
          levelLabel={getLevelLabel(level)}
          score={score}
          attemptId={attemptId}
        />

        {/* Social Share Section */}
        <SocialShareSection
          level={level}
          firstName={firstName}
          score={score}
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
