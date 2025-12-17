/// <reference types="vite/client" />
import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { AppModal } from "@/components/AppModal";
import { SocialFeatureCard } from "./SocialFeatureCard";
import { Share2, Check, Copy } from "lucide-react";
// import { shareOrCopyText, copyText } from "@/features/share/shareClient"; // Unused
import { buildSummaryPdfBlob } from "@/features/share/buildSummaryPdf";
import { pickSummaryRange } from "@/features/share/summaryRanges";
import type { LevelKey } from "../types";
import { CompareInviteSection } from "@/features/compare/components/CompareInviteSection";
import { MindPatternCard } from "./MindPatternCard";
import { buildInviteCta, CTA_URL, shareInvite, copyInvite } from "@/utils/inviteCta";

interface SocialShareSectionProps {
  level: LevelKey;
  firstName: string | null;
  score: number;
  attemptData?: {
    quiz_id: string;
    score_band_id: number | null;
    dimension_scores: Record<string, number>;
  } | null;
  attemptId?: string | null;
}

export function SocialShareSection({
  firstName,
  score,
  attemptId,
}: SocialShareSectionProps) {
  const [modalState, setModalState] = useState<{
    type: "summary" | null;
  }>({ type: null });
  const [shareStatus, setShareStatus] = useState<{
    type: "share" | "copy" | null;
    message: string | null;
  }>({ type: null, message: null });

  const quizTitle = "آزمون سنجش نشخوار فکری (ذهن وراج)";
  const maxScore = 48;

  // Get summary range based on score
  const summaryRange = pickSummaryRange(score);



  const handleShare = async () => {
    const contentText = `${summaryRange.text}\n\nامتیاز: ${score} از ${maxScore}`;
    
    const result = await shareInvite({
      title: quizTitle,
      contentText,
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
    const contentText = `${summaryRange.text}\n\nامتیاز: ${score} از ${maxScore}`;
    const success = await copyInvite({ contentText });
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
      const contentText = `${summaryRange.text}\n\nامتیاز: ${score} از ${maxScore}`;
      const copySuccess = await copyInvite({ contentText });
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

        {/* Compare Card - ذهن ما کنار هم (First in Share Section) */}
        <CompareInviteSection attemptId={attemptId} />

        {/* My Mental Pattern Card - الگوی ذهنی من (Second in Share Section) */}
        <MindPatternCard attemptId={attemptId} firstName={firstName} />

        {/* Feature Cards - Full width to match Compare and MindPattern cards */}
        <div className="space-y-4 sm:space-y-6">
          {/* Share Result Summary - Full width card */}
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

          {/* Invite Link - Clickable Button/Span */}
          <div className="pt-2 pb-2 text-center">
            <Button
              variant="link"
              className="text-primary hover:underline cursor-pointer text-base font-medium p-0 h-auto"
              onClick={() => window.open(CTA_URL, '_blank')}
            >
              {buildInviteCta()}
            </Button>
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


    </>
  );
}
