/// <reference types="vite/client" />
import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { AppModal } from "@/components/AppModal";
import { SocialFeatureCard } from "./SocialFeatureCard";
import { Share2, Check, Copy } from "lucide-react";
import { shareOrCopyText, copyText } from "@/features/share/shareClient";
import { buildSummaryPdfBlob } from "@/features/share/buildSummaryPdf";
import { buildMindPatternItems } from "@/features/mindPattern/buildMindPattern";
import { buildMindPatternShareText } from "@/features/mindPattern/buildMindPatternShareText";
import { buildMindPatternPdfBlob } from "@/features/mindPattern/buildMindPatternPdf";
import { pickSummaryRange } from "@/features/share/summaryRanges";
import { Icon } from "./Icon";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { createCompareInvite } from "@/features/compare/createCompareInvite";
import { getLatestCompletedAttempt } from "@/features/compare/getLatestCompletedAttempt";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import type { LevelKey, LikertValue } from "../types";
import { getMindProfileTemplate, type MindProfileTemplate } from "@/features/mindProfile/getMindProfileTemplate";
import type { DimensionKey } from "@/domain/quiz/types";

interface SocialShareSectionProps {
  level: LevelKey;
  firstName: string | null;
  score: number;
  levelLabel: "کم" | "متوسط" | "زیاد";
  attemptData?: {
    quiz_id: string;
    score_band_id: number | null;
    dimension_scores: Record<string, number>;
  } | null;
}

