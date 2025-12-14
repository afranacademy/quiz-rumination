import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { AppModal } from "@/components/AppModal";
import { SocialFeatureCard } from "./SocialFeatureCard";
import { Share2, Copy, Check, Download } from "lucide-react";
import { buildResultSummaryText } from "@/features/share/buildResultSummaryText";
import { shareOrCopyText, copyText } from "@/features/share/shareClient";
import { buildMindPatternText } from "@/features/mindPattern/buildMindPatternText";
import { buildMindPatternPdfBlob } from "@/features/mindPattern/buildMindPatternPdf";
import { getLevelLabel } from "../results/levelLabels";
import type { LevelKey, LikertValue } from "../types";

interface SocialShareSectionProps {
  level: LevelKey;
  firstName: string | null;
  score: number;
  levelLabel: "کم" | "متوسط" | "زیاد";
}

export function SocialShareSection({
  level,
  firstName,
  score,
  levelLabel,
}: SocialShareSectionProps) {
  const [modalState, setModalState] = useState<{
    type: "summary" | "guide" | "invite" | null;
  }>({ type: null });
  const [shareStatus, setShareStatus] = useState<{
    type: "share" | "copy" | null;
    message: string | null;
  }>({ type: null, message: null });
  const [mindPatternData, setMindPatternData] = useState<{
    fullText: string;
    bulletPoints: string[];
  } | null>(null);
  const [mindPatternError, setMindPatternError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const quizTitle = "آزمون سنجش نشخوار فکری (ذهن وراج)";
  const maxScore = 48;
  const currentUrl = typeof window !== "undefined" ? window.location.href : undefined;

  // Load answers and build mind pattern
  useEffect(() => {
    try {
      const answersData = sessionStorage.getItem("quiz_answers_v1");
      if (answersData) {
        const answersArray = JSON.parse(answersData) as LikertValue[];
        if (answersArray && answersArray.length === 12) {
          const pattern = buildMindPatternText({
            firstName: firstName || undefined,
            answersRaw: answersArray,
            quizTitle,
          });
          setMindPatternData(pattern);
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
  }, [firstName, quizTitle]);

  const summaryText = buildResultSummaryText({
    firstName: firstName || undefined,
    levelLabel,
    score,
    maxScore,
    quizTitle,
    url: currentUrl,
  });

  const handleShare = async () => {
    const result = await shareOrCopyText({
      title: quizTitle,
      text: summaryText,
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
    const success = await copyText(summaryText);
    if (success) {
      setShareStatus({ type: "copy", message: "کپی شد" });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 2000);
    }
  };

  const handleMindPatternShare = async () => {
    if (!mindPatternData) return;

    const result = await shareOrCopyText({
      title: "الگوی ذهنی من",
      text: mindPatternData.fullText,
      url: currentUrl,
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
          message: "امکان اشتراک‌گذاری مستقیم در این دستگاه نبود؛ متن کپی شد.",
        });
      }
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 3000);
    } else if (result.error === "canceled") {
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

  const handleMindPatternCopy = async () => {
    if (!mindPatternData) return;
    const success = await copyText(mindPatternData.fullText);
    if (success) {
      setShareStatus({ type: "copy", message: "کپی شد" });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 2000);
    }
  };

  const handleMindPatternPdf = async () => {
    if (!mindPatternData) return;
    try {
      const blob = await buildMindPatternPdfBlob({
        firstName: firstName || undefined,
        bulletPoints: mindPatternData.bulletPoints,
      });

      // Try to share file if supported (for PDF)
      // Note: Currently returns text blob, will be PDF when library is added
      const fileName = "الگوی-ذهنی-من.txt"; // Will be .pdf when PDF generation is implemented
      const fileType = "text/plain"; // Will be "application/pdf" when PDF generation is implemented
      
      try {
        const file = new File([blob], fileName, { type: fileType });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "الگوی ذهنی من",
          });
          return;
        }
      } catch (error) {
        // Share not supported or failed, fall through to download
      }
      
      // Fallback to download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  };

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      // Get current attempt ID from sessionStorage
      const attemptIdData = sessionStorage.getItem("quiz_attempt_id");
      if (!attemptIdData) {
        setShareStatus({
          type: null,
          message: "اطلاعات آزمون یافت نشد. لطفاً دوباره آزمون رو انجام بدید.",
        });
        setInviteLoading(false);
        return;
      }

      const attemptId = JSON.parse(attemptIdData);

      const API_URL = import.meta.env.VITE_NETLIFY_FUNCTIONS_URL || "";
      const response = await fetch(`${API_URL}/.netlify/functions/createInvite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviterAttemptId: attemptId }),
      });

      const data = await response.json();

      if (response.ok && data.inviteUrl) {
        setInviteUrl(data.inviteUrl);
        setModalState({ type: "invite" });
      } else {
        setShareStatus({
          type: null,
          message: "خطا در ایجاد لینک دعوت. لطفاً دوباره تلاش کنید.",
        });
      }
    } catch (error) {
      console.error("Failed to create invite:", error);
      setShareStatus({
        type: null,
        message: "خطا در ایجاد لینک دعوت. لطفاً دوباره تلاش کنید.",
      });
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
    const success = await copyText(inviteUrl);
    if (success) {
      setShareStatus({ type: "copy", message: "کپی شد" });
      setTimeout(() => {
        setShareStatus({ type: null, message: null });
      }, 2000);
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
                  onClick: () => {},
                },
              ]}
            />

            {/* Feature 2 - Mind Pattern */}
            <SocialFeatureCard
              title="الگوی ذهنی من"
              description="این یک راهنمای ساده است که می‌تونی برای کسایی که دوست داری بدونن ذهنم درگیر نشخوار فکری، در موقعیت‌های مختلف چطور کار می‌کنه، براشون بفرستی."
              icon="recommendation"
              emphasis="warm"
              primaryAction={{
                label: "ارسال الگوی ذهنی من",
                onClick: () => setModalState({ type: "guide" }),
              }}
            />
          </div>

          {/* Second Row: Feature 3 (Full width) */}
          <SocialFeatureCard
            title="ذهن ما کنار هم"
            description="یک نفر رو دعوت کن همین آزمون رو انجام بده و الگوهای ذهنی‌تون رو با هم مقایسه کنین. این تجربه می‌تونه به فهم متقابل کمک کنه."
            icon="thoughts"
            emphasis="primary"
            primaryAction={{
              label: inviteLoading ? "در حال ایجاد..." : "دعوت یک نفر برای مقایسه‌ی ذهن‌ها",
              onClick: handleCreateInvite,
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
          <textarea
            readOnly
            value={summaryText}
            className="w-full min-h-[180px] p-4 rounded-2xl bg-black/20 border border-white/15 text-foreground text-sm sm:text-base leading-7 resize-none select-text"
            onClick={(e) => {
              (e.target as HTMLTextAreaElement).select();
            }}
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
        title="الگوی ذهنی من"
        onClose={() => {
          setModalState({ type: null });
          setShareStatus({ type: null, message: null });
        }}
      >
        <div className="space-y-4">
          {mindPatternError ? (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
              <p className="text-sm text-foreground/80">{mindPatternError}</p>
            </div>
          ) : mindPatternData ? (
            <>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm sm:text-base text-foreground/90 leading-7">
                  {firstName ? `${firstName}، ` : ""}این یک راهنمای ساده است که می‌تونی برای کسایی که دوست داری بدونن ذهنم درگیر نشخوار فکری، در موقعیت‌های مختلف چطور کار می‌کنه، براشون بفرستی.
                </p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                <h3 className="text-base font-medium text-foreground mb-2">
                  این الگوها توی ذهن من دیده می‌شن:
                </h3>
                {mindPatternData.bulletPoints.map((point, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-primary shrink-0 mt-1 font-bold">{index + 1}.</span>
                    <p className="text-sm sm:text-base text-foreground/90 leading-7 flex-1">
                      {point}
                    </p>
                  </div>
                ))}
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

              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <Button
                  onClick={handleMindPatternShare}
                  className="w-full rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40"
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
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleMindPatternCopy}
                    variant="outline"
                    className="rounded-xl min-h-[44px] bg-white/10 border-white/20"
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
                    onClick={handleMindPatternPdf}
                    variant="outline"
                    className="rounded-xl min-h-[44px] bg-white/10 border-white/20"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    دانلود PDF
                  </Button>
                </div>
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
          {inviteUrl ? (
            <>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/15">
                <p className="text-xs text-muted-foreground/70 mb-2">لینک دعوت:</p>
                <p className="text-sm sm:text-base text-foreground font-mono break-all">
                  {inviteUrl}
                </p>
              </div>
              <p className="text-xs text-muted-foreground/80 leading-6 text-center">
                بعد از تکمیل آزمون توسط نفر دوم، مقایسه فعال می‌شود.
              </p>

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
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
              <p className="text-sm text-foreground/80">در حال ایجاد لینک دعوت...</p>
            </div>
          )}
        </div>
      </AppModal>
    </>
  );
}
