import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { RefreshCw, Link as LinkIcon, Copy } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/features/share/shareClient";
import { computeSimilarity } from "@/features/compare/computeSimilarity";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { trackShareEvent } from "@/lib/trackShareEvent";
import {
  DIMENSION_DEFINITIONS,
  getAlignmentLabel,
  getLargestDifferenceDimension,
  generateCentralInterpretation,
  generateNeutralBlendedInterpretation,
  getContextualTriggers,
  CONVERSATION_STARTERS,
  SAFETY_STATEMENT,
  getDimensionNameForSnapshot,
  shouldShowCTA,
  generateSafeShareText,
} from "@/features/compare/relationalContent";
import type { DimensionKey } from "@/domain/quiz/types";
import { levelOfDimension } from "@/domain/quiz/dimensions";
import type { Comparison } from "@/domain/compare/types";

type CompareSession = {
  id: string;
  attemptAId: string;
  attemptBId: string | null;
  status: string;
  createdAt: string;
  expiresAt: string | null;
};

type AttemptData = {
  id: string;
  user_first_name: string;
  user_last_name: string | null;
  total_score: number;
  dimension_scores: Record<DimensionKey, number>;
  score_band_id: number | null;
  completed_at: string;
};

// RPC response type for get_compare_payload_by_token
// This RPC returns all data needed to render the compare card, bypassing RLS
type ComparePayloadRPCResponse = {
  session_id: string;
  status: string;
  invite_token: string;
  attempt_a_id: string;
  attempt_b_id: string | null;
  expires_at: string | null;
  a_total_score: number | null;
  a_dimension_scores: Record<DimensionKey, number> | null;
  a_score_band_id: number | null;
  a_score_band_title: string | null;
  b_total_score: number | null;
  b_dimension_scores: Record<DimensionKey, number> | null;
  b_score_band_id: number | null;
  b_score_band_title: string | null;
};

type ScoreBand = {
  id: number;
  slug: string;
  title: string;
  min_score: number;
  max_score: number;
};

type DimensionComparison = {
  aScore: number;
  bScore: number;
  delta: number;
  relation: "similar" | "different";
  aLevel: "low" | "medium" | "high";
  bLevel: "low" | "medium" | "high";
};

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  stickiness: "چسبندگی فکری",
  pastBrooding: "نشخوار گذشته",
  futureWorry: "نگرانی آینده",
  interpersonal: "حساسیت بین‌فردی",
};

const SIMILARITY_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "شباهت کم",
  medium: "شباهت متوسط",
  high: "شباهت زیاد",
};

const LEVEL_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};


/**
 * Safely parses dimension_scores from various formats (string, object, null).
 * Returns a Record with defaults (0) for missing dimensions.
 */
