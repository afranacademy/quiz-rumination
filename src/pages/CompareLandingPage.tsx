import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getCompareSession } from "@/features/compare/getCompareSession";
import { Button } from "@/app/components/ui/button";
import type { CompareSession } from "@/features/compare/getCompareSession";

export default function CompareLandingPage() {
  const { token: tokenFromPath } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get("token");
  // Support both /compare/:token (path param) and /compare?token=... (query param)
  const token = tokenFromPath || tokenFromQuery;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CompareSession | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token not provided");
      setLoading(false);
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log("[CompareLandingPage] Token detected:", {
        fromPath: !!tokenFromPath,
        fromQuery: !!tokenFromQuery,
        token: token.substring(0, 12) + "...",
      });
    }

    // Store token in sessionStorage so it persists across navigation to /quiz and /result
    sessionStorage.setItem("afran_compare_token", token);
    
    if (import.meta.env.DEV) {
      console.log("[CompareLandingPage] Token stored in sessionStorage:", token.substring(0, 12) + "...");
    }

    const loadSession = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log("[CompareLandingPage] Validating token:", token);
        }

        // Fetch session using service function (uses RPC internally)
        const sessionData = await getCompareSession(token);

        if (!sessionData) {
          if (import.meta.env.DEV) {
            console.log("[CompareLandingPage] No valid session found or expired");
          }
          setError("invalid or expired link");
          setLoading(false);
          return;
        }

        setSession(sessionData);

        if (import.meta.env.DEV) {
          console.log("[CompareLandingPage] Session loaded:", {
            id: sessionData.id,
            status: sessionData.status,
            attemptAId: sessionData.attemptAId?.substring(0, 8) + "...",
            attemptBId: sessionData.attemptBId?.substring(0, 8) + "..." || "null",
            expiresAt: sessionData.expiresAt,
          });
        }

        setLoading(false);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[CompareLandingPage] Unexpected error:", err);
          if (err instanceof Error && err.message.includes("406")) {
            console.error("[CompareLandingPage] ⚠️ 406 error detected - this may indicate .single() was used or query matched 0 rows");
          }
        }
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    loadSession();
  }, [token]);

  const handleStartQuiz = () => {
    if (!token) return;
    // Navigate to quiz with compare token in query param
    navigate(`/quiz?compare=${token}`);
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
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-xl text-foreground font-medium">لینک نامعتبر یا منقضی شده</h1>
          <p className="text-sm text-foreground/70">
            {error === "invalid or expired link"
              ? "این لینک معتبر نیست یا منقضی شده است."
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        {session.attemptBId === null ? (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl text-foreground font-medium">ذهن ما کنار هم</h1>
              <p className="text-sm text-foreground/70">
                لطفاً آزمون را انجام دهید
              </p>
            </div>
            <Button
              onClick={handleStartQuiz}
              size="lg"
              className="rounded-2xl min-h-[48px] px-8"
            >
              شروع آزمون
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <h1 className="text-xl text-foreground font-medium">توکن معتبر است</h1>
            <p className="text-sm text-foreground/70">
              مقایسه تکمیل شده است.
            </p>
            <Button
              onClick={() => navigate(`/compare/result/${token}`)}
              size="lg"
              className="rounded-2xl min-h-[48px] px-8 mt-4"
            >
              مشاهده نتیجه مقایسه
            </Button>
          </div>
        )}

        {/* Dev Panel */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 left-4 bg-black/90 text-white text-xs p-4 rounded-lg font-mono max-w-sm z-50 border border-white/20">
            <div className="font-bold mb-2 text-yellow-400">Compare Landing Dev Panel</div>
            <div className="space-y-1">
              <div>
                <span className="text-gray-400">Token:</span>{" "}
                {token ? token.substring(0, 12) + "..." : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Session ID:</span>{" "}
                {session.id ? session.id.substring(0, 8) + "..." : "N/A"}
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
                  : "null"}
              </div>
              <div>
                <span className="text-gray-400">Expires:</span>{" "}
                {session.expiresAt
                  ? new Date(session.expiresAt).toLocaleString("fa-IR")
                  : "Never"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

