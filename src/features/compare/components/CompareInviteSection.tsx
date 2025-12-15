import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { AppModal } from "@/components/AppModal";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { createCompareInvite } from "@/features/compare/createCompareInvite";
import { getLatestCompletedAttempt } from "@/features/compare/getLatestCompletedAttempt";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { supabase } from "@/lib/supabaseClient";
import { shareOrCopyText, copyText } from "@/features/share/shareClient";

interface CompareInviteSectionProps {
  attemptId?: string | null;
}

export function CompareInviteSection({ attemptId }: CompareInviteSectionProps) {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAnonAuth();
  const [modalState, setModalState] = useState<{
    type: "invite" | null;
  }>({ type: null });
  const [shareStatus, setShareStatus] = useState<{
    type: "share" | "copy" | null;
    message: string | null;
  }>({ type: null, message: null });
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleCreateInvite = async () => {
    if (inviteLoading || authLoading) return;

    setInviteLoading(true);
    try {
      if (!userId) {
        const errorMsg = "احراز هویت انجام نشده است. لطفاً صفحه را رفرش کنید.";
        if (import.meta.env.DEV) {
          console.error("[CompareInviteSection] ❌ No user ID available");
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
        console.log("[CompareInviteSection] User ID:", userId);
      }

      // Resolve attempt ID using robust resolver
      const attemptAId = await getLatestCompletedAttempt(userId);

      if (!attemptAId) {
        const errorMsg = "اطلاعات آزمون یافت نشد. لطفاً دوباره آزمون رو انجام بدید.";
        if (import.meta.env.DEV) {
          console.error("[CompareInviteSection] ❌ No completed attempt found:", {
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
        console.log("[CompareInviteSection] ✅ Attempt A ID resolved:", {
          attemptAId,
          userId,
        });
      }

      // Validate attempt is completed with total_score
      const { data: attemptCheck, error: attemptCheckError } = await supabase
        .from("attempts")
        .select("id, status, total_score")
        .eq("id", attemptAId)
        .maybeSingle();

      if (attemptCheckError) {
        const errorMsg = "خطا در بررسی اطلاعات آزمون";
        if (import.meta.env.DEV) {
          console.error("[CompareInviteSection] ❌ Error checking attempt:", {
            code: attemptCheckError.code,
            message: attemptCheckError.message,
            details: attemptCheckError.details,
            hint: attemptCheckError.hint,
          });
        }
        setShareStatus({
          type: null,
          message: errorMsg,
        });
        toast.error(errorMsg);
        setModalState({ type: "invite" });
        setInviteLoading(false);
        return;
      }

      if (!attemptCheck) {
        const errorMsg = "اطلاعات آزمون یافت نشد";
        if (import.meta.env.DEV) {
          console.error("[CompareInviteSection] ❌ Attempt not found");
        }
        setShareStatus({
          type: null,
          message: errorMsg,
        });
        toast.error(errorMsg);
        setModalState({ type: "invite" });
        setInviteLoading(false);
        return;
      }

      if (attemptCheck.status !== "completed" || attemptCheck.total_score === null) {
        const errorMsg = "اول آزمون را کامل کنید";
        if (import.meta.env.DEV) {
          console.error("[CompareInviteSection] ❌ Attempt not completed:", {
            status: attemptCheck.status,
            total_score: attemptCheck.total_score,
          });
        }
        setShareStatus({
          type: null,
          message: errorMsg,
        });
        toast.error(errorMsg);
        setModalState({ type: "invite" });
        setInviteLoading(false);
        return;
      }

      // Call Supabase RPC to create compare invite (24 hours = 1440 minutes)
      const result = await createCompareInvite(attemptAId, 1440);

      if (import.meta.env.DEV) {
        console.log("[CompareInviteSection] ✅ Invite created:", {
          session_id: result.session_id,
          invite_token: result.invite_token.substring(0, 12) + "...",
          expires_at: result.expires_at,
          url: result.url,
        });
      }

      // Set invite URL and token, then show modal
      setInviteUrl(result.url);
      setInviteToken(result.invite_token);
      setModalState({ type: "invite" });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "خطا در ایجاد لینک دعوت. لطفاً دوباره تلاش کنید.";
      
      if (import.meta.env.DEV) {
        console.error("[CompareInviteSection] ❌ Error creating invite:", error);
      }

      setShareStatus({
        type: null,
        message: errorMsg,
      });
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
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        setShareStatus({ type: "copy", message: "کپی شد" });
        toast.success("لینک کپی شد");
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 2000);
        return;
      }

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
        console.error("[CompareInviteSection] Error copying to clipboard:", error);
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
      {/* Hero Section - Compare Invite */}
      <div className="space-y-4 sm:space-y-6">
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl text-foreground font-bold">
            ذهن ما کنار هم
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-foreground/80 font-medium">
            مقایسه دو ذهن برای فهم تفاوت‌ها، نه قضاوت
          </p>
        </div>

        {/* Value Proposition Card */}
        <Card className="bg-primary/15 backdrop-blur-2xl border-primary/30 shadow-xl">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-medium">
              نتیجه اصلی وقتی کامل می‌شه که دو نفر انجام بدن.
            </p>
            <Button
              onClick={handleCreateInvite}
              disabled={inviteLoading || authLoading}
              className="rounded-xl min-h-[56px] px-8 text-base sm:text-lg font-semibold bg-primary/90 hover:bg-primary border-primary/40 shadow-lg"
              size="lg"
            >
              {inviteLoading ? "در حال ساخت لینک…" : "دعوت یک نفر برای مقایسه‌ی ذهن‌ها"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Invite Modal */}
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
                این لینک تا ۲۴ ساعت معتبر است.
              </p>
              <p className="text-xs text-muted-foreground/70 leading-6 text-center">
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

              {/* View Compare Card Button */}
              {inviteToken && (
                <Button
                  onClick={() => {
                    navigate(`/compare/result/${inviteToken}`);
                    setModalState({ type: null });
                  }}
                  variant="outline"
                  className="w-full rounded-xl min-h-[44px] bg-white/10 border-white/20 mt-2"
                >
                  دیدن کارت مقایسه
                </Button>
              )}
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

