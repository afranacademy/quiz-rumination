import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Icon } from "./Icon";
import { supabase } from "@/lib/supabaseClient";
import { MENTAL_PATTERN_COPY } from "@/features/result/mentalPatternCopy";
import type { LikertValue } from "../types";
import { quizDefinition } from "@/features/quiz/data/afranR14";
import { AppModal } from "@/components/AppModal";
import { Share2, Download, RefreshCw } from "lucide-react";
import { shareOrCopyText } from "@/features/share/shareClient";
import { buildMindPatternShareText } from "@/features/mindPattern/buildMindPatternShareText";
import { buildMindPatternItems } from "@/features/mindPattern/buildMindPattern";
import {
  generatePdfBlobFromElement,
  downloadPdf,
  sharePdf,
  generateResultPdfFilename,
} from "@/utils/pdfExport";
import { toast } from "sonner";

interface MindPatternCardProps {
  attemptId?: string | null;
  firstName?: string | null;
}

export function MindPatternCard({ attemptId, firstName }: MindPatternCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<LikertValue[] | null>(null);

  useEffect(() => {
    const loadNarratives = async () => {
      try {
        setLoading(true);
        setError(null);
        let answers: LikertValue[] | null = null;

        // Try to fetch from database first (if attemptId is available)
        if (attemptId) {
          try {
            const { data: attempt, error: fetchError } = await supabase
              .from("attempts")
              .select("answers, answers_raw")
              .eq("id", attemptId)
              .maybeSingle();

            if (fetchError) {
              if (import.meta.env.DEV) {
                console.warn("[MindPatternCard] Error fetching answers from DB:", fetchError);
              }
            } else if (attempt) {
              const answersArray = (attempt.answers || attempt.answers_raw) as (number | null)[];
              
              if (import.meta.env.DEV) {
                console.log("[MindPatternCard] 🔍 Fetched from DB:", {
                  hasAnswers: !!attempt.answers,
                  hasAnswersRaw: !!attempt.answers_raw,
                  usingField: attempt.answers ? "answers" : "answers_raw",
                  answersArray,
                });
              }
              
              if (Array.isArray(answersArray) && answersArray.length === 12) {
                const validAnswers = answersArray.map((a) => {
                  if (a === null || a === undefined || a < 0 || a > 4) {
                    return null;
                  }
                  return a as LikertValue;
                });
                if (validAnswers.every((a) => a !== null)) {
                  answers = validAnswers as LikertValue[];
                }
              }
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn("[MindPatternCard] Error in DB fetch:", error);
            }
          }
        }

        // Fallback to sessionStorage if DB fetch failed or no attemptId
        if (!answers) {
          const answersData = sessionStorage.getItem("quiz_answers_v1");
          if (answersData) {
            try {
              const parsed = JSON.parse(answersData) as LikertValue[];
              if (Array.isArray(parsed) && parsed.length === 12) {
                answers = parsed;
              }
            } catch (parseError) {
              if (import.meta.env.DEV) {
                console.warn("[MindPatternCard] Error parsing sessionStorage answers:", parseError);
              }
            }
          }
        }

        if (!answers) {
          setError("اطلاعات کافی برای ساخت الگوی ذهنی موجود نیست.");
          setNarratives(null);
          setLoading(false);
          return;
        }

        // Store answers for share/PDF functionality
        setAnswers(answers);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[MindPatternCard] Failed to build mind pattern:", error);
        }
        setError("اطلاعات کافی برای ساخت الگوی ذهنی موجود نیست.");
      } finally {
        setLoading(false);
      }
    };

    loadNarratives();
  }, [attemptId]);

  // DEV: Check for duplicate rendering (must be before early returns to follow Rules of Hooks)
  useEffect(() => {
    if (import.meta.env.DEV && answers) {
      const cardTitles = Array.from(document.querySelectorAll('h2, h3, [class*="CardTitle"]'))
        .map(el => el.textContent?.trim())
        .filter(text => text?.includes('الگوی ذهنی من'));
      
      if (cardTitles.length > 1) {
        console.warn('[MindPatternCard] ⚠️ DUPLICATE DETECTED: Found', cardTitles.length, 'instances of "الگوی ذهنی من" in DOM');
      }
    }
  }, [answers]);

  if (loading) {
    return (
      <Card className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-foreground/80">در حال بارگذاری الگوی ذهنی...</p>
        </CardContent>
      </Card>
    );
  }

  // Share and PDF handlers
  const handleShare = async () => {
    if (!answers) {
      toast.error("اطلاعات کافی برای اشتراک‌گذاری موجود نیست");
      return;
    }

    setIsSharing(true);
    try {
      const items = buildMindPatternItems(answers);
      const quizUrl = typeof window !== "undefined" ? window.location.origin : "";
      const shareText = buildMindPatternShareText(items, quizUrl);

      const result = await shareOrCopyText({
        title: "الگوی ذهنی من",
        text: shareText,
        url: quizUrl,
      });

      if (result.ok) {
        if (result.method === "share") {
          toast.success("ارسال شد");
        } else {
          toast.success("متن کپی شد");
        }
      } else if (result.error !== "canceled") {
        toast.error("خطا در اشتراک‌گذاری");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[MindPatternCard] Error sharing:", error);
      }
      toast.error("خطا در اشتراک‌گذاری");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById("mental-pattern-pdf-root");
    if (!el) {
      toast.error("خطا در تولید PDF: محتوا یافت نشد");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const filename = generateResultPdfFilename();
      const blob = await generatePdfBlobFromElement(el, {
        fileBaseName: filename.replace(".pdf", ""),
        mode: "pattern",
        title: "الگوی ذهنی من",
      });

      downloadPdf(blob, filename);
      toast.success("PDF دانلود شد");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[MindPatternCard] Error generating PDF:", error);
        console.error("[MindPatternCard] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`خطا در تولید PDF: ${errorMessage}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    const el = document.getElementById("mental-pattern-pdf-root");
    if (!el || !answers) {
      toast.error("خطا در تولید PDF: محتوا یافت نشد");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const items = buildMindPatternItems(answers);
      const quizUrl = typeof window !== "undefined" ? window.location.origin : "";
      const shareText = buildMindPatternShareText(items, quizUrl);
      const filename = generateResultPdfFilename();

      const blob = await generatePdfBlobFromElement(el, {
        fileBaseName: filename.replace(".pdf", ""),
        mode: "pattern",
        title: "الگوی ذهنی من",
      });

      const result = await sharePdf(blob, filename, {
        title: "الگوی ذهنی من",
        text: shareText,
      });

      if (result.method === "share" && result.success) {
        toast.success("PDF به اشتراک گذاشته شد");
      } else if (result.method === "download") {
        toast.info("مرورگر شما اشتراک‌گذاری مستقیم PDF را پشتیبانی نمی‌کند؛ فایل دانلود شد.");
      } else {
        toast.error("خطا در اشتراک‌گذاری PDF");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[MindPatternCard] Error sharing PDF:", error);
        console.error("[MindPatternCard] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`خطا در تولید PDF: ${errorMessage}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (error || !answers) {
    return null; // Don't show card if no data
  }

  return (
    <>
      {/* Summary Card - Simple, no inline content */}
      <Card className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl">
        <CardHeader className="text-right pb-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <Icon name="thoughts" className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80 shrink-0" />
            <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground">
              الگوی ذهنی من
            </CardTitle>
          </div>
          <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
            این توضیحات دقیقاً بر اساس پاسخ‌های تو ساخته شده‌اند
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="w-full rounded-xl min-h-[48px] bg-primary/80 hover:bg-primary border-primary/40 text-base font-medium"
          >
            مشاهده کامل
          </Button>
        </CardContent>
      </Card>

      {/* Modal with Full Content - Only rendered when open */}
      {isModalOpen && (
        <AppModal
          isOpen={isModalOpen}
          title="الگوی ذهنی من"
          description="این توضیحات دقیقاً بر اساس پاسخ‌های تو ساخته شده‌اند"
          onClose={() => setIsModalOpen(false)}
        >
          <MindPatternModalContent
            answers={answers}
            firstName={firstName}
            modalContentRef={modalContentRef}
            isGeneratingPdf={isGeneratingPdf}
            isSharing={isSharing}
            onShare={handleShare}
            onDownloadPdf={handleDownloadPdf}
            onSharePdf={handleSharePdf}
          />
        </AppModal>
      )}
    </>
  );
}

// Separate component for modal content to ensure it's not rendered inline
function MindPatternModalContent({
  answers,
  firstName,
  modalContentRef,
  isGeneratingPdf,
  isSharing,
  onShare,
  onDownloadPdf,
  onSharePdf,
}: {
  answers: LikertValue[] | null;
  firstName: string | null;
  modalContentRef: React.RefObject<HTMLDivElement>;
  isGeneratingPdf: boolean;
  isSharing: boolean;
  onShare: () => void;
  onDownloadPdf: () => void;
  onSharePdf: () => void;
}) {
  // Generate items from answers using MENTAL_PATTERN_COPY
  const items = Array.from({ length: 12 }, (_, i) => {
    const score = Number(answers?.[i] ?? 0);
    const safeScore = Number.isFinite(score) ? Math.min(4, Math.max(0, score)) : 0;
    const text = MENTAL_PATTERN_COPY[i]?.[safeScore] ?? "";
    const question = quizDefinition.items.find((item) => item.id === i + 1);
    const optionLabel = quizDefinition.scale.labels[safeScore] || "";
    return { 
      index: i + 1, 
      text, 
      questionText: question?.text || "",
      optionLabel,
      score: safeScore,
    };
  });

  return (
    <div ref={modalContentRef} id="mental-pattern-pdf-root" data-pdf-root="pattern" className="space-y-4 sm:space-y-5">
      {/* 12 Personalized Sentences - One per question */}
      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        {items.map((item) => {
          // Extract short title from question text (first few words)
          const questionTitle = item.questionText
            ? item.questionText.split("،")[0].split(".")[0].trim()
            : `سؤال ${item.index}`;

          return (
            <div
              key={item.index}
              className="text-right pb-4 border-b border-white/10 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-semibold shrink-0 mt-0.5">
                  {item.index}
                </span>
                <div className="flex-1">
                  <h4 className="text-xs sm:text-sm text-foreground/70 font-medium">
                    {questionTitle}
                  </h4>
                  {item.optionLabel && (
                    <p className="text-xs text-foreground/60 mt-1">
                      انتخاب شما: <span className="font-medium">{item.optionLabel}</span>
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs sm:text-sm text-foreground/85 leading-7 pr-8">
                {item.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Closing Note */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-xs text-foreground/70 text-center leading-6">
          این الگوها به معنی مشکل یا تشخیص نیستند؛ فقط توصیفی از نحوه‌ی کار ذهن در مواجهه با فکرهای تکراری‌اند.
        </p>
      </div>

      {/* Invite Link Section */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-xs text-foreground/60 text-center leading-6 mb-2">
          اگر دوست داری الگوی ذهنی خودت رو دقیق‌تر بشناسی،
          <br />
          می‌تونی این آزمون سنجش نشخوار فکری رو تکمیل کنی:
        </p>
        <a
          href="https://zaya.io/testruminationnewtest"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline text-center block break-all"
        >
          https://zaya.io/testruminationnewtest
        </a>
      </div>

      {/* Share & PDF Actions */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            variant="outline"
            className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
            data-pdf-ignore="true"
          >
            {isGeneratingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                در حال تولید...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 ml-2" />
                دانلود PDF
              </>
            )}
          </Button>
          <Button
            onClick={onSharePdf}
            disabled={isGeneratingPdf}
            className="flex-1 rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40"
            data-pdf-ignore="true"
          >
            {isGeneratingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                در حال تولید...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 ml-2" />
                اشتراک‌گذاری PDF
              </>
            )}
          </Button>
        </div>
        <Button
          onClick={onShare}
          disabled={isSharing}
          variant="outline"
          className="w-full rounded-xl min-h-[44px] bg-white/5 border-white/10 text-sm"
          data-pdf-ignore="true"
        >
          {isSharing ? (
            <>
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
              در حال ارسال...
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 ml-2" />
              اشتراک‌گذاری متنی
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

