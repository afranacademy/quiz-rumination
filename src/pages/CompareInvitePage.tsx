import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCompareSession } from "@/features/compare/getCompareSession";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import type { CompareSession } from "@/features/compare/getCompareSession";

export default function CompareInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<CompareSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIdentityForm, setShowIdentityForm] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", phone: "" });
  const [formErrors, setFormErrors] = useState<{ firstName?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token not provided");
      setLoading(false);
      return;
    }

    // Store token in sessionStorage so it persists across navigation to /quiz and /result
    sessionStorage.setItem("afran_compare_token", token);
    
    if (import.meta.env.DEV) {
      console.log("[CompareInvitePage] Token stored in sessionStorage:", token.substring(0, 12) + "...");
    }

    if (import.meta.env.DEV) {
      console.log("[CompareInvitePage] Loading session for token:", token);
    }

    // Fetch session using service function (uses RPC internally)
    const loadSession = async () => {
      try {
        const sessionData = await getCompareSession(token);

        if (!sessionData) {
          if (import.meta.env.DEV) {
            console.log("[CompareInvitePage] No valid session found or expired for token:", token);
          }
          setError("invalid or expired link");
          setLoading(false);
          return;
        }

        setSession(sessionData);

        if (import.meta.env.DEV) {
          console.log("[CompareInvitePage] Session loaded:", {
            id: sessionData.id,
            status: sessionData.status,
            attemptAId: sessionData.attemptAId?.substring(0, 8) + "...",
            attemptBId: sessionData.attemptBId?.substring(0, 8) + "..." || "null",
            expiresAt: sessionData.expiresAt,
            inviterFirstName: sessionData.inviterFirstName,
            inviterLastName: sessionData.inviterLastName,
          });
        }

        // C) Fetch inviter name from attempts table if not in session data
        // If RLS blocks, fallback to RPC function (SECURITY DEFINER)
        if (sessionData.attemptAId) {
          const fetchInviterName = async () => {
            try {
              // First try: Direct query from attempts table
              const { data: attempt, error: directError } = await supabase
                .from("attempts")
                .select("user_first_name, user_last_name")
                .eq("id", sessionData.attemptAId!)
                .single();
              
              if (!directError && attempt) {
                const fullName = [attempt.user_first_name, attempt.user_last_name]
                  .filter(Boolean)
                  .join(" ")
                  .trim();
                const displayName = fullName || attempt.user_first_name || null;
                
                if (displayName && displayName !== sessionData.inviterFirstName) {
                  // Update session data with fetched name
                  setSession({
                    ...sessionData,
                    inviterFirstName: attempt.user_first_name || sessionData.inviterFirstName,
                    inviterLastName: attempt.user_last_name || sessionData.inviterLastName,
                  });
                  
                  if (import.meta.env.DEV) {
                    console.log("[CompareInvitePage] ✅ Fetched inviter name from attempts table:", {
                      user_first_name: attempt.user_first_name,
                      user_last_name: attempt.user_last_name,
                      displayName,
                    });
                  }
                }
                return; // Success, exit early
              }
              
              // If direct query failed (likely RLS), try RPC function
              if (directError) {
                if (import.meta.env.DEV) {
                  console.warn("[CompareInvitePage] Direct query failed (likely RLS), trying RPC:", directError);
                }
                
                const { data: rpcData, error: rpcError } = await supabase.rpc(
                  "get_inviter_name_by_attempt_id",
                  { p_attempt_id: sessionData.attemptAId! }
                );
                
                if (!rpcError && rpcData && rpcData.length > 0) {
                  const rpcResult = rpcData[0];
                  const fullName = [rpcResult.user_first_name, rpcResult.user_last_name]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  const displayName = fullName || rpcResult.user_first_name || null;
                  
                  if (displayName && displayName !== sessionData.inviterFirstName) {
                    // Update session data with fetched name from RPC
                    setSession({
                      ...sessionData,
                      inviterFirstName: rpcResult.user_first_name || sessionData.inviterFirstName,
                      inviterLastName: rpcResult.user_last_name || sessionData.inviterLastName,
                    });
                    
                    if (import.meta.env.DEV) {
                      console.log("[CompareInvitePage] ✅ Fetched inviter name from RPC (SECURITY DEFINER):", {
                        user_first_name: rpcResult.user_first_name,
                        user_last_name: rpcResult.user_last_name,
                        displayName,
                      });
                    }
                  }
                  return; // Success via RPC, exit
                } else if (rpcError && import.meta.env.DEV) {
                  console.warn("[CompareInvitePage] RPC also failed:", rpcError);
                }
              }
              
              // Both methods failed - fallback to session data (already set)
              if (import.meta.env.DEV) {
                console.warn("[CompareInvitePage] ⚠️ Both direct query and RPC failed, using session data fallback");
              }
            } catch (err) {
              if (import.meta.env.DEV) {
                console.warn("[CompareInvitePage] Error fetching inviter name:", err);
              }
              // Fallback: use session data (already set)
            }
          };
          
          fetchInviterName();
        }

        // If status is 'completed', navigate to result page
        if (sessionData.status === "completed") {
          navigate(`/compare/result/${token}`);
          return;
        }

        setLoading(false);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[CompareInvitePage] Unexpected error:", err);
          if (err instanceof Error && err.message.includes("406")) {
            console.error("[CompareInvitePage] ⚠️ 406 error detected - this may indicate .single() was used or query matched 0 rows");
          }
        }
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    loadSession();
  }, [token, navigate]);

  const validatePhone = (phoneValue: string): boolean => {
    const normalized = phoneValue.replace(/[\s\-\(\)]/g, "");
    return /^(0|0098|\+98)?9\d{9}$/.test(normalized);
  };

  const normalizePhone = (phoneValue: string): string => {
    let normalized = phoneValue.replace(/\D/g, "");
    if (normalized.startsWith("989")) {
      normalized = "0" + normalized.substring(2);
    } else if (normalized.startsWith("00989")) {
      normalized = "0" + normalized.substring(4);
    }
    return normalized;
  };

  const handleStartQuiz = () => {
    if (!token) return;
    // Show identity form first
    setShowIdentityForm(true);
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: { firstName?: string; phone?: string } = {};
    if (!formData.firstName.trim() || formData.firstName.trim().length < 2) {
      errors.firstName = "نام باید حداقل ۲ کاراکتر باشد";
    }
    if (!formData.phone.trim()) {
      errors.phone = "شماره تماس الزامی است";
    } else if (!validatePhone(formData.phone)) {
      errors.phone = "فرمت شماره تماس معتبر نیست (مثال: 09123456789)";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePhone(formData.phone);
      
      // Store identity in sessionStorage
      sessionStorage.setItem("afran_invitee_first_name", formData.firstName.trim());
      if (formData.lastName.trim()) {
        sessionStorage.setItem("afran_invitee_last_name", formData.lastName.trim());
      }
      sessionStorage.setItem("afran_invitee_phone", normalizedPhone);
      sessionStorage.setItem("afran_compare_token", token!);
      sessionStorage.setItem(`afran_invited_identity_done_${token}`, "1");
      sessionStorage.setItem(`afran_invited_identity_${token}`, JSON.stringify({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim() || undefined,
        phone: normalizedPhone,
      }));

      // Navigate to quiz
      navigate(`/quiz?compare=${token}`);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("[CompareInvitePage] Error submitting identity:", err);
      }
      setFormErrors({ phone: "خطا در ثبت اطلاعات" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-foreground/80">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isExpired = error === "invalid or expired link" || error.includes("expired");
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-xl text-foreground font-medium">لینک نامعتبر یا منقضی شده</h1>
          <p className="text-sm text-foreground/70">
            {isExpired
              ? "این لینک منقضی شده است. لطفاً دوباره لینک دعوت بسازید."
              : error}
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            بازگشت به صفحه اصلی
          </Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Compute inviter display name
  const inviterName = (() => {
    if (session.inviterFirstName) {
      const fullName = [session.inviterFirstName, session.inviterLastName].filter(Boolean).join(" ").trim();
      return fullName || session.inviterFirstName;
    }
    return "شریک مقایسه‌ات";
  })();

  if (import.meta.env.DEV) {
    console.log("[CompareInvitePage] Computed inviter display name:", {
      inviterFirstName: session.inviterFirstName,
      inviterLastName: session.inviterLastName,
      computedName: inviterName,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-2xl text-foreground font-medium">ذهن ما کنار هم</h1>
          <p className="text-sm text-foreground/70">
            {inviterName} تو رو دعوت کرده به تکمیل این آزمون تا ببینی ذهن‌تون چقدر شبیه یا متفاوته.
          </p>
        </div>

        {session.status === "pending" && !showIdentityForm && (
          <Button
            onClick={handleStartQuiz}
            size="lg"
            className="rounded-2xl min-h-[48px] px-8"
          >
            شروع آزمون برای تکمیل مقایسه
          </Button>
        )}

        {showIdentityForm && (
          <form onSubmit={handleIdentitySubmit} className="space-y-4 mt-6 max-w-sm mx-auto">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-right">
                نام <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="مثال: علی"
                className="text-right"
                disabled={isSubmitting}
                autoFocus
              />
              {formErrors.firstName && (
                <p className="text-xs text-destructive text-right">{formErrors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-right">
                نام خانوادگی (اختیاری)
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="مثال: احمدی"
                className="text-right"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-right">
                شماره تماس <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="مثال: 09123456789"
                className="text-right"
                disabled={isSubmitting}
              />
              {formErrors.phone && (
                <p className="text-xs text-destructive text-right">{formErrors.phone}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? "در حال ثبت..." : "شروع آزمون"}
              </Button>
            </div>
          </form>
        )}

        {/* Dev Panel */}
        {import.meta.env.DEV && session && (
          <div className="fixed bottom-4 left-4 bg-black/90 text-white text-xs p-4 rounded-lg font-mono max-w-sm z-50 border border-white/20 max-h-96 overflow-auto">
            <div className="font-bold mb-2 text-yellow-400">Compare Invite Dev Panel</div>
            <div className="space-y-1">
              <div>
                <span className="text-gray-400">Token:</span>{" "}
                {token ? token.substring(0, 12) + "..." : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Status:</span> {session.status || "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Attempt A:</span>{" "}
                {session.attemptAId
                  ? session.attemptAId.substring(0, 8) + "..."
                  : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Attempt B:</span>{" "}
                {session.attemptBId
                  ? session.attemptBId.substring(0, 8) + "..."
                  : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Expires At:</span>{" "}
                {session.expiresAt
                  ? new Date(session.expiresAt).toISOString()
                  : "NULL"}
              </div>
              <div>
                <span className="text-gray-400">Now:</span>{" "}
                {new Date().toISOString()}
              </div>
              <div>
                <span className="text-gray-400">Is Valid:</span>{" "}
                <span className={(() => {
                  if (!session.expiresAt) return "text-green-400";
                  const expiresAt = new Date(session.expiresAt);
                  const now = new Date();
                  return expiresAt > now ? "text-green-400" : "text-red-400";
                })()}>
                  {(() => {
                    if (!session.expiresAt) return "YES (no expiration)";
                    const expiresAt = new Date(session.expiresAt);
                    const now = new Date();
                    return expiresAt > now ? "YES" : "NO (expired)";
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