function parseDimensionScores(
  raw: unknown,
  context: string
): Record<DimensionKey, number> {
  const defaults: Record<DimensionKey, number> = {
    stickiness: 0,
    pastBrooding: 0,
    futureWorry: 0,
    interpersonal: 0,
  };

  if (raw === null || raw === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[parseDimensionScores] ${context}: raw is null/undefined, using defaults`);
    }
    return defaults;
  }

  let parsed: Record<string, unknown>;
  
  // If it's a string, try to parse it
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error(`[parseDimensionScores] ${context}: Failed to parse string:`, e);
      }
      return defaults;
    }
  } else if (typeof raw === "object") {
    parsed = raw as Record<string, unknown>;
  } else {
    if (import.meta.env.DEV) {
      console.warn(`[parseDimensionScores] ${context}: Unexpected type:`, typeof raw);
    }
    return defaults;
  }

  // Safely extract each dimension with defaults
  const result: Record<DimensionKey, number> = {
    stickiness: typeof parsed.stickiness === "number" ? parsed.stickiness : defaults.stickiness,
    pastBrooding: typeof parsed.pastBrooding === "number" ? parsed.pastBrooding : defaults.pastBrooding,
    futureWorry: typeof parsed.futureWorry === "number" ? parsed.futureWorry : defaults.futureWorry,
    interpersonal: typeof parsed.interpersonal === "number" ? parsed.interpersonal : defaults.interpersonal,
  };

  if (import.meta.env.DEV) {
    const missing = Object.entries(result).filter(([key, val]) => val === defaults[key as DimensionKey]);
    if (missing.length > 0) {
      console.warn(`[parseDimensionScores] ${context}: Missing dimensions, using defaults:`, missing.map(([k]) => k));
    }
  }

  return result;
}

/**
 * Builds a comparison from dimension scores of two attempts.
 */
function buildComparison(
  attemptA: AttemptData,
  attemptB: AttemptData
): Comparison {
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];

  const dimensions: Record<DimensionKey, DimensionComparison> = {} as Record<
    DimensionKey,
    DimensionComparison
  >;
  let similarCount = 0;

  // Safely access dimension scores with defaults
  const aDims = attemptA.dimension_scores ?? {};
  const bDims = attemptB.dimension_scores ?? {};

  for (const key of dimensionKeys) {
    // Use safe access with defaults
    const aScore = (aDims[key] ?? 0) as number;
    const bScore = (bDims[key] ?? 0) as number;
    const delta = Math.round(Math.abs(aScore - bScore) * 10) / 10;
    const relation = delta < 0.8 ? "similar" : "different";

    if (relation === "similar") {
      similarCount++;
    }

    dimensions[key] = {
      aScore,
      bScore,
      delta,
      relation,
      aLevel: levelOfDimension(aScore),
      bLevel: levelOfDimension(bScore),
    };
  }

  let summarySimilarity: "low" | "medium" | "high";
  if (similarCount <= 1) {
    summarySimilarity = "low";
  } else if (similarCount === 2) {
    summarySimilarity = "medium";
  } else {
    summarySimilarity = "high";
  }

  return {
    summarySimilarity,
    dimensions,
  };
}

/**
 * Gets delta label (بیشتر/کمتر/نزدیک)
 */
function getDeltaLabel(delta: number, aScore: number, bScore: number): string {
  if (delta < 0.8) {
    return "نزدیک";
  }
  if (bScore > aScore) {
    return "بیشتر";
  }
  return "کمتر";
}

export default function CompareResultPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { userId } = useAnonAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CompareSession | null>(null);
  const [attemptA, setAttemptA] = useState<AttemptData | null>(null);
  const [attemptB, setAttemptB] = useState<AttemptData | null>(null);
  const [bandA, setBandA] = useState<ScoreBand | null>(null);
  const [bandB, setBandB] = useState<ScoreBand | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxPollingTime = 60000; // 60 seconds
  const pollingInterval = 2000; // 2 seconds

  // Load compare payload using RPC (bypasses RLS)
  const loadComparePayload = async (): Promise<ComparePayloadRPCResponse | null> => {
    if (!token) return null;

      try {
        if (import.meta.env.DEV) {
        console.log("[CompareResultPage] 🔵 Calling RPC get_compare_payload_by_token");
        console.log("[CompareResultPage] RPC Payload:", { p_token: token.substring(0, 12) + "..." });
        }

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_compare_payload_by_token",
          { p_token: token }
        );

      if (rpcError) {
          if (import.meta.env.DEV) {
          console.error("[CompareResultPage] ❌ RPC Error:", {
            code: rpcError.code,
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
          });
        }
        return null;
      }

      // Handle both array and single object responses
      let resultRow: ComparePayloadRPCResponse | null = null;
      if (Array.isArray(rpcData)) {
        if (rpcData.length === 0) {
          if (import.meta.env.DEV) {
            console.log("[CompareResultPage] RPC returned empty array - no session found");
          }
          return null;
        }
        resultRow = rpcData[0] as ComparePayloadRPCResponse;
      } else if (rpcData && typeof rpcData === "object") {
        resultRow = rpcData as ComparePayloadRPCResponse;
      } else {
        if (import.meta.env.DEV) {
          console.error("[CompareResultPage] ❌ Invalid RPC response format:", rpcData);
        }
        return null;
      }

      if (import.meta.env.DEV) {
        console.log("[CompareResultPage] ✅ RPC Response:", {
          session_id: resultRow.session_id,
          status: resultRow.status,
          attempt_a_id: resultRow.attempt_a_id,
          attempt_b_id: resultRow.attempt_b_id,
          a_total_score: resultRow.a_total_score,
          b_total_score: resultRow.b_total_score,
          a_score_band_title: resultRow.a_score_band_title,
          b_score_band_title: resultRow.b_score_band_title,
        });
      }

      return resultRow;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ Error calling RPC:", err);
      }
      return null;
    }
  };

  // Process RPC response and set state
  const processCompareData = (rpcData: ComparePayloadRPCResponse) => {
    // Set session info
    setSession({
      id: rpcData.session_id,
      attemptAId: rpcData.attempt_a_id,
      attemptBId: rpcData.attempt_b_id,
      status: rpcData.status,
      createdAt: new Date().toISOString(),
      expiresAt: rpcData.expires_at || null,
    });

          if (import.meta.env.DEV) {
      console.log("[CompareResultPage] Processing compare data:", {
        token: token ? token.substring(0, 12) + "..." : "N/A",
        session_status: rpcData.status,
        expires_at: rpcData.expires_at,
        attempt_a_id: rpcData.attempt_a_id?.substring(0, 8) + "...",
        attempt_b_id: rpcData.attempt_b_id?.substring(0, 8) + "..." || "null",
        a_total_score: rpcData.a_total_score,
        b_total_score: rpcData.b_total_score,
        a_dimension_scores_present: rpcData.a_dimension_scores !== null && rpcData.a_dimension_scores !== undefined,
        b_dimension_scores_present: rpcData.b_dimension_scores !== null && rpcData.b_dimension_scores !== undefined,
      });
    }

    // If pending or attempt_b_id is null, don't process attempts
    if (rpcData.status !== "completed" || !rpcData.attempt_b_id) {
      if (import.meta.env.DEV) {
        console.log("[CompareResultPage] Session not completed, skipping attempt processing");
      }
          return;
        }

    // Validate both attempts have total scores (dimension_scores can be null, we'll handle it)
    if (rpcData.a_total_score === null || rpcData.b_total_score === null) {
          if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ Missing total scores in RPC response:", {
          a_total_score: rpcData.a_total_score,
          b_total_score: rpcData.b_total_score,
        });
      }
      setError("بخشی از اطلاعات کامل ذخیره نشده، برای همین بعضی قسمت‌ها نمایش داده نمی‌شن.");
          setLoading(false);
          return;
        }

    // Safely parse dimension scores (handle null, string, or object)
    const aDims = parseDimensionScores(rpcData.a_dimension_scores, "Attempt A");
    const bDims = parseDimensionScores(rpcData.b_dimension_scores, "Attempt B");

    // Build AttemptData objects (without user names - RPC doesn't return them)
    const attemptAData: AttemptData = {
      id: rpcData.attempt_a_id,
      user_first_name: "نفر اول",
      user_last_name: null,
      total_score: rpcData.a_total_score,
      dimension_scores: aDims,
      score_band_id: rpcData.a_score_band_id,
      completed_at: new Date().toISOString(),
    };

    const attemptBData: AttemptData = {
      id: rpcData.attempt_b_id,
      user_first_name: "نفر دوم",
      user_last_name: null,
      total_score: rpcData.b_total_score,
      dimension_scores: bDims,
      score_band_id: rpcData.b_score_band_id,
      completed_at: new Date().toISOString(),
    };

    setAttemptA(attemptAData);
    setAttemptB(attemptBData);

    // Set score bands from RPC response (no need to query score_bands table)
    if (rpcData.a_score_band_title && rpcData.a_score_band_id) {
      setBandA({
        id: rpcData.a_score_band_id,
        slug: "", // RPC doesn't return slug, but we don't need it
        title: rpcData.a_score_band_title,
        min_score: 0, // RPC doesn't return these, but we don't need them
        max_score: 0,
      });
    }

    if (rpcData.b_score_band_title && rpcData.b_score_band_id) {
      setBandB({
        id: rpcData.b_score_band_id,
        slug: "", // RPC doesn't return slug, but we don't need it
        title: rpcData.b_score_band_title,
        min_score: 0, // RPC doesn't return these, but we don't need them
        max_score: 0,
      });
    }

    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] Score bands from RPC:", {
        bandA: rpcData.a_score_band_title,
        bandB: rpcData.b_score_band_title,
      });
    }

    // Build comparison
    const builtComparison = buildComparison(attemptAData, attemptBData);
        const comparisonResult: Comparison = {
      id: `compare-${rpcData.attempt_a_id}-${rpcData.attempt_b_id}`,
          createdAt: new Date().toISOString(),
      attemptAId: rpcData.attempt_a_id,
      attemptBId: rpcData.attempt_b_id,
          summarySimilarity: builtComparison.summarySimilarity,
          dimensions: builtComparison.dimensions,
        };
        setComparison(comparisonResult);

        if (import.meta.env.DEV) {
      console.log("[CompareResultPage] ✅ Comparison built:", comparisonResult);
      console.log("[CompareResultPage] Attempt A:", attemptAData);
      console.log("[CompareResultPage] Attempt B:", attemptBData);
    }
  };

  // Main load function
  const loadCompareResult = async () => {
    if (!token) {
      setError("Token not provided");
      setLoading(false);
      return;
    }

    try {
      if (import.meta.env.DEV) {
        console.log("[CompareResultPage] 🔵 Loading compare payload for token:", token.substring(0, 12) + "...");
      }

      const rpcData = await loadComparePayload();

      if (!rpcData) {
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] ⚠️ No data returned from RPC - link invalid or expired");
          console.log("[CompareResultPage] Token:", token ? token.substring(0, 12) + "..." : "N/A");
        }
        setError("این لینک معتبر نیست یا منقضی شده است. لطفاً لینک جدید بسازید.");
        setLoading(false);
        return;
      }

      // Check if session is expired (expires_at exists and is in the past)
      // STATE C: If expired but data exists, still show comparison with soft note
      if (rpcData.expires_at) {
        const expiresAt = new Date(rpcData.expires_at);
        const now = new Date();
        if (expiresAt <= now) {
          if (import.meta.env.DEV) {
            console.log("[CompareResultPage] ⚠️ Session expired but data exists:", {
              expires_at: rpcData.expires_at,
              now: now.toISOString(),
              status: rpcData.status,
              attempt_b_id: rpcData.attempt_b_id,
            });
          }
          // If completed, still show comparison with expired note
          if (rpcData.status === "completed" && rpcData.attempt_b_id) {
            setIsExpired(true);
            // Continue to process data
          } else {
            // If not completed, treat as invalid
            setError("این لینک معتبر نیست یا منقضی شده است.");
          setLoading(false);
          return;
          }
        }
        }

      // Check status - if pending or attempt_b_id is null, show pending UI
      if (rpcData.status === "pending" || !rpcData.attempt_b_id) {
          if (import.meta.env.DEV) {
          console.log("[CompareResultPage] ⏳ Session is pending, starting polling");
        }
        setSession({
          id: rpcData.session_id,
          attemptAId: rpcData.attempt_a_id,
          attemptBId: rpcData.attempt_b_id,
          status: rpcData.status,
          createdAt: new Date().toISOString(),
          expiresAt: rpcData.expires_at || null,
        });
          setLoading(false);
        startPolling();
          return;
        }

      // Process completed session
      processCompareData(rpcData);
        setLoading(false);
      } catch (err) {
        if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ Unexpected error:", err);
      }
      // Don't treat this as expired - show a clear dev error
      if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ Unexpected error details:", {
          error: err,
          token: token ? token.substring(0, 12) + "..." : "N/A",
        });
      }
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError("یه مشکلی پیش اومده و این مقایسه الان در دسترس نیست. اگه دوباره امتحانش کنی یا لینک جدید بسازی، درست می‌شه.");
        setLoading(false);
      }
    };

  // Polling function
  const startPolling = () => {
    if (!token) return;

    const startTime = Date.now();
    setPollingCount(0);

    const poll = async () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxPollingTime) {
        stopPolling();
          if (import.meta.env.DEV) {
          console.log("[CompareResultPage] Polling timeout reached");
        }
          return;
        }

      setPollingCount((prev) => prev + 1);

      try {
        const rpcData = await loadComparePayload();
        if (rpcData && rpcData.status === "completed" && rpcData.attempt_b_id) {
          stopPolling();
          processCompareData(rpcData);
          setLoading(false);

        if (import.meta.env.DEV) {
            console.log("[CompareResultPage] ✅ Session completed, data loaded");
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[CompareResultPage] ❌ Polling error:", err);
        }
      }
    };

    // Poll immediately
    poll();

    // Then poll every interval
    pollingIntervalRef.current = setInterval(poll, pollingInterval);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleRefresh = () => {
    stopPolling();
    setLoading(true);
    setError(null);
    loadCompareResult();
  };

  useEffect(() => {
    loadCompareResult();

    return () => {
      stopPolling();
    };
  }, [token]);

  if (loading && !session) {
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
          <h1 className="text-xl text-foreground font-medium">مشکل در بارگذاری</h1>
          <p className="text-sm text-foreground/70 leading-relaxed">
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Waiting state (pending) - friendly loading with auto-retry
  if (session && (session.status !== "completed" || !session.attemptBId)) {
    const elapsedSeconds = Math.floor((pollingCount * pollingInterval) / 1000);
    const remainingSeconds = Math.max(0, Math.floor((maxPollingTime - elapsedSeconds * 1000) / 1000));
    const hasTimedOut = elapsedSeconds * 1000 >= maxPollingTime;

    if (hasTimedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-xl text-foreground font-medium">منتظر تکمیل نفر دوم</h1>
          <p className="text-sm text-foreground/70">
              منتظر نفر دوم…
          </p>
            <Button onClick={handleRefresh} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 ml-2" />
              رفرش دستی
            </Button>
        </div>
      </div>
    );
  }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-xl text-foreground font-medium">منتظر تکمیل نفر دوم</h1>
            <p className="text-sm text-foreground/70">
              منتظر نفر دوم…
            </p>
            <p className="text-xs text-foreground/60 mt-2">
              این صفحه به‌صورت خودکار به‌روزرسانی می‌شه
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-xs text-foreground/60">
              {remainingSeconds > 0 ? `${remainingSeconds} ثانیه باقی مانده` : "در حال بررسی..."}
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-xs text-foreground/60">در حال بررسی...</span>
            </div>
            <Button onClick={handleRefresh} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 ml-2" />
              رفرش دستی
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error: Session completed but attempts missing
  if (session && session.status === "completed" && session.attemptBId && (!attemptA || !attemptB || !comparison)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-xl text-foreground font-medium">مشکل در بارگذاری</h1>
          <p className="text-sm text-foreground/70 leading-relaxed">
            یه مشکلی پیش اومده و این مقایسه الان در دسترس نیست.
            <br />
            اگه دوباره امتحانش کنی یا لینک جدید بسازی، درست می‌شه.
          </p>
          {import.meta.env.DEV && (
            <div className="text-xs text-foreground/60 font-mono p-4 bg-black/20 rounded-lg text-left space-y-2">
              <div><strong>Session:</strong> {JSON.stringify(session, null, 2)}</div>
              <div><strong>Attempt A:</strong> {attemptA ? "loaded" : "missing"}</div>
              <div><strong>Attempt B:</strong> {attemptB ? "loaded" : "missing"}</div>
              <div><strong>Comparison:</strong> {comparison ? "loaded" : "missing"}</div>
              <div><strong>Error:</strong> This is a DEV error - RPC returned completed session but missing attempt data</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STATE A: Only attempt A exists (pending state)
  // Show this if: session exists, status is pending, and attemptB is missing
  if (session && session.status === "pending" && (!session.attemptBId || !attemptB || !comparison)) {
    const nameA = attemptA?.user_first_name || "شما";
    const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
    
    const handleCreateInvite = async () => {
      if (!userId) {
        toast.error("لطفاً ابتدا وارد شوید");
        return;
      }
      
      // Try to get attempt A ID from session or attemptA
      let attemptAId = session.attemptAId;
      if (!attemptAId && attemptA) {
        attemptAId = attemptA.id;
      }
      
      // If still no attemptAId, try to get latest completed attempt
      if (!attemptAId) {
        try {
          const latestAttemptId = await getLatestCompletedAttempt(userId);
          if (latestAttemptId) {
            attemptAId = latestAttemptId;
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error("[CompareResultPage] Error getting latest attempt:", err);
          }
        }
      }
      
      if (!attemptAId) {
        toast.error("اطلاعات آزمون یافت نشد");
        return;
      }
      
      setIsCreatingInvite(true);
      try {
        const result = await createCompareInvite(attemptAId, 10080);
        navigate(`/compare/invite/${result.invite_token}`);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[CompareResultPage] Error creating invite:", err);
        }
        toast.error("خطا در ساخت لینک دعوت");
      } finally {
        setIsCreatingInvite(false);
      }
    };
    
    return (
      <div className="min-h-screen p-4 py-8 bg-gradient-to-b from-background to-background/50">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* SECTION 1: HEADER */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl text-foreground font-medium">
              ذهن ما کنار هم
            </h1>
            <p className="text-sm sm:text-base text-foreground/70 font-light">
              برای فهم بهتر تفاوت‌ها، نه قضاوت
            </p>
            <div className="flex items-center justify-center gap-2 text-base text-foreground/80 mt-4">
              <span>{nameA}</span>
              <span className="text-foreground/50">×</span>
              <span>نفر مقابل</span>
            </div>
          </div>

          {/* Explanation */}
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-base text-foreground/90 leading-relaxed">
                برای دیدن مقایسه، نفر دوم باید آزمون را انجام دهد
              </p>
              <Button
                onClick={handleCreateInvite}
                disabled={isCreatingInvite}
                className="rounded-xl min-h-[48px] px-8 bg-primary/80 hover:bg-primary"
              >
                {isCreatingInvite ? "در حال ساخت..." : "ساخت لینک دعوت"}
              </Button>
            </CardContent>
          </Card>

          {/* Blurred 4-dimension preview */}
          <div className="space-y-4 opacity-50 blur-sm pointer-events-none">
            <h2 className="text-xl text-foreground font-medium text-center mb-4">نقشه‌ی ذهنی</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dimensionKeys.map((key) => (
                <Card key={key} className="bg-white/10 backdrop-blur-2xl border-white/20">
                  <CardContent className="pt-6 space-y-3">
                    <h3 className="text-base font-medium text-foreground">
                      {DIMENSION_LABELS[key]}
                    </h3>
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      {DIMENSION_DEFINITIONS[key]}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE B: Both attempts exist - render full page
  if (!session || !attemptA || !attemptB || !comparison) {
    return null;
  }

  const nameA = attemptA.user_first_name || "شما";
  const nameB = attemptB.user_first_name || "نفر مقابل";

  // Compute similarity from dimension deltas
  const dimensionDeltas: Record<DimensionKey, number> = {
    stickiness: comparison.dimensions.stickiness.delta,
    pastBrooding: comparison.dimensions.pastBrooding.delta,
    futureWorry: comparison.dimensions.futureWorry.delta,
    interpersonal: comparison.dimensions.interpersonal.delta,
  };
  const overallSimilarity = computeSimilarity(dimensionDeltas);

  // Get largest difference dimension for central interpretation (with fallback)
  const largestDiff = getLargestDifferenceDimension({
    stickiness: {
      ...comparison.dimensions.stickiness,
      aLevel: comparison.dimensions.stickiness.aLevel,
      bLevel: comparison.dimensions.stickiness.bLevel,
    },
    pastBrooding: {
      ...comparison.dimensions.pastBrooding,
      aLevel: comparison.dimensions.pastBrooding.aLevel,
      bLevel: comparison.dimensions.pastBrooding.bLevel,
    },
    futureWorry: {
      ...comparison.dimensions.futureWorry,
      aLevel: comparison.dimensions.futureWorry.aLevel,
      bLevel: comparison.dimensions.futureWorry.bLevel,
    },
    interpersonal: {
      ...comparison.dimensions.interpersonal,
      aLevel: comparison.dimensions.interpersonal.aLevel,
      bLevel: comparison.dimensions.interpersonal.bLevel,
    },
  });
  
  // Check if CTA should be shown
  const showCTA = shouldShowCTA({
    stickiness: {
      aLevel: comparison.dimensions.stickiness.aLevel,
      bLevel: comparison.dimensions.stickiness.bLevel,
    },
    pastBrooding: {
      aLevel: comparison.dimensions.pastBrooding.aLevel,
      bLevel: comparison.dimensions.pastBrooding.bLevel,
    },
    futureWorry: {
      aLevel: comparison.dimensions.futureWorry.aLevel,
      bLevel: comparison.dimensions.futureWorry.bLevel,
    },
    interpersonal: {
      aLevel: comparison.dimensions.interpersonal.aLevel,
      bLevel: comparison.dimensions.interpersonal.bLevel,
    },
  });
  
  // All dimensions for the mental map
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];

  // Share handlers
  const handleCopyLink = async () => {
    try {
      const currentUrl = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] ✅ Link copied to clipboard:", currentUrl);
        }
        // Track copy_link action
        await trackShareEvent({
          cardType: "compare_minds",
          action: "copy_link",
          compareSessionId: session?.id ?? null,
          inviteToken: token ?? null,
        });
        toast.success("لینک کپی شد");
    } else {
        const success = await copyText(currentUrl);
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] Link copy (fallback):", success ? "success" : "failed");
        }
        if (success) {
          // Track copy_link action
          await trackShareEvent({
            cardType: "compare_minds",
            action: "copy_link",
            compareSessionId: session?.id ?? null,
            inviteToken: token ?? null,
          });
          toast.success("لینک کپی شد");
    } else {
          toast.error("خطا در کپی لینک");
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ Error copying link:", error);
      }
      toast.error("خطا در کپی لینک");
    }
  };


  // Build share text (pattern-based, no numbers, safe to forward)
  const buildShareText = (): string => {
    return generateSafeShareText(
      nameA,
      nameB,
      overallSimilarity,
      largestDiff?.key || null
    );
  };

  const handleCopyShareText = async () => {
    try {
      const shareText = buildShareText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] ✅ Share text copied to clipboard");
        }
        // Track share_text action
        await trackShareEvent({
          cardType: "compare_minds",
          action: "share_text",
          compareSessionId: session?.id ?? null,
          inviteToken: token ?? null,
        });
        toast.success("متن کپی شد");
      } else {
        const success = await copyText(shareText);
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] Share text copy (fallback):", success ? "success" : "failed");
        }
        if (success) {
          // Track share_text action
          await trackShareEvent({
            cardType: "compare_minds",
            action: "share_text",
            compareSessionId: session?.id ?? null,
            inviteToken: token ?? null,
          });
          toast.success("متن کپی شد");
    } else {
          toast.error("خطا در کپی متن");
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ Error copying share text:", error);
      }
      toast.error("خطا در کپی متن");
    }
  };

  // Course URL
  const COURSE_URL = "https://afran.academy/course/ذهن-وراج";

  return (
    <div className="min-h-screen p-4 py-8 bg-gradient-to-b from-background to-background/50">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* STATE C: Expired link note (if applicable) */}
        {isExpired && (
          <Card className="bg-orange-500/10 backdrop-blur-2xl border-orange-500/20">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-foreground/80 leading-relaxed">
                این لینک منقضی شده، اما نتیجه برای مشاهده ذخیره شده است.
              </p>
            </CardContent>
          </Card>
        )}

        {/* SECTION 1: HEADER (Identity & Safety) */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl text-foreground font-medium">
            ذهن ما کنار هم
          </h1>
          <p className="text-sm sm:text-base text-foreground/70 font-light">
            برای فهم بهتر تفاوت‌ها، نه قضاوت
          </p>
          <div className="flex items-center justify-center gap-2 text-base text-foreground/80 mt-4">
            <span>{nameA}</span>
            <span className="text-foreground/50">×</span>
            <span>{nameB}</span>
          </div>
          </div>

        {/* SECTION 2: SNAPSHOT (3-Second Understanding) */}
        <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
          <CardContent className="pt-6 space-y-4">
            {/* Overall Similarity Chip */}
            <div className="text-center">
              <span className="inline-block px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-sm font-medium text-foreground">
                شباهت کلی: {SIMILARITY_LABELS[overallSimilarity]}
              </span>
          </div>

            {/* One Complementary Sentence */}
            {largestDiff && (
              <p className="text-center text-base text-foreground/90 leading-relaxed">
                بزرگ‌ترین تفاوت ذهنی شما در {getDimensionNameForSnapshot(largestDiff.key)} است.
              </p>
            )}
          </CardContent>
        </Card>

        {/* SECTION 3: 4-DIMENSION MENTAL MAP */}
        <div className="space-y-4">
          <h2 className="text-xl text-foreground font-medium text-center mb-4">نقشه‌ی ذهنی</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dimensionKeys.map((key) => {
              const dim = comparison.dimensions[key];
              const alignment = getAlignmentLabel(dim.delta);
              
              return (
                <Card key={key} className="bg-white/10 backdrop-blur-2xl border-white/20">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-medium text-foreground">
                        {DIMENSION_LABELS[key]}
                      </h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                        alignment === "همسو" 
                        ? "bg-green-500/20 text-green-400"
                          : alignment === "متفاوت"
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-red-500/20 text-red-400"
                    }`}>
                        {alignment}
                    </span>
                  </div>
                    
                    <p className="text-xs text-foreground/70 leading-relaxed">
                      {DIMENSION_DEFINITIONS[key]}
                    </p>
                    
                    <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-foreground/60">{nameA}:</span>{" "}
                        <span className="text-foreground/90">{LEVEL_LABELS[dim.aLevel]}</span>
                </div>
                      <div>
                        <span className="text-foreground/60">{nameB}:</span>{" "}
                        <span className="text-foreground/90">{LEVEL_LABELS[dim.bLevel]}</span>
            </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: CENTRAL HUMAN INTERPRETATION */}
        {largestDiff ? (
          <Card className="bg-primary/10 backdrop-blur-2xl border-primary/20 shadow-xl">
            <CardContent className="pt-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line text-center">
                  {generateCentralInterpretation(
                    largestDiff.key,
                    nameA,
                    nameB,
                    largestDiff.aLevel,
                    largestDiff.bLevel,
                    largestDiff.aScore,
                    largestDiff.bScore
                  )}
                  </p>
                </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-primary/10 backdrop-blur-2xl border-primary/20 shadow-xl">
            <CardContent className="pt-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line text-center">
                  {generateNeutralBlendedInterpretation()}
                </p>
            </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 5: RELATIONAL IMPACT */}
        {largestDiff && (
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-center text-xl">این تفاوت‌ها معمولاً اینجا فعال می‌شوند</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contextual Triggers */}
              <div>
                <ul className="space-y-2">
                  {getContextualTriggers(largestDiff.key).map((trigger, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-primary/80 shrink-0 mt-1">•</span>
                      <span>{trigger}</span>
                </li>
              ))}
            </ul>
          </div>

              {/* Two-Column Meaning Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <h4 className="text-sm font-medium text-red-300 mb-2">اگر دیده نشود</h4>
                  <ul className="space-y-1 text-xs text-foreground/80">
                    <li>• سوءبرداشت</li>
                    <li>• دلخوری</li>
                    <li>• فاصله‌ی ذهنی</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <h4 className="text-sm font-medium text-green-300 mb-2">اگر دیده شود</h4>
                  <ul className="space-y-1 text-xs text-foreground/80">
                    <li>• درک متقابل</li>
                    <li>• گفت‌وگوی شفاف‌تر</li>
                    <li>• تنظیم بهتر رابطه</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 6: CONVERSATION STARTERS */}
        <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-xl">برای شروع گفتگو</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CONVERSATION_STARTERS.map((starter, index) => (
              <div key={index} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-sm text-foreground/90 leading-relaxed">{starter}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SECTION 7: SAFETY STATEMENT (Always Render, Distinct Box) */}
        <Card className="bg-blue-500/10 backdrop-blur-2xl border-blue-500/20 shadow-xl">
          <CardContent className="pt-6">
            <p className="text-xs text-foreground/80 leading-relaxed text-center whitespace-pre-line">
              {SAFETY_STATEMENT}
            </p>
          </CardContent>
        </Card>

        {/* Share & Copy Section */}
        <Card className="bg-white/5 backdrop-blur-2xl border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
            <Button
                onClick={handleCopyLink}
              variant="outline"
              className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
            >
                <LinkIcon className="w-4 h-4 ml-2" />
                کپی لینک مقایسه
            </Button>
            <Button
                onClick={handleCopyShareText}
              variant="outline"
              className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
            >
              <Copy className="w-4 h-4 ml-2" />
                اشتراک متن آماده
            </Button>
            </div>
          </CardContent>
        </Card>

        {/* Soft CTA Section (only if at least one dimension is MEDIUM or HIGH) */}
        {showCTA ? (
          <Card className="bg-primary/10 backdrop-blur-2xl border-primary/20 shadow-xl">
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-foreground/90 leading-relaxed text-center">
                اگر حس می‌کنی ذهنت زیاد درگیر می‌شود،
                <br />
                دوره‌ی ذهن وراج دقیقاً برای همین الگو طراحی شده…
              </p>
            <Button
                onClick={() => window.open(COURSE_URL, "_blank")}
              variant="outline"
                className="w-full rounded-xl min-h-[48px] bg-primary/20 border-primary/30 hover:bg-primary/30"
            >
                دوره صوتی ذهن وراج
            </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/5 backdrop-blur-2xl border-white/10">
            <CardContent className="pt-6">
              <p className="text-sm text-foreground/70 leading-relaxed text-center">
                اگر دوست داشتید، می‌توانید درباره‌ی الگوهای ذهنی بیشتر بدانید.
              </p>
            </CardContent>
          </Card>
        )}


        {/* Dev Panel */}
        {import.meta.env.DEV && (
          <div className="fixed bottom-4 left-4 bg-black/90 text-white text-xs p-4 rounded-lg font-mono max-w-md z-50 border border-white/20 max-h-96 overflow-auto">
            <div className="font-bold mb-2 text-yellow-400">Compare Result Dev Panel</div>
            <div className="space-y-2">
              <div>
                <span className="text-gray-400">Token:</span>{" "}
                {token ? token.substring(0, 12) + "..." : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Session Status:</span> {session?.status || "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Attempt A ID:</span>{" "}
                {session?.attemptAId ? session.attemptAId.substring(0, 8) + "..." : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Attempt B ID:</span>{" "}
                {session?.attemptBId ? session.attemptBId.substring(0, 8) + "..." : "N/A"}
              </div>
              {session?.expiresAt && (
                <>
              <div>
                    <span className="text-gray-400">Expires At:</span>{" "}
                    {new Date(session.expiresAt).toISOString()}
              </div>
              <div>
                    <span className="text-gray-400">Now:</span>{" "}
                    {new Date().toISOString()}
              </div>
                  <div>
                    <span className="text-gray-400">Is Valid:</span>{" "}
                    <span className={(() => {
                      const expiresAt = new Date(session.expiresAt);
                      const now = new Date();
                      return expiresAt > now ? "text-green-400" : "text-red-400";
                    })()}>
                      {(() => {
                        const expiresAt = new Date(session.expiresAt);
                        const now = new Date();
                        return expiresAt > now ? "YES" : "NO (expired)";
                      })()}
                    </span>
            </div>
                </>
              )}
              {!session?.expiresAt && (
                <div>
                  <span className="text-gray-400">Expires At:</span>{" "}
                  <span className="text-green-400">NULL (no expiration)</span>
          </div>
        )}
              <div>
                <span className="text-gray-400">A Total:</span> {attemptA?.total_score ?? "N/A"}
              </div>
              <div>
                <span className="text-gray-400">B Total:</span> {attemptB?.total_score ?? "N/A"}
              </div>
              <div>
                <span className="text-gray-400">A Dims:</span>{" "}
                {attemptA?.dimension_scores
                  ? JSON.stringify(attemptA.dimension_scores)
                  : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">B Dims:</span>{" "}
                {attemptB?.dimension_scores
                  ? JSON.stringify(attemptB.dimension_scores)
                  : "N/A"}
              </div>
              {error && (
                <div>
                  <span className="text-red-400">Error:</span> {error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
