import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import type { CompareSession } from "@/features/compare/getCompareSession";
import { storeInviteToken } from "@/features/compare/getInviteToken";

export default function CompareInvitePage() {
  const { token: tokenParam } = useParams<{ token: string }>();
  // Trim token to prevent whitespace issues
  const token = tokenParam?.trim() || null;
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

    // Debug log in dev
    if (import.meta.env.DEV) {
      console.log("[CompareInvitePage] Token received:", { 
        raw: tokenParam, 
        trimmed: token, 
        length: token.length 
      });
    }

    // Store token in sessionStorage using dedicated key (only set in invite route)
    // This ensures token persists through quiz flow and is not overwritten by person A
    storeInviteToken(token);

    if (import.meta.env.DEV) {
      console.log("[CompareInvitePage] Loading session for token:", token);
    }

    // Fetch token info using RPC (validates token exists and checks expiry)
    const loadSession = async () => {
      try {
        // Call RPC directly to get token info
        const trimmedToken = token.trim();
        
        // Debug: Log token and RPC call
        console.log("[CompareInvitePage] Token from URL:", {
          tokenParam,
          trimmed: trimmedToken,
          length: trimmedToken.length,
        });

        // Get payload using the ONLY correct RPC
        const { data, error } = await supabase.rpc('get_compare_payload_by_token', {
          p_invite_token: trimmedToken
        });

        // Debug: Log RPC response
        console.log("[CompareInvitePage] RPC response:", {
          hasError: !!error,
          errorCode: error?.code,
          errorMessage: error?.message,
          hasData: !!data,
          dataLength: Array.isArray(data) ? data.length : null,
          data: data,
        });

        if (error) {
          console.error("[CompareInvitePage] RPC error:", error);
          setError("خطا در بررسی لینک");
          setLoading(false);
          return;
        }

        if (!data || (Array.isArray(data) && data.length === 0)) {
          console.log("[CompareInvitePage] Token not found:", trimmedToken);
          setError("لینک نامعتبر است");
          setLoading(false);
          return;
        }

        const payload = Array.isArray(data) ? data[0] : data;

        // Check expiry using getTime() for accurate comparison
        // Handle parse failures gracefully (show "خطا در بارگذاری" not "منقضی")
        let isExpired = false;
        let expiresAtMs: number | null = null;
        const nowMs = Date.now();
        
        if (payload.expires_at) {
          const parsedExpiresAt = Date.parse(payload.expires_at);
          if (isNaN(parsedExpiresAt)) {
            // Parse failure - log and show error, don't treat as expired
            if (import.meta.env.DEV) {
              console.error("[CompareInvitePage] ❌ Failed to parse expires_at:", {
                token: trimmedToken,
                raw_expires_at: payload.expires_at,
                parsedExpiresAt,
                status: payload.status,
                RPC_error: null,
              });
            }
            setError("خطا در بارگذاری");
            setLoading(false);
            return;
          }
          expiresAtMs = parsedExpiresAt;
          isExpired = expiresAtMs <= nowMs;
        }

        if (import.meta.env.DEV) {
          console.log("[CompareInvitePage] 🔍 Token validation:", {
            token: trimmedToken.substring(0, 12) + "...",
            raw_expires_at: payload.expires_at,
            parsedExpiresAtMs: expiresAtMs,
            nowMs,
            status: payload.status,
            computedExpired: isExpired,
            RPC_error: null,
          });
        }

        if (isExpired) {
          if (import.meta.env.DEV) {
            console.log("[CompareInvitePage] Token expired:", {
              token: trimmedToken,
              expires_at: payload.expires_at,
              expiresAtMs,
              nowMs,
              now: new Date(nowMs).toISOString(),
            });
          }
          setError("لینک منقضی شده است");
          setLoading(false);
          return;
        }

        // Get inviter name from attempt_a (ALWAYS the inviter)
        const attemptA = payload.attempt_a;
        const inviterFirstName = attemptA?.first_name || null;
        const inviterLastName = attemptA?.last_name || null;
        const inviterNameParts = [inviterFirstName, inviterLastName].filter(Boolean);
        const inviterDisplayName = inviterNameParts.length > 0 
          ? inviterNameParts.join(" ").trim() 
          : "یک نفر";

        // Construct session data from payload
        const sessionData: CompareSession = {
          id: payload.session_id || payload.invite_token || trimmedToken,
          attemptAId: payload.attempt_a_id || (attemptA ? "unknown" : null),
          attemptBId: payload.attempt_b_id || null,
          status: payload.status === "completed" ? "completed" : "pending",
          createdAt: new Date().toISOString(),
          expiresAt: payload.expires_at,
          inviterFirstName: inviterFirstName,
          inviterLastName: inviterLastName,
        };

        // Store inviter display name for UI
        (sessionData as any).inviterDisplayName = inviterDisplayName;

        setSession(sessionData);

        if (import.meta.env.DEV) {
          console.log("[CompareInvitePage] Session loaded:", {
            id: sessionData.id,
            status: sessionData.status,
            attemptAId: sessionData.attemptAId?.substring(0, 8) + "..." || "null",
            attemptBId: sessionData.attemptBId?.substring(0, 8) + "..." || "null",
            expiresAt: sessionData.expiresAt,
            inviterFirstName: sessionData.inviterFirstName,
            inviterLastName: sessionData.inviterLastName,
            inviterDisplayName: inviterDisplayName,
            source: "attempt_a from get_compare_payload_by_token",
          });
          
          // DEV warning if session valid but name missing
          if (!attemptA && payload.status === 'pending' && !isExpired) {
            console.warn("[CompareInvitePage] ⚠️ Session valid but attempt_a is null");
          }
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
    if (!token) {
      setError("Token not available");
      return;
    }
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
      // Token is already stored via storeInviteToken() in useEffect
      sessionStorage.setItem(`afran_invited_identity_done_${token}`, "1");
      sessionStorage.setItem(`afran_invited_identity_${token}`, JSON.stringify({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim() || undefined,
        phone: normalizedPhone,
      }));

      // Navigate to quiz with token in query param (explicit and debuggable)
      // Token is already stored in sessionStorage via storeInviteToken()
      const trimmedToken = token.trim();
      navigate(`/quiz?invite=${trimmedToken}`);
      
      if (import.meta.env.DEV) {
        console.log("[CompareInvitePage] Navigating to quiz with invite token:", {
          token: trimmedToken,
          url: `/quiz?invite=${trimmedToken}`,
          storedInStorage: true,
        });
      }
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
    const isExpired = error === "این لینک منقضی شده است" || error.includes("منقضی");
    const isInvalid = error === "لینک نامعتبر است" || error.includes("نامعتبر");
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-xl text-foreground font-medium">
            {isExpired ? "این لینک منقضی شده است" : isInvalid ? "لینک نامعتبر است" : error}
          </h1>
          <p className="text-sm text-foreground/70">
            {isExpired
              ? "این لینک منقضی شده است. لطفاً دوباره لینک دعوت بسازید."
              : isInvalid
              ? "لینک نامعتبر است. لطفاً لینک صحیح را بررسی کنید."
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

  // Compute inviter display name from session (built from attempt_a in loadSession)
  // Single source of truth: attempt_a from get_compare_payload_by_token
  const inviterName = (session as any).inviterDisplayName || "یک نفر";

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
            {inviterName} تورو دعوت کرده به تکمیل این آزمون تا ببینی ذهن‌تون چقدر شبیه یا متفاوته.
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
