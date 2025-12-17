import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Icon } from "./Icon";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { createCompareInvite } from "@/features/compare/createCompareInvite";
import { copyText } from "@/features/share/shareClient";
import type { MindProfileTemplate } from "@/features/mindProfile/getMindProfileTemplate";
import type { DimensionKey } from "@/domain/quiz/types";

interface MindProfileCardProps {
  template: MindProfileTemplate;
  dimensionScores?: Record<string, number>;
  attemptId?: string | null;
}

// Dimension labels in Persian
const DIMENSION_LABELS: Record<DimensionKey, string> = {
  stickiness: "چسبندگی فکری",
  pastBrooding: "گذشته‌محوری و خودسرزنشی",
  futureWorry: "آینده‌نگری و نگرانی",
  interpersonal: "حساسیت بین‌فردی و سناریوسازی",
};

export function MindProfileCard({ template, dimensionScores, attemptId }: MindProfileCardProps) {
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(
    new Set(Object.keys(template.dimension_texts))
  );

  const toggleDimension = (dimensionKey: string) => {
    setExpandedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(dimensionKey)) {
        next.delete(dimensionKey);
      } else {
        next.add(dimensionKey);
      }
      return next;
    });
  };

  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  const handleShare = () => {
    console.log("[MindProfileCard] Share button clicked");
  };

  const handleCompare = async () => {
    if (!attemptId) {
      toast.error("شناسه آزمون یافت نشد");
      return;
    }

    setIsCreatingInvite(true);
    try {
      const result = await createCompareInvite(attemptId, 60);
      const inviteUrl = `${window.location.origin}/compare/invite/${result.invite_token}`;
      
      const copied = await copyText(inviteUrl);
      if (copied) {
        toast.success("لینک مقایسه کپی شد");
      } else {
        toast.error("خطا در کپی لینک");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "خطا در ایجاد لینک مقایسه";
      if (import.meta.env.DEV) {
        console.error("[MindProfileCard] Error creating compare invite:", error);
      }
      toast.error(errorMsg);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6 text-right">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <Icon 
          name="thoughts" 
          className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80 shrink-0" 
          title="الگوی ذهنی من"
        />
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
          الگوی ذهنی من
        </h2>
      </div>

      {/* Intro Section */}
      {template.intro && (
        <div className="mb-5 pb-4 border-b border-white/10">
          <p className="text-sm sm:text-base text-foreground/90 leading-7">
            {template.intro}
          </p>
        </div>
      )}

      {/* Dimensions Section */}
      {Object.keys(template.dimension_texts).length > 0 && (
        <div className="mb-6 space-y-3">
          {Object.entries(template.dimension_texts).map(([dimensionKey, text]) => {
            const label = DIMENSION_LABELS[dimensionKey as DimensionKey] || dimensionKey;
            const score = dimensionScores?.[dimensionKey];
            const isExpanded = expandedDimensions.has(dimensionKey);

            return (
              <div
                key={dimensionKey}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
              >
                {/* Dimension Header - Clickable */}
                <button
                  onClick={() => toggleDimension(dimensionKey)}
                  className="w-full flex items-center justify-between gap-3 p-3 sm:p-4 text-right hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    <Icon 
                      name="thoughts" 
                      className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 shrink-0" 
                      title={label}
                    />
                    <h3 className="text-sm sm:text-base font-medium text-foreground">
                      {label}
                    </h3>
                    {score !== undefined && score !== null && (
                      <span className="text-xs text-foreground/60 bg-white/10 px-2 py-1 rounded">
                        {score.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-foreground/60 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-foreground/60 shrink-0" />
                  )}
                </button>

                {/* Dimension Content - Collapsible */}
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
                    <p className="text-xs sm:text-sm text-foreground/85 leading-7">
                      {text}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tips Section */}
      {template.tips && template.tips.length > 0 && (
        <div className="mb-6 pt-4 border-t border-white/10">
          <h4 className="text-sm sm:text-base font-medium text-foreground mb-3">
            نکات و پیشنهادها
          </h4>
          <ul className="space-y-2 text-right">
            {template.tips.map((tip, index) => (
              <li key={index} className="text-xs sm:text-sm text-foreground/85 leading-7 flex items-start gap-2">
                <span className="text-primary/80 shrink-0 mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer - Action Buttons */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <Button
          onClick={handleShare}
          className="w-full rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40 text-sm sm:text-base font-medium"
        >
          ارسال الگوی ذهنی من
        </Button>
        <Button
          onClick={handleCompare}
          disabled={isCreatingInvite || !attemptId}
          variant="outline"
          className="w-full rounded-xl min-h-[44px] bg-white/10 border-white/20 hover:bg-white/15 text-sm sm:text-base font-medium disabled:opacity-50"
        >
          {isCreatingInvite ? "در حال ایجاد..." : "ارسال لینک مقایسه"}
        </Button>
      </div>
    </div>
  );
}

