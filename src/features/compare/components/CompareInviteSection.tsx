import { useState, useEffect } from "react";
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

export function CompareInviteSection({ attemptId: _attemptId }: CompareInviteSectionProps) {
  const navigate = useNavigate();
  const { userId, loading: authLoading } = useAnonAuth();
  const [modalState, setModalState] = useState<{
    type: "invite" | null;
  }>({ type: null });
  const [shareStatus, setShareStatus] = useState<{
    type: "share" | "copy" | null;
    message: string | null;
  }>({ type: null, message: null });
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<"pending" | "completed" | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [creatingNewLink, setCreatingNewLink] = useState(false);
  const [currentAttemptAId, setCurrentAttemptAId] = useState<string | null>(null);

  // Single source of truth for invite URL
  const inviteUrl = inviteToken 
    ? `${window.location.origin}/compare/invite/${inviteToken}`
    : null;

  // Helper function to get localStorage key for token
  const getTokenStorageKey = (attemptAId: string) => `compare_token_${attemptAId}`;

  // Helper function to load token from localStorage
  const loadTokenFromStorage = (attemptAId: string) => {
    const stored = localStorage.getItem(getTokenStorageKey(attemptAId));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.status) {
          setInviteToken(parsed.token);
          setTokenStatus(parsed.status);
          return true;
        }
      } catch (e) {
        // Invalid JSON, clear it
        localStorage.removeItem(getTokenStorageKey(attemptAId));
      }
    }
    return false;
  };

  // Helper function to save token to localStorage
  const saveTokenToStorage = (attemptAId: string, token: string, status: "pending" | "completed") => {
    localStorage.setItem(getTokenStorageKey(attemptAId), JSON.stringify({ token, status }));
  };

  // Fetch current token when modal opens
  useEffect(() => {
    if (modalState.type === "invite" && userId && !authLoading) {
      const fetchCurrentToken = async () => {
        try {
          const attemptAId = await getLatestCompletedAttempt(userId);
          if (!attemptAId) return;

          setCurrentAttemptAId(attemptAId);

          // First try to load from localStorage
          const storedToken = loadTokenFromStorage(attemptAId);
          
          // Fetch current token from server - create new invite using authoritative RPC
          setInviteLoading(true);
          try {
            const result = await createCompareInvite(attemptAId, 1440);
            setInviteToken(result.invite_token);
            setTokenStatus("pending"); // New invites are always pending
            saveTokenToStorage(attemptAId, result.invite_token, "pending");
          } catch (error) {
            // If fetch fails and we had a stored token, keep it
            if (!storedToken) {
              localStorage.removeItem(getTokenStorageKey(attemptAId));
              setInviteToken(null);
              setTokenStatus(null);
            }
            // Error will be shown in modal
          } finally {
            setInviteLoading(false);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error("[CompareInviteSection] Error fetching token on modal open:", error);
          }
          setInviteLoading(false);
        }
      };

      fetchCurrentToken();
    }
  }, [modalState.type, userId, authLoading]);

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

      // Create new invite using authoritative RPC (24 hours = 1440 minutes)
      const result = await createCompareInvite(attemptAId, 1440);

      if (import.meta.env.DEV) {
        const computedUrl = `${window.location.origin}/compare/invite/${result.invite_token}`;
        console.log("[CompareInviteSection] ✅ Invite created:", {
          session_id: result.session_id,
          invite_token: result.invite_token.substring(0, 12) + "...",
          expires_at: result.expires_at,
          inviteUrl: computedUrl,
        });
      }

      // Set token and status, then show modal (URL is computed from token)
      setInviteToken(result.invite_token);
      setTokenStatus("pending"); // New invites are always pending
      setCurrentAttemptAId(attemptAId);
      saveTokenToStorage(attemptAId, result.invite_token, "pending");
      setModalState({ type: "invite" });
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareInviteSection.tsx:164',message:'Error in handleCreateInvite',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:null,errorName:error instanceof Error?error.name:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,E'})}).catch(()=>{});
      // #endregion

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
    if (!inviteToken || !inviteUrl) return;

    // Debug log in dev
    if (import.meta.env.DEV) {
      console.log("[CompareInviteSection] Sharing invite:", { token: inviteToken, inviteUrl });
    }

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
    if (!inviteToken || !inviteUrl) return;

    // Debug log in dev
    if (import.meta.env.DEV) {
      console.log("[CompareInviteSection] Copying invite:", { token: inviteToken, inviteUrl });
    }

    // Always use the canonical URL string, never read from DOM
    const urlToCopy = inviteUrl;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(urlToCopy);
        setShareStatus({ type: "copy", message: "کپی شد" });
        toast.success("لینک کپی شد");
        setTimeout(() => {
          setShareStatus({ type: null, message: null });
        }, 2000);
        return;
      }

      const success = await copyText(urlToCopy);
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

  const handleCreateNewLink = async () => {
    if (creatingNewLink || authLoading) return;

    // Confirm user intent
    const confirmed = window.confirm(
      "آیا مطمئن هستید که می‌خواهید لینک جدید بسازید؟ لینک قبلی دیگر کار نخواهد کرد."
    );

    if (!confirmed) {
      return;
    }

    setCreatingNewLink(true);
    try {
      if (!userId) {
        const errorMsg = "احراز هویت انجام نشده است. لطفاً صفحه را رفرش کنید.";
        toast.error(errorMsg);
        setCreatingNewLink(false);
        return;
      }

      // Resolve attempt ID
      const attemptAId = await getLatestCompletedAttempt(userId);

      if (!attemptAId) {
        const errorMsg = "اطلاعات آزمون یافت نشد. لطفاً دوباره آزمون رو انجام بدید.";
        toast.error(errorMsg);
        setCreatingNewLink(false);
        return;
      }

      // Validate attempt is completed
      const { data: attemptCheck, error: attemptCheckError } = await supabase
        .from("attempts")
        .select("id, status, total_score")
        .eq("id", attemptAId)
        .maybeSingle();

      if (attemptCheckError || !attemptCheck) {
        const errorMsg = "خطا در بررسی اطلاعات آزمون";
        toast.error(errorMsg);
        setCreatingNewLink(false);
        return;
      }

      if (attemptCheck.status !== "completed" || attemptCheck.total_score === null) {
        const errorMsg = "اول آزمون را کامل کنید";
        toast.error(errorMsg);
        setCreatingNewLink(false);
        return;
      }

        // Create new invite using authoritative RPC (24 hours = 1440 minutes)
        const result = await createCompareInvite(attemptAId, 1440);

        if (import.meta.env.DEV) {
          console.log("[CompareInviteSection] ✅ New invite created:", {
            session_id: result.session_id,
            invite_token: result.invite_token.substring(0, 12) + "...",
            expires_at: result.expires_at,
          });
        }

        // Update token and status (URL is computed from token)
        if (!currentAttemptAId) {
          const resolvedAttemptAId = await getLatestCompletedAttempt(userId);
          if (resolvedAttemptAId) {
            setCurrentAttemptAId(resolvedAttemptAId);
            setInviteToken(result.invite_token);
            setTokenStatus("pending");
            saveTokenToStorage(resolvedAttemptAId, result.invite_token, "pending");
            toast.success("لینک جدید ساخته شد");
          }
        } else {
          setInviteToken(result.invite_token);
          setTokenStatus("pending");
          saveTokenToStorage(currentAttemptAId, result.invite_token, "pending");
          toast.success("لینک جدید ساخته شد");
        }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "خطا در ساخت لینک جدید. لطفاً دوباره تلاش کنید.";
      
      if (import.meta.env.DEV) {
        console.error("[CompareInviteSection] ❌ Error creating new link:", error);
      }

      toast.error(errorMsg);
    } finally {
      setCreatingNewLink(false);
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
              className={`rounded-xl min-h-[56px] px-8 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-blue-400/50 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95 ${
                !inviteLoading && !authLoading 
                  ? "animate-bounce-pulse hover:animate-none" 
                  : ""
              }`}
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
          ) : inviteUrl && inviteToken ? (
            <>
              {/* Show different UI based on status */}
              {tokenStatus === "completed" ? (
                <>
                  {/* Completed Status: Show View Compare button */}
                  <div className="p-4 rounded-2xl bg-primary/20 border border-primary/30 text-center">
                    <p className="text-sm text-primary font-medium mb-4">
                      مقایسه کامل شده است! می‌توانید نتیجه را ببینید.
                    </p>
                    <Button
                      onClick={() => {
                        navigate(`/compare/invite/${inviteToken}`);
                        setModalState({ type: null });
                      }}
                      className="w-full rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40"
                    >
                      دیدن کارت مقایسه
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Pending Status: Show invite link and share buttons */}
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/15">
                    <p className="text-xs text-muted-foreground/70 mb-2">لینک دعوت:</p>
                    <p 
                      className="text-sm sm:text-base text-foreground font-mono select-all"
                      style={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}
                      title={inviteUrl || ''}
                    >
                      {inviteUrl}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-muted-foreground/70 mb-2">یا لینک را دستی کپی کنید:</p>
                    <textarea
                      readOnly
                      value={inviteUrl || ''}
                      className="w-full p-2 rounded-lg bg-black/20 border border-white/10 text-sm text-foreground font-mono resize-none"
                      style={{ whiteSpace: 'nowrap', overflowX: 'auto' }}
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

                  {/* View Comparison Status Button */}
                  {inviteToken && (
                    <Button
                      onClick={() => {
                        navigate(`/compare/invite/${inviteToken}`);
                        setModalState({ type: null });
                      }}
                      variant="outline"
                      className="w-full rounded-xl min-h-[44px] bg-white/10 border-white/20"
                    >
                      دیدن وضعیت مقایسه
                    </Button>
                  )}

                  {/* Create New Link Button */}
                  <Button
                    onClick={handleCreateNewLink}
                    disabled={creatingNewLink}
                    variant="outline"
                    className="w-full rounded-xl min-h-[44px] bg-white/5 border-white/10 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {creatingNewLink ? "در حال ساخت لینک جدید…" : "ساخت لینک جدید"}
                  </Button>
                </>
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