export function SocialShareSection({
  firstName,
  score,
  attemptData,
}: SocialShareSectionProps) {
  const { userId, loading: authLoading } = useAnonAuth();
  const [modalState, setModalState] = useState<{
    type: "summary" | "guide" | "invite" | null;
  }>({ type: null });
  const [shareStatus, setShareStatus] = useState<{
    type: "share" | "copy" | null;
    message: string | null;
  }>({ type: null, message: null });
  const [mindPatternData, setMindPatternData] = useState<{
    items: Array<{
      title: string;
      description: string;
    }>;
    shareText: string;
  } | null>(null);
  const [mindPatternError, setMindPatternError] = useState<string | null>(null);
  const [mindProfileTemplate, setMindProfileTemplate] = useState<MindProfileTemplate | null>(null);
  const [mindProfileLoading, setMindProfileLoading] = useState(false);
  const [mindProfileError, setMindProfileError] = useState<string | null>(null);
  const [isCreatingCompareInvite, setIsCreatingCompareInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const quizTitle = "آزمون سنجش نشخوار فکری (ذهن وراج)";
  const maxScore = 48;
  const currentUrl = typeof window !== "undefined" ? window.location.href : undefined;
  const quizUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Get summary range based on score
  const summaryRange = pickSummaryRange(score);
  
  // Build summary text for sharing (range text + score + optional URL)
  const summaryTextForShare = (() => {
    const lines = [
      summaryRange.text,
      "",
      `امتیاز: ${score} از ${maxScore}`,
    ];
    if (currentUrl) {
      lines.push("", currentUrl);
    }
    return lines.join("\n");
  })();

  // Dimension labels in Persian
  const DIMENSION_LABELS: Record<DimensionKey, string> = {
    stickiness: "چسبندگی فکری",
    pastBrooding: "گذشته‌محوری و خودسرزنشی",
    futureWorry: "آینده‌نگری و نگرانی",
    interpersonal: "حساسیت بین‌فردی و سناریوسازی",
  };

  // Load mind profile template from database
  useEffect(() => {
    if (!attemptData || !attemptData.quiz_id) {
      // Fallback to old method if no attempt data
    try {
      const answersData = sessionStorage.getItem("quiz_answers_v1");
      if (answersData) {
        const answersArray = JSON.parse(answersData) as LikertValue[];
        if (answersArray && answersArray.length === 12) {
          const items = buildMindPatternItems(answersArray);
          const shareText = buildMindPatternShareText(items, quizUrl);
            setMindPatternData({ items, shareText });
          setMindPatternError(null);
        } else {
          setMindPatternError("اطلاعات کافی برای ساخت الگوی ذهنی موجود نیست.");
        }
      } else {
        setMindPatternError("اطلاعات کافی برای ساخت الگوی ذهنی موجود نیست.");
      }
    } catch (error) {
      console.error("Failed to build mind pattern:", error);
      setMindPatternError("اطلاعات کافی برای ساخت الگوی ذهنی موجود نیست.");
    }
      return;
    }

    const fetchTemplate = async () => {
      setMindProfileLoading(true);
      setMindProfileError(null);
      try {
        const template = await getMindProfileTemplate({
          quizId: attemptData.quiz_id,
          bandId: attemptData.score_band_id,
          locale: "fa",
        });
        setMindProfileTemplate(template);
        setMindProfileLoading(false);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "خطا در بارگذاری الگوی ذهنی";
        setMindProfileError(errorMsg);
        setMindProfileLoading(false);
        if (import.meta.env.DEV) {
          console.error("[SocialShareSection] Failed to fetch mind profile template:", error);
        }
      }
    };

    fetchTemplate();
  }, [attemptData, quizUrl]);

  const handleShare = async () => {
    const result = await shareOrCopyText({
      title: quizTitle,
      text: summaryTextForShare,
      url: currentUrl,
    });

    if (result.ok) {
      if (result.method === "share") {
        setShareStatus({ type: "share", message: "ارسال شد" });
        // Close modal after short delay if share succeeded
        setTimeout(() => {
          setModalState({ type: null });
          setShareStatus({ type: null, message: null });
        }, 1500);
      } else {
        setShareStatus({
          type: "copy",
          message: "امکان اشتراک‌گذاری مستقیم در این دستگاه نبود؛ متن کپی شد.",
        });
      }
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 3000);
    } else if (result.error === "canceled") {
      // User canceled - don't show error, just keep modal open
      setShareStatus({ type: null, message: null });
    } else {
      setShareStatus({
        type: "copy",
        message: "خطا در اشتراک‌گذاری. لطفاً از دکمه کپی استفاده کنید.",
      });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 3000);
    }
  };

  const handleCopy = async () => {
    const success = await copyText(summaryTextForShare);
    if (success) {
      setShareStatus({ type: "copy", message: "کپی شد" });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 2000);
    }
  };

  const handleSummaryPdf = async () => {
    try {
      // First, copy the text for personal use
      const copySuccess = await copyText(summaryTextForShare);
      if (copySuccess) {
        setShareStatus({ type: "copy", message: "متن کپی شد" });
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 2000);
      }

      // Generate PDF HTML
      const blob = await buildSummaryPdfBlob({
        firstName: firstName || undefined,
        badgeLabel: summaryRange.badgeLabel,
        text: summaryRange.text,
        score,
        maxScore,
      });

      // Create a blob URL and open in new window
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank");
      
      if (!newWindow) {
        // Popup blocked - fallback to download
        const a = document.createElement("a");
        a.href = url;
        a.download = `خلاصه-نتیجه-${firstName || "من"}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setShareStatus({
          type: null,
          message: "فایل دانلود شد. برای تبدیل به PDF، فایل رو باز کن و از منوی چاپ استفاده کن.",
        });
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 4000);
      } else {
        // Window opened successfully - user can print to PDF
        setShareStatus({
          type: null,
          message: "صفحه باز شد. از منوی چاپ مرورگر برای ذخیره به PDF استفاده کن.",
        });
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 4000);
      }

      // Clean up URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      setShareStatus({
        type: null,
        message: "خطا در ایجاد PDF. لطفاً دوباره تلاش کنید.",
      });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 3000);
    }
  };

  const handleMindPatternShare = async () => {
    if (!mindPatternData) return;

    try {
      // Try Web Share API first
      if (navigator.share) {
        try {
          await navigator.share({
            text: mindPatternData.shareText,
          });
          setShareStatus({ type: "share", message: "ارسال شد" });
          setTimeout(() => {
            setModalState({ type: null });
            setShareStatus({ type: null, message: null });
          }, 1500);
          return;
        } catch (error: any) {
          if (error.name === "AbortError") {
            // User canceled
            setShareStatus({ type: null, message: null });
            return;
          }
          // Share failed, fall through to copy
        }
      }

      // Fallback to copy
      const success = await copyText(mindPatternData.shareText);
      if (success) {
        setShareStatus({ type: "copy", message: "کپی شد" });
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to share:", error);
      setShareStatus({
        type: null,
        message: "خطا در اشتراک‌گذاری. لطفاً دوباره تلاش کنید.",
      });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 3000);
    }
  };

  const handleMindPatternCopy = async () => {
    if (!mindPatternData) return;
    const success = await copyText(mindPatternData.shareText);
    if (success) {
      setShareStatus({ type: "copy", message: "کپی شد" });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 2000);
    }
  };

  const handleCreateCompareInvite = async () => {
    setIsCreatingCompareInvite(true);
    try {
      // Get attempt ID from localStorage
      const attemptAId = localStorage.getItem("afran_attempt_id");
      
      if (!attemptAId) {
        const errorMsg = "اطلاعات آزمون یافت نشد. لطفاً دوباره آزمون رو انجام بدید.";
        toast.error(errorMsg);
        setIsCreatingCompareInvite(false);
        return;
      }

      const result = await createCompareInvite(attemptAId, 60);
      
      // Copy URL to clipboard
      await navigator.clipboard.writeText(result.url);
      
      // Show success UI
      toast.success("لینک مقایسه کپی شد");
      setShareStatus({ type: "copy", message: "لینک مقایسه کپی شد" });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 2000);

      // Dev logging
      if (import.meta.env.DEV) {
        console.log("[SocialShareSection] Compare invite created:", {
          invite_token: result.invite_token,
          url: result.url,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "خطا در ایجاد لینک مقایسه";
      if (import.meta.env.DEV) {
        console.error("[SocialShareSection] Error creating compare invite:", error);
      }
      toast.error(errorMsg);
      setShareStatus({ type: null, message: errorMsg });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 3000);
    } finally {
      setIsCreatingCompareInvite(false);
    }
  };

  const handleMindPatternPdf = async () => {
    if (!mindPatternData) return;
    try {
      const blob = await buildMindPatternPdfBlob({
        firstName: firstName || undefined,
        items: mindPatternData.items,
        quizUrl,
      });

      // Create a blob URL and open in new window
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank");
      
      if (!newWindow) {
        // Popup blocked - fallback to download
        const a = document.createElement("a");
        a.href = url;
        a.download = `الگوی-ذهنی-${firstName || "من"}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setShareStatus({
          type: null,
          message: "فایل دانلود شد. برای تبدیل به PDF، فایل رو باز کن و از منوی چاپ استفاده کن.",
        });
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 4000);
      } else {
        // Window opened successfully - user can print to PDF
        setShareStatus({
          type: null,
          message: "صفحه باز شد. از منوی چاپ مرورگر برای ذخیره به PDF استفاده کن.",
        });
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 4000);
      }

      // Clean up URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      setShareStatus({
        type: null,
        message: "خطا در ایجاد PDF. لطفاً دوباره تلاش کنید.",
      });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 3000);
    }
  };


  const handleCreateInvite = async () => {
    if (import.meta.env.DEV) {
      console.log("[SocialShareSection] 🔵 Invite button clicked");
    }

    setInviteLoading(true);
    setInviteUrl(null);
    setShareStatus({ type: null, message: null });

    try {
      // Ensure auth session exists
      if (authLoading) {
        const errorMsg = "در حال احراز هویت... لطفاً صبر کنید.";
        if (import.meta.env.DEV) {
          console.warn("[SocialShareSection] Auth still loading, waiting...");
        }
        setShareStatus({
          type: null,
          message: errorMsg,
        });
        toast.error(errorMsg);
        setInviteLoading(false);
        return;
      }

      if (!userId) {
        const errorMsg = "احراز هویت انجام نشده است. لطفاً صفحه را رفرش کنید.";
        if (import.meta.env.DEV) {
          console.error("[SocialShareSection] ❌ No user ID available");
        }
        setShareStatus({
          type: null,
          message: errorMsg,
        });
        toast.error(errorMsg);
        setInviteLoading(false);
        return;
      }

      if (import.meta.env.DEV) {
        console.log("[SocialShareSection] User ID:", userId);
      }

      // Resolve attempt ID using robust resolver
      const attemptAId = await getLatestCompletedAttempt(userId);

      if (!attemptAId) {
        const errorMsg = "اطلاعات آزمون یافت نشد. لطفاً دوباره آزمون رو انجام بدید.";
        if (import.meta.env.DEV) {
          console.error("[SocialShareSection] ❌ No completed attempt found:", {
            userId,
            attemptSource: "query_fallback",
          });
        }
        setShareStatus({
          type: null,
          message: errorMsg,
        });
        toast.error(errorMsg);
        setModalState({ type: "invite" }); // Show error in modal
        setInviteLoading(false);
        return;
      }

      if (import.meta.env.DEV) {
        console.log("[SocialShareSection] ✅ Attempt A ID resolved:", {
          attemptAId,
          userId,
        });
      }

      // Call Supabase RPC to create compare invite
      const rpcPayload = {
        p_attempt_a_id: attemptAId,
        p_expires_in_minutes: 60,
      };

      if (import.meta.env.DEV) {
        console.log("[SocialShareSection] RPC payload:", rpcPayload);
      }

      const result = await createCompareInvite(attemptAId, 60);

      if (import.meta.env.DEV) {
        console.log("[SocialShareSection] ✅ Invite created:", {
          session_id: result.session_id,
          invite_token: result.invite_token.substring(0, 12) + "...",
          expires_at: result.expires_at,
          url: result.url,
          rpcResponse: result,
        });
      }

      // Set invite URL and show modal
      setInviteUrl(result.url);
      setModalState({ type: "invite" });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "خطا در ایجاد لینک دعوت. لطفاً دوباره تلاش کنید.";
      
      if (import.meta.env.DEV) {
        console.error("[SocialShareSection] ❌ Error creating invite:", error);
        if (error instanceof Error) {
          console.error("[SocialShareSection] Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
        }
        // Show detailed error in dev mode
        const devErrorMsg = `DEV ERROR: ${errorMsg}\n\nCheck console for details.`;
        alert(devErrorMsg);
      }

      // Set error message and show modal with error
      setShareStatus({
        type: null,
        message: errorMsg,
      });
      // Open modal to show error (user can see the error message)
      setModalState({ type: "invite" });
      toast.error(errorMsg);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleInviteShare = async () => {
    if (!inviteUrl) return;

    const result = await shareOrCopyText({
      title: "دعوت به مقایسه‌ی ذهن‌ها",
      text: `یک نفر دوست داشته الگوی ذهنی شما و خودش رو کنار هم ببینه.\n\n${inviteUrl}`,
      url: inviteUrl,
    });

    if (result.ok) {
      if (result.method === "share") {
        setShareStatus({ type: "share", message: "ارسال شد" });
        setTimeout(() => {
          setModalState({ type: null });
          setShareStatus({ type: null, message: null });
        }, 1500);
      } else {
        setShareStatus({
          type: "copy",
          message: "امکان اشتراک‌گذاری مستقیم در این دستگاه نبود؛ لینک کپی شد.",
        });
      }
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 3000);
    } else if (result.error === "canceled") {
      setShareStatus({ type: null, message: null });
    }
  };

  const handleInviteCopy = async () => {
    if (!inviteUrl) return;

    try {
      // Try navigator.clipboard first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        setShareStatus({ type: "copy", message: "کپی شد" });
        toast.success("لینک کپی شد");
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 2000);
        return;
      }

      // Fallback to copyText helper
      const success = await copyText(inviteUrl);
      if (success) {
        setShareStatus({ type: "copy", message: "کپی شد" });
        toast.success("لینک کپی شد");
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 2000);
      } else {
        throw new Error("Failed to copy");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[SocialShareSection] Error copying to clipboard:", error);
      }
      setShareStatus({
        type: null,
        message: "خطا در کپی لینک. لطفاً لینک را دستی کپی کنید.",
      });
      toast.error("خطا در کپی لینک");
    }
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Section Header */}
        <div className="text-center sm:text-right space-y-2">
          <h2 className="text-lg sm:text-xl md:text-2xl text-foreground font-semibold">
            اگر بخوای این نتیجه رو با دیگران به اشتراک بذاری…
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground/80 leading-6 max-w-md mx-auto sm:mx-0">
            این گزینه‌ها برای فهم بهتر در رابطه طراحی شدن، نه قضاوت یا برچسب‌گذاری.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="space-y-4 sm:space-y-5">
          {/* First Row: Feature 1 + Feature 2 (2 columns on tablet+) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Feature 1 - Share Result Summary */}
            <SocialFeatureCard
              title="خلاصه‌ی نتیجه‌ی من"
              description="یک خلاصه‌ی کوتاه و قابل فهم از نتیجه‌ی آزمونت رو به اشتراک بذار. این خلاصه برای درک بهتر طراحی شده، نه قضاوت."
              icon="overview"
              emphasis="normal"
              primaryAction={{
                label: "اشتراک‌گذاری متنی",
                onClick: () => setModalState({ type: "summary" }),
              }}
              secondaryActions={[
                {
                  label: "دانلود PDF خلاصه",
                  onClick: handleSummaryPdf,
                },
              ]}
            />

            {/* Feature 2 - Mind Pattern */}
            <SocialFeatureCard
              title="الگوی ذهنی من"
              description="این یک راهنمای ساده است که می‌تونی برای کسایی که دوست داری بدونن ذهنت درگیر نشخوار فکری، در موقعیت‌های مختلف چطور کار می‌کنه، براشون بفرستی."
              icon="recommendation"
              emphasis="warm"
              primaryAction={{
                label: isCreatingCompareInvite ? "در حال ایجاد..." : "ارسال الگوی ذهنی من",
                onClick: handleCreateCompareInvite,
              }}
              secondaryActions={[
                {
                  label: "مشاهده الگوی ذهنی",
                  onClick: () => setModalState({ type: "guide" }),
                },
              ]}
            />
          </div>

          {/* Second Row: Feature 3 (Full width) */}
          <SocialFeatureCard
            title="ذهن ما کنار هم"
            description="یک نفر رو دعوت کن همین آزمون رو انجام بده و الگوهای ذهنی‌تون رو با هم مقایسه کنین. این تجربه می‌تونه به فهم متقابل کمک کنه."
            icon="thoughts"
            emphasis="primary"
            primaryAction={{
              label: inviteLoading ? "در حال ساخت لینک…" : "دعوت یک نفر برای مقایسه‌ی ذهن‌ها",
              onClick: handleCreateInvite,
              disabled: inviteLoading,
            }}
          />
        </div>
      </div>

      {/* Summary Modal - Feature 1 */}
      <AppModal
        isOpen={modalState.type === "summary"}
        title="خلاصه‌ی نتیجه‌ی آزمون"
        onClose={() => {
          setModalState({ type: null });
          setShareStatus({ type: null, message: null });
        }}
      >
        <div className="space-y-4">
          {/* Badge Label */}
          <div className="flex justify-center">
            <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-sm text-primary text-xs sm:text-sm font-medium">
              {summaryRange.badgeLabel}
            </div>
          </div>

          {/* Full Text Content */}
          <div className="p-4 sm:p-5 rounded-2xl bg-black/20 border border-white/15 max-h-[400px] overflow-y-auto">
            <div className="text-foreground text-sm sm:text-base leading-7 whitespace-pre-line text-right">
              {summaryRange.text}
            </div>
          </div>

          {/* Shareable Text (hidden, for copy/share) */}
          <textarea
            readOnly
            value={summaryTextForShare}
            className="sr-only"
            aria-hidden="true"
          />
          
          {shareStatus.message && (
            <div
              className={`p-3 rounded-xl text-sm text-center ${
                shareStatus.type === "copy" && shareStatus.message.includes("کپی شد")
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-white/10 text-foreground/90 border border-white/15"
              }`}
            >
              {shareStatus.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleShare}
              className="flex-1 rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40"
            >
              {shareStatus.type === "share" && shareStatus.message === "ارسال شد" ? (
                <>
                  <Check className="w-4 h-4 ml-2" />
                  ارسال شد
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 ml-2" />
                  اشتراک‌گذاری
                </>
              )}
            </Button>
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
            >
              {shareStatus.type === "copy" && shareStatus.message === "کپی شد" ? (
                <>
                  <Check className="w-4 h-4 ml-2" />
                  کپی شد
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 ml-2" />
                  کپی متن
                </>
              )}
            </Button>
          </div>
        </div>
      </AppModal>

      {/* Mind Pattern Modal - Feature 2 */}
      <AppModal
        isOpen={modalState.type === "guide"}
        title=""
        onClose={() => {
          setModalState({ type: null });
          setShareStatus({ type: null, message: null });
        }}
      >
        <div className="space-y-4">
          {mindProfileLoading ? (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
              <p className="text-sm text-foreground/80">در حال بارگذاری...</p>
            </div>
          ) : mindProfileError ? (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
              <p className="text-sm text-foreground/80">
                {mindProfileError}
                {import.meta.env.DEV && (
                  <span className="block mt-2 text-xs text-muted-foreground">
                    {mindProfileError}
                  </span>
                )}
              </p>
            </div>
          ) : mindProfileTemplate ? (
            <>
              {/* Header */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Icon 
                    name="thoughts" 
                    className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80" 
                    title={mindProfileTemplate.title}
                  />
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                    {mindProfileTemplate.title}
                  </h2>
                </div>
                {mindProfileTemplate.subtitle && (
                  <p className="text-sm sm:text-base text-foreground/90 mb-2">
                    {mindProfileTemplate.subtitle}
                  </p>
                )}
                {mindProfileTemplate.intro && (
                  <p className="text-xs sm:text-sm text-foreground/70 leading-6">
                    {mindProfileTemplate.intro}
                  </p>
                )}
              </div>

              {/* Single glass card with dimensions and tips */}
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6">
                {/* Dimensions */}
                {Object.keys(mindProfileTemplate.dimension_texts).length > 0 && (
                  <div className="space-y-4 sm:space-y-5 mb-6">
                    {Object.entries(mindProfileTemplate.dimension_texts).map(([dimensionKey, text]) => {
                      const label = DIMENSION_LABELS[dimensionKey as DimensionKey] || dimensionKey;
                      const score = attemptData?.dimension_scores?.[dimensionKey];
                      return (
                        <div key={dimensionKey} className="flex items-start gap-3 text-right pb-4 border-b border-white/10 last:border-b-0 last:pb-0">
                          <Icon 
                            name="thoughts" 
                            className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 shrink-0 mt-0.5" 
                            title={label}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm sm:text-base font-medium text-foreground">
                                {label}
                              </h4>
                              {score !== undefined && score !== null && (
                                <span className="text-xs text-foreground/60 bg-white/10 px-2 py-1 rounded">
                                  {score.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-foreground/85 leading-7">
                              {text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tips */}
                {mindProfileTemplate.tips && mindProfileTemplate.tips.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <h4 className="text-sm sm:text-base font-medium text-foreground mb-3">
                      نکات و پیشنهادها:
                    </h4>
                    <ul className="space-y-2 text-right">
                      {mindProfileTemplate.tips.map((tip, index) => (
                        <li key={index} className="text-xs sm:text-sm text-foreground/85 leading-7 flex items-start gap-2">
                          <span className="text-primary/80 shrink-0">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Closing Note */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <p className="text-xs text-foreground/70 text-center leading-6">
                    این الگو برای خودشناسی طراحی شده و تشخیص بالینی محسوب نمی‌شود.
                  </p>
                </div>
              </div>

              {shareStatus.message && (
                <div
                  className={`p-3 rounded-xl text-sm text-center ${
                    shareStatus.type === "copy" && shareStatus.message.includes("کپی شد")
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-white/10 text-foreground/90 border border-white/15"
                  }`}
                >
                  {shareStatus.message}
                </div>
              )}

              {/* Actions: Copy, Compare Invite, PDF */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
                <Button
                  onClick={handleMindPatternCopy}
                  variant="outline"
                  className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
                >
                  {shareStatus.type === "copy" && shareStatus.message === "کپی شد" ? (
                    <>
                      <Check className="w-4 h-4 ml-2" />
                      کپی شد
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 ml-2" />
                      کپی متن
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCreateCompareInvite}
                  disabled={isCreatingCompareInvite}
                  className="flex-1 rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40 disabled:opacity-50"
                >
                  {isCreatingCompareInvite ? (
                    <>
                      <Check className="w-4 h-4 ml-2" />
                      در حال ایجاد...
                    </>
                  ) : shareStatus.type === "copy" && shareStatus.message === "لینک مقایسه کپی شد" ? (
                    <>
                      <Check className="w-4 h-4 ml-2" />
                      کپی شد
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 ml-2" />
                      ارسال لینک مقایسه
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleMindPatternPdf}
                  variant="outline"
                  className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
                >
                  <Download className="w-4 h-4 ml-2" />
                  PDF
                </Button>
              </div>
            </>
          ) : mindPatternError ? (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
              <p className="text-sm text-foreground/80">{mindPatternError}</p>
            </div>
          ) : mindPatternData ? (
            <>
              {/* Header */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Icon 
                    name="thoughts" 
                    className="w-5 h-5 sm:w-6 sm:h-6 text-primary/80" 
                    title="الگوی ذهنی من"
                  />
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
                    الگوی ذهنی من
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-foreground/70 leading-6">
                  این توضیح نشان می‌دهد ذهن من در موقعیت‌های مختلف چگونه کار می‌کند.
                </p>
              </div>

              {/* Single glass card with all items */}
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6">
                {/* List of 12 items */}
                <div className="space-y-4 sm:space-y-5 max-h-[450px] overflow-y-auto pr-2">
                  {mindPatternData.items.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 text-right pb-4 border-b border-white/10 last:border-b-0 last:pb-0">
                      <Icon 
                        name="thoughts" 
                        className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 shrink-0 mt-0.5" 
                        title={item.title}
                      />
                      <div className="flex-1">
                        <h4 className="text-sm sm:text-base font-medium text-foreground mb-2">
                          {item.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-foreground/85 leading-7">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Closing Note */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <p className="text-xs text-foreground/70 text-center leading-6">
                    این الگو برای خودشناسی طراحی شده و تشخیص بالینی محسوب نمی‌شود.
                  </p>
                </div>
              </div>

              {shareStatus.message && (
                <div
                  className={`p-3 rounded-xl text-sm text-center ${
                    shareStatus.type === "copy" && shareStatus.message.includes("کپی شد")
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-white/10 text-foreground/90 border border-white/15"
                  }`}
                >
                  {shareStatus.message}
                </div>
              )}

              {/* Actions: Copy, Share, PDF */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
                <Button
                  onClick={handleMindPatternCopy}
                  variant="outline"
                  className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
                >
                  {shareStatus.type === "copy" && shareStatus.message === "کپی شد" ? (
                    <>
                      <Check className="w-4 h-4 ml-2" />
                      کپی شد
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 ml-2" />
                      کپی متن
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleMindPatternShare}
                  className="flex-1 rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40"
                >
                  {shareStatus.type === "share" && shareStatus.message === "ارسال شد" ? (
                    <>
                      <Check className="w-4 h-4 ml-2" />
                      ارسال شد
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 ml-2" />
                      اشتراک‌گذاری
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleMindPatternPdf}
                  variant="outline"
                  className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
                >
                  <Download className="w-4 h-4 ml-2" />
                  PDF
                </Button>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
              <p className="text-sm text-foreground/80">در حال بارگذاری...</p>
            </div>
          )}
        </div>
      </AppModal>

      {/* Invite Modal - Feature 3 */}
      <AppModal
        isOpen={modalState.type === "invite"}
        title="دعوت به مقایسه‌ی ذهن‌ها"
        description="این لینک رو برای کسی که می‌خوای بفرست. بعد از تکمیل آزمون توسط نفر دوم، مقایسه فعال می‌شود."
        onClose={() => {
          setModalState({ type: null });
          setShareStatus({ type: null, message: null });
        }}
      >
        <div className="space-y-4">
          {inviteLoading ? (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
              <p className="text-sm text-foreground/80">در حال ساخت لینک…</p>
            </div>
          ) : inviteUrl ? (
            <>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/15">
                <p className="text-xs text-muted-foreground/70 mb-2">لینک دعوت:</p>
                <p className="text-sm sm:text-base text-foreground font-mono break-all select-all">
                  {inviteUrl}
                </p>
              </div>
              
              {/* Fallback plain text copy area */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground/70 mb-2">یا لینک را دستی کپی کنید:</p>
                <textarea
                  readOnly
                  value={inviteUrl}
                  className="w-full p-2 rounded-lg bg-black/20 border border-white/10 text-sm text-foreground font-mono resize-none"
                  rows={2}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <p className="text-xs text-muted-foreground/80 leading-6 text-center">
                بعد از تکمیل آزمون توسط نفر دوم، مقایسه فعال می‌شود.
              </p>

              {shareStatus.message && (
                <div
                  className={`p-3 rounded-xl text-sm text-center ${
                    shareStatus.type === "copy" && shareStatus.message.includes("کپی شد")
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : shareStatus.type === null && shareStatus.message.includes("خطا")
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-white/10 text-foreground/90 border border-white/15"
                  }`}
                >
                  {shareStatus.message}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleInviteShare}
                  className="flex-1 rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40"
                >
                  {shareStatus.type === "share" && shareStatus.message === "ارسال شد" ? (
                    <>
                      <Check className="w-4 h-4 ml-2" />
                      ارسال شد
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 ml-2" />
                      اشتراک‌گذاری لینک
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleInviteCopy}
                  variant="outline"
                  className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
                >
                  {shareStatus.type === "copy" && shareStatus.message === "کپی شد" ? (
                    <>
                      <Check className="w-4 h-4 ml-2" />
                      کپی شد
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 ml-2" />
                      کپی لینک
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-center">
              <p className="text-sm text-red-400">
                {shareStatus.message || "خطا در ایجاد لینک دعوت. لطفاً دوباره تلاش کنید."}
              </p>
            </div>
          )}
        </div>
      </AppModal>
    </>
  );
}
