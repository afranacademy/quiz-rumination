import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { Icon } from "./Icon";
import type { LevelKey } from "../types";
import { LINKS } from "@/config/links";
import { trackCardEvent, CARD_TYPES, EVENT_TYPES } from "@/lib/trackCardEvent";

interface RecommendationSectionProps {
  title: string;
  paragraphs: string[];
  ctas: { label: string; kind: "primary" | "secondary" }[];
  level: LevelKey;
  firstName: string | null;
  levelLabel: string;
  score: number;
  attemptId?: string | null;
}

const reassuranceText: Record<LevelKey, string> = {
  low: "برای حفظ همین شفافیت ذهنی و جلوگیری از برگشتِ ذهن به چرخه‌ی نشخوار.",
  medium: "برای کاهش خستگی ذهنی و رسیدن به وضوح و آرامش.",
  high: "برای خروج تدریجی از چرخه‌ی نشخوار و بازسازی آرامش ذهن.",
};

export function RecommendationSection({ title: _title, paragraphs, ctas, level, firstName, levelLabel, score, attemptId }: RecommendationSectionProps) {

  return (
    <div className="relative my-8 text-right">
      {/* Warm glow behind */}
      <div className="absolute inset-0 -z-10 rounded-[28px] bg-emerald-500/30 blur-3xl opacity-60" />
      
      {/* Distinct Warm Accent Card */}
      <div className="relative rounded-[28px] border border-emerald-300/40 bg-gradient-to-br from-emerald-500/25 via-teal-500/20 to-slate-900/30 backdrop-blur-2xl shadow-[0_25px_80px_rgba(16,185,129,0.35)] overflow-hidden transition-all hover:brightness-110 hover:-translate-y-0.5">
        {/* Radial highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
        
        {/* Subtle inner gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-400/15 via-transparent to-slate-900/20 pointer-events-none" />
        
        <div className="relative px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 lg:py-7">
          {/* Header - Large & Important */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <Icon name="recommendation" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white shrink-0" />
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold text-white drop-shadow-lg">
                پیشنهاد اختصاصی آکادمی افران
              </h2>
            </div>
            <span className="inline-flex items-center rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold bg-amber-400 text-slate-900 shadow-lg">
              بر اساس نتیجه‌ی شما
            </span>
          </div>

          {/* Personalization Block - Highlighted Zone */}
          <div className="mt-3 sm:mt-4 rounded-xl bg-black/35 border border-white/25 p-3 sm:p-4 space-y-2">
            <p className="text-sm sm:text-base md:text-lg font-bold text-white leading-7">
              <span className="font-extrabold">{firstName ? `${firstName}، ` : ''}</span>
              با توجه به اینکه سطح شما <span className="font-extrabold">«{levelLabel}»</span> شده، این پیشنهاد اختصاصی برای شماست.
            </p>
            <p className="text-xs sm:text-sm font-semibold text-white/95">
              امتیاز شما: <span className="font-extrabold text-white">{score}</span> از 48
            </p>
          </div>

          {/* Main recommendation text - Bright & Clear */}
          <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-sm sm:text-base text-white leading-7 sm:leading-8 font-medium">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/25 my-4 sm:my-5" />

          {/* CTA Decision Zone */}
          <div className="rounded-2xl bg-black/40 p-3 sm:p-4 space-y-3">
            {ctas
              .filter((cta) => cta.kind === "primary")
              .map((cta, index) => {
                // Determine which link to use based on CTA label
                const isEpisodeZero = cta.label.includes("اپیزود صفر");
                const link = isEpisodeZero ? LINKS.EPISODE_ZERO : LINKS.MIND_CHATTER_COURSE;
                
                return (
                  <Button
                    key={index}
                    size="lg"
                    variant="default"
                    className={cn(
                      "w-full rounded-2xl font-bold transition-all min-h-[48px] h-[52px] sm:h-[52px] bg-teal-600 hover:bg-white backdrop-blur-sm shadow-[0_0_0_2px_rgba(255,255,255,0.2),0_15px_40px_rgba(13,148,136,0.3)] border-2 border-teal-400/40 text-white hover:text-teal-700 hover:border-teal-600/60 text-sm sm:text-base"
                    )}
                    onClick={() => {
                      // Track CTA click
                      trackCardEvent({
                        cardType: CARD_TYPES.CTA_MIND_VARAJ_COURSE,
                        eventType: EVENT_TYPES.CLICK,
                        attemptId: attemptId || null,
                      });
                      window.open(link, "_blank");
                    }}
                  >
                    {cta.label}
                  </Button>
                );
              })}
            
            {/* Reassurance line */}
            <p className="mt-3 text-xs leading-6 text-white/80 text-center font-medium">
              {reassuranceText[level]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
