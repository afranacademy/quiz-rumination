import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Copy, Share2, Download, RefreshCw, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "@/features/share/shareClient";
import { buildCompareCardPayload } from "@/domain/compare/payload";
import { buildCompareShareText } from "@/features/compare/buildCompareShareText";
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

// RPC response type for get_compare_attempts_by_token
type CompareAttemptsRPCResponse = {
  session_id: string;
  status: string;
  invite_token: string;
  attempt_a_id: string;
  attempt_b_id: string | null;
  a_total_score: number | null;
  a_dimension_scores: Record<DimensionKey, number> | null;
  a_score_band_id: number | null;
  b_total_score: number | null;
  b_dimension_scores: Record<DimensionKey, number> | null;
  b_score_band_id: number | null;
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

// Dimension interpretation texts (safe, non-diagnostic)
const DIMENSION_INTERPRETATIONS: Record<DimensionKey, string> = {
  stickiness:
    "چسبندگی فکری به میزان تمایل ذهن برای ماندن روی یک فکر، حتی پس از پایان موقعیت مربوط می‌شود. در روابط انسانی، این بُعد تعیین می‌کند آیا فرد می‌تواند از یک موضوع عبور کند یا آن را در تعامل‌های بعدی نیز با خود حمل می‌کند.",
  pastBrooding:
    "گذشته‌محوری به گرایش ذهن برای بازگشت مکرر به اشتباه‌ها، گفتگوها یا موقعیت‌های قبلی اشاره دارد. در روابط، این بُعد بر نحوه‌ی پردازش تعارض‌ها و خاطرات مشترک اثر می‌گذارد.",
  futureWorry:
    "آینده‌نگری به میزان درگیری ذهن با پیش‌بینی، احتمال‌سنجی و تلاش برای کنترل اتفاق‌های پیش‌رو مربوط است. در روابط انسانی، این بُعد نقش مهمی در واکنش به ابهام و نااطمینانی دارد.",
  interpersonal:
    "حساسیت بین‌فردی به میزان توجه ذهن به نشانه‌های رفتاری، پیام‌ها و تغییرات ظریف در تعامل با دیگران اشاره دارد. در روابط، این بُعد بر نحوه‌ی تفسیر رفتار طرف مقابل اثر می‌گذارد.",
};

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

  for (const key of dimensionKeys) {
    const aScore = attemptA.dimension_scores[key];
    const bScore = attemptB.dimension_scores[key];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CompareSession | null>(null);
  const [attemptA, setAttemptA] = useState<AttemptData | null>(null);
  const [attemptB, setAttemptB] = useState<AttemptData | null>(null);
  const [bandA, setBandA] = useState<ScoreBand | null>(null);
  const [bandB, setBandB] = useState<ScoreBand | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<DimensionKey | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxPollingTime = 60000; // 60 seconds
  const pollingInterval = 2000; // 2 seconds

  // Load compare attempts using RPC (bypasses RLS)
  const loadCompareAttempts = async (): Promise<CompareAttemptsRPCResponse | null> => {
    if (!token) return null;

    try {
      if (import.meta.env.DEV) {
        console.log("[CompareResultPage] Calling RPC get_compare_attempts_by_token with token:", token.substring(0, 12) + "...");
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_compare_attempts_by_token",
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
      let resultRow: CompareAttemptsRPCResponse | null = null;
      if (Array.isArray(rpcData)) {
        if (rpcData.length === 0) {
          if (import.meta.env.DEV) {
            console.log("[CompareResultPage] RPC returned empty array");
          }
          return null;
        }
        resultRow = rpcData[0] as CompareAttemptsRPCResponse;
      } else if (rpcData && typeof rpcData === "object") {
        resultRow = rpcData as CompareAttemptsRPCResponse;
      } else {
        if (import.meta.env.DEV) {
          console.error("[CompareResultPage] Invalid RPC response format:", rpcData);
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
        });
      }

      return resultRow;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("[CompareResultPage] Error calling RPC:", err);
      }
      return null;
    }
  };

  // Process RPC response and set state
  const processCompareData = (rpcData: CompareAttemptsRPCResponse) => {
    // Set session info
    setSession({
      id: rpcData.session_id,
      attemptAId: rpcData.attempt_a_id,
      attemptBId: rpcData.attempt_b_id,
      status: rpcData.status,
      createdAt: new Date().toISOString(), // RPC doesn't return this, use current time
      expiresAt: null, // RPC doesn't return this
    });

    // If pending or attempt_b_id is null, don't process attempts
    if (rpcData.status !== "completed" || !rpcData.attempt_b_id) {
      if (import.meta.env.DEV) {
        console.log("[CompareResultPage] Session not completed, skipping attempt processing");
      }
      return;
    }

    // Validate both attempts have scores
    if (
      rpcData.a_total_score === null ||
      rpcData.a_dimension_scores === null ||
      rpcData.b_total_score === null ||
      rpcData.b_dimension_scores === null
    ) {
      if (import.meta.env.DEV) {
        console.error("[CompareResultPage] Missing attempt scores in RPC response");
      }
      throw new Error("Attempt scores are missing");
    }

    // Build AttemptData objects (without user names - RPC doesn't return them)
    const attemptAData: AttemptData = {
      id: rpcData.attempt_a_id,
      user_first_name: "نفر اول", // Placeholder since RPC doesn't return names
      user_last_name: null,
      total_score: rpcData.a_total_score,
      dimension_scores: rpcData.a_dimension_scores as Record<DimensionKey, number>,
      score_band_id: rpcData.a_score_band_id,
      completed_at: new Date().toISOString(),
    };

    const attemptBData: AttemptData = {
      id: rpcData.attempt_b_id,
      user_first_name: "نفر دوم", // Placeholder since RPC doesn't return names
      user_last_name: null,
      total_score: rpcData.b_total_score,
      dimension_scores: rpcData.b_dimension_scores as Record<DimensionKey, number>,
      score_band_id: rpcData.b_score_band_id,
      completed_at: new Date().toISOString(),
    };

    setAttemptA(attemptAData);
    setAttemptB(attemptBData);

    // Fetch score bands for both attempts
    const bandIds = [rpcData.a_score_band_id, rpcData.b_score_band_id].filter(
      (id): id is number => id !== null && id !== undefined
    );

    if (bandIds.length > 0) {
      supabase
        .from("score_bands")
        .select("id, slug, title, min_score, max_score")
        .in("id", bandIds)
        .then(({ data: bandsData, error: bandsError }) => {
          if (!bandsError && bandsData) {
            const bandMap = new Map<number, ScoreBand>();
            bandsData.forEach((band) => {
              bandMap.set(band.id, {
                id: band.id,
                slug: band.slug,
                title: band.title,
                min_score: band.min_score,
                max_score: band.max_score,
              });
            });

            if (rpcData.a_score_band_id) {
              setBandA(bandMap.get(rpcData.a_score_band_id) || null);
            }
            if (rpcData.b_score_band_id) {
              setBandB(bandMap.get(rpcData.b_score_band_id) || null);
            }

            if (import.meta.env.DEV) {
              console.log("[CompareResultPage] Score bands loaded:", {
                bandA: bandMap.get(rpcData.a_score_band_id || 0),
                bandB: bandMap.get(rpcData.b_score_band_id || 0),
              });
            }
          }
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
      console.log("[CompareResultPage] Comparison built:", comparisonResult);
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
        console.log("[CompareResultPage] Loading compare attempts for token:", token.substring(0, 12) + "...");
      }

      const rpcData = await loadCompareAttempts();

      if (!rpcData) {
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] No data returned from RPC - link invalid or expired");
        }
        setError("لینک نامعتبر یا منقضی شده");
        setLoading(false);
        return;
      }

      // Check status
      if (rpcData.status === "pending" || !rpcData.attempt_b_id) {
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] Session is pending, starting polling");
        }
        setSession({
          id: rpcData.session_id,
          attemptAId: rpcData.attempt_a_id,
          attemptBId: rpcData.attempt_b_id,
          status: rpcData.status,
          createdAt: new Date().toISOString(),
          expiresAt: null,
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
        console.error("[CompareResultPage] Unexpected error:", err);
      }
      setError(err instanceof Error ? err.message : "Unknown error");
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
        const rpcData = await loadCompareAttempts();
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
          console.error("[CompareResultPage] Polling error:", err);
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
          <h1 className="text-xl text-foreground font-medium">خطا</h1>
          <p className="text-sm text-foreground/70">
            {error === "لینک نامعتبر یا منقضی شده"
              ? "این لینک معتبر نیست یا منقضی شده است."
              : error}
          </p>
        </div>
      </div>
    );
  }

  // Waiting state (pending) - friendly loading with auto-retry
  if (session && (session.status !== "completed" || !session.attemptBId)) {
    const elapsedSeconds = Math.floor((pollingCount * pollingInterval) / 1000);
    const remainingSeconds = Math.max(0, Math.floor((maxPollingTime - elapsedSeconds * 1000) / 1000));

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-xl text-foreground font-medium">منتظر تکمیل نفر دوم</h1>
            <p className="text-sm text-foreground/70">
              منتظریم تا آزمون دوم تکمیل بشه...
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

  if (!session || !attemptA || !attemptB || !comparison) {
    return null;
  }

  // Build Compare Card payload
  const cardPayload = buildCompareCardPayload(comparison);
  const nameA = `${attemptA.user_first_name} ${attemptA.user_last_name || ""}`.trim();
  const nameB = `${attemptB.user_first_name} ${attemptB.user_last_name || ""}`.trim();

  // Share handlers
  const handleCopyLink = async () => {
    try {
      const currentUrl = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] ✅ Link copied to clipboard:", currentUrl);
        }
        toast.success("لینک کپی شد");
      } else {
        const success = await copyText(currentUrl);
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] Link copy (fallback):", success ? "success" : "failed");
        }
        if (success) {
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

  const handleCopyText = async () => {
    try {
      const shareText = buildCompareShareText(cardPayload, nameA, nameB);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] ✅ Share text copied to clipboard");
        }
        toast.success("متن کپی شد");
      } else {
        const success = await copyText(shareText);
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] Share text copy (fallback):", success ? "success" : "failed");
        }
        if (success) {
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

  const handlePdf = () => {
    console.log("[CompareResultPage] PDF button clicked (stubbed)");
    toast.info("قابلیت PDF به زودی اضافه می‌شود");
  };

  // Course URL - TODO: Replace with actual course URL when available
  const COURSE_URL = "https://afran.academy/course/ذهن-وراج"; // TODO: Update with actual course URL

  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
  const similarDimensions = dimensionKeys.filter(
    (key) => comparison.dimensions[key].relation === "similar"
  );
  const differentDimensions = dimensionKeys.filter(
    (key) => comparison.dimensions[key].relation === "different"
  );

  return (
    <div className="min-h-screen p-4 py-8 bg-gradient-to-b from-background to-background/50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl text-foreground font-medium">ذهن ما کنار هم</h1>
          <p className="text-sm text-foreground/70">
            {nameA} و {nameB}
          </p>
        </div>

        {/* Main Compare Card */}
        <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-xl">مقایسه نتایج</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Two Columns: Person A and Person B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Person A */}
              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-white/10">
                  <h3 className="text-lg font-medium text-foreground mb-2">{nameA}</h3>
                  <div className="space-y-2">
                    {bandA && (
                      <div className="text-sm text-foreground/80">
                        <span className="font-medium">باند:</span> {bandA.title}
                      </div>
                    )}
                    <div className="text-sm text-foreground/80">
                      <span className="font-medium">امتیاز کل:</span> {attemptA.total_score} / 48
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground/90">ابعاد:</h4>
                  {dimensionKeys.map((key) => {
                    const dim = comparison.dimensions[key];
                    return (
                      <div
                        key={key}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => setSelectedDimension(key)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground/90">
                            {DIMENSION_LABELS[key]}
                          </span>
                          <span className="text-xs text-foreground/70">
                            {dim.aScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-xs text-foreground/60">
                          سطح: {LEVEL_LABELS[dim.aLevel]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Person B */}
              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-white/10">
                  <h3 className="text-lg font-medium text-foreground mb-2">{nameB}</h3>
                  <div className="space-y-2">
                    {bandB && (
                      <div className="text-sm text-foreground/80">
                        <span className="font-medium">باند:</span> {bandB.title}
                      </div>
                    )}
                    <div className="text-sm text-foreground/80">
                      <span className="font-medium">امتیاز کل:</span> {attemptB.total_score} / 48
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground/90">ابعاد:</h4>
                  {dimensionKeys.map((key) => {
                    const dim = comparison.dimensions[key];
                    return (
                      <div
                        key={key}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => setSelectedDimension(key)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground/90">
                            {DIMENSION_LABELS[key]}
                          </span>
                          <span className="text-xs text-foreground/70">
                            {dim.bScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-xs text-foreground/60">
                          سطح: {LEVEL_LABELS[dim.bLevel]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Delta Section */}
            <div className="mb-6 pt-6 border-t border-white/10">
              <h3 className="text-lg font-medium text-foreground mb-4">تفاوت‌ها و شباهت‌ها</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dimensionKeys.map((key) => {
                  const dim = comparison.dimensions[key];
                  const deltaLabel = getDeltaLabel(dim.delta, dim.aScore, dim.bScore);
                  return (
                    <div
                      key={key}
                      className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => setSelectedDimension(key)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground/90">
                          {DIMENSION_LABELS[key]}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            dim.relation === "similar"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-orange-500/20 text-orange-400"
                          }`}
                        >
                          {deltaLabel}
                        </span>
                      </div>
                      <div className="text-xs text-foreground/60">
                        {nameA}: {dim.aScore.toFixed(1)} | {nameB}: {dim.bScore.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Share Section */}
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-lg font-medium text-foreground mb-4">اشتراک‌گذاری</h3>
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
                  onClick={handleCopyText}
                  variant="outline"
                  className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
                >
                  <Copy className="w-4 h-4 ml-2" />
                  کپی متن مقایسه
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Three Smaller Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* شباهت کلی */}
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20">
            <CardHeader>
              <CardTitle className="text-base">شباهت کلی</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-2xl font-medium text-foreground mb-2">
                  {SIMILARITY_LABELS[comparison.summarySimilarity]}
                </p>
                <p className="text-xs text-foreground/70">
                  {similarDimensions.length} بعد مشابه از {dimensionKeys.length} بعد
                </p>
              </div>
            </CardContent>
          </Card>

          {/* تفاوت‌های اصلی */}
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20">
            <CardHeader>
              <CardTitle className="text-base">تفاوت‌های اصلی</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {differentDimensions.length > 0 ? (
                  differentDimensions.slice(0, 3).map((key) => (
                    <div key={key} className="text-sm text-foreground/80">
                      • {DIMENSION_LABELS[key]}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-foreground/60">تفاوت قابل‌توجهی وجود ندارد</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* پیشنهاد گفتگو */}
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20">
            <CardHeader>
              <CardTitle className="text-base">پیشنهاد گفتگو</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cardPayload.conversationStartersFa.slice(0, 2).map((starter, index) => (
                  <p key={index} className="text-sm text-foreground/80 leading-relaxed">
                    {starter}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course CTA Card */}
        <Card className="bg-primary/15 backdrop-blur-2xl border-primary/30 shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-xl">دوره صوتی ذهن‌وراج</CardTitle>
            <p className="text-center text-sm text-foreground/80 mt-2">
              کنترل نشخوار فکری و بازگشت آرامش و تمرکز
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ul className="space-y-3 text-sm text-foreground/90 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-primary/80 shrink-0 mt-1">•</span>
                  <span>
                    بر پایه‌ی مطالعات علمی در زمینه‌ی نشخوار فکری، فراشناخت و ذهن‌آگاهی طراحی شده
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary/80 shrink-0 mt-1">•</span>
                  <span>
                    شامل تمرین‌های عملی برای کنترل افکار تکراری و بازسازی آرامش ذهنی
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary/80 shrink-0 mt-1">•</span>
                  <span>
                    مناسب برای افرادی که می‌خواهند از چرخه‌ی نشخوار فکری خارج شوند و تمرکز خود را بازیابند
                  </span>
                </li>
              </ul>
              <Button
                onClick={() => window.open(COURSE_URL, "_blank")}
                className="w-full rounded-xl min-h-[48px] bg-primary/80 hover:bg-primary border-primary/40 text-base font-medium"
              >
                مشاهده و خرید
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dimension Detail Modal */}
        <Dialog open={selectedDimension !== null} onOpenChange={(open) => !open && setSelectedDimension(null)}>
          <DialogContent className="max-w-md">
            {selectedDimension && (
              <>
                <DialogHeader>
                  <DialogTitle>{DIMENSION_LABELS[selectedDimension]}</DialogTitle>
                  <DialogDescription>
                    مقایسه نتایج {nameA} و {nameB}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="text-xs text-foreground/60 mb-1">{nameA}</div>
                      <div className="text-lg font-medium text-foreground">
                        {comparison.dimensions[selectedDimension].aScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        سطح: {LEVEL_LABELS[comparison.dimensions[selectedDimension].aLevel]}
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="text-xs text-foreground/60 mb-1">{nameB}</div>
                      <div className="text-lg font-medium text-foreground">
                        {comparison.dimensions[selectedDimension].bScore.toFixed(1)}
                      </div>
                      <div className="text-xs text-foreground/60 mt-1">
                        سطح: {LEVEL_LABELS[comparison.dimensions[selectedDimension].bLevel]}
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {DIMENSION_INTERPRETATIONS[selectedDimension]}
                    </p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

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
                <span className="text-gray-400">Session ID:</span>{" "}
                {session.id ? session.id.substring(0, 8) + "..." : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Status:</span> {session.status || "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Attempt A ID:</span>{" "}
                {session.attemptAId ? session.attemptAId.substring(0, 8) + "..." : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Attempt B ID:</span>{" "}
                {session.attemptBId ? session.attemptBId.substring(0, 8) + "..." : "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Band A:</span> {bandA?.title || "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Band B:</span> {bandB?.title || "N/A"}
              </div>
              <div>
                <span className="text-gray-400">Session (raw):</span>
                <pre className="text-xs mt-1 overflow-auto max-h-32">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
              <div>
                <span className="text-gray-400">Attempt A (raw):</span>
                <pre className="text-xs mt-1 overflow-auto max-h-32">
                  {JSON.stringify(attemptA, null, 2)}
                </pre>
              </div>
              <div>
                <span className="text-gray-400">Attempt B (raw):</span>
                <pre className="text-xs mt-1 overflow-auto max-h-32">
                  {JSON.stringify(attemptB, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
