import { useNavigate, useSearchParams, useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ResultPage as ResultPageComponent } from "@/app/components/ResultPage";
import { getLevel } from "@/features/quiz/scoring/levelsAfranR14";
import { DevPanel } from "@/components/DevPanel";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { supabase } from "@/lib/supabaseClient";
import { completeAttempt } from "@/features/attempts/createAttempt";
import { calculateBand } from "@/features/attempts/calculateBand";
import { computeTotalScore, normalizeAnswers } from "@/domain/quiz/scoring";
import { computeDimensionScores } from "@/domain/quiz/dimensions";
import type { LevelKey } from "@/features/quiz/types";
import type { QuizIntake } from "@/features/quiz/types";
import { getLatestCompletedAttempt } from "@/features/compare/getLatestCompletedAttempt";

interface QuizResult {
  total: number;
  maxTotal: number;
  level: LevelKey;
  createdAt: string;
}

// DEV-ONLY: Preview mode mock scores
const PREVIEW_SCORES: Record<"low" | "medium" | "high", number> = {
  low: 10,
  medium: 26,
  high: 42,
};

// DEV-ONLY: Mock intake for preview
const MOCK_INTAKE = { firstName: "کاربر تست" };

export default function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ level?: string }>();
  const [searchParams] = useSearchParams();
  const { userId } = useAnonAuth();
  const [score, setScore] = useState<number | null>(null);
  const [level, setLevel] = useState<LevelKey | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [finalizationStatus, setFinalizationStatus] = useState<string | null>(null);
  const [completedAttemptData, setCompletedAttemptData] = useState<any | null>(null);
  const [attemptData, setAttemptData] = useState<{
    quiz_id: string;
    score_band_id: number | null;
    dimension_scores: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    console.log("[Feature3] Result page loaded", { path: location.pathname });
    // Load attempt ID from localStorage
    const stored = localStorage.getItem("afran_attempt_id");
    if (stored) {
      setAttemptId(stored);
      if (import.meta.env.DEV) {
        console.log("[ResultPage] ✅ Loaded attemptId from localStorage:", stored.substring(0, 8) + "...");
      }
    } else if (userId) {
      // Fallback: try to get latest completed attempt
      if (import.meta.env.DEV) {
        console.log("[ResultPage] ⚠️ attemptId not in localStorage, trying to fetch latest completed attempt...");
      }
      getLatestCompletedAttempt(userId).then((latestAttemptId) => {
        if (latestAttemptId) {
          setAttemptId(latestAttemptId);
          if (import.meta.env.DEV) {
            console.log("[ResultPage] ✅ Loaded attemptId from getLatestCompletedAttempt:", latestAttemptId.substring(0, 8) + "...");
          }
        } else {
          if (import.meta.env.DEV) {
            console.warn("[ResultPage] ⚠️ No attemptId found - tracking events will have null attempt_id");
          }
        }
      }).catch((error) => {
        if (import.meta.env.DEV) {
          console.warn("[ResultPage] Error fetching latest attempt:", error);
        }
      });
    } else {
      if (import.meta.env.DEV) {
        console.warn("[ResultPage] ⚠️ No attemptId and no userId - tracking events will have null attempt_id");
      }
    }
  }, [location.pathname, userId]);

  // Finalize attempt if needed (only in production mode, not preview)
  useEffect(() => {
    if (isPreviewMode || !attemptId) return;

    const finalizeIfNeeded = async () => {
      try {
        setFinalizationStatus("Finalizing attempt…");
        console.log("[ResultPage] Checking if attempt needs finalization:", attemptId);

        // Fetch attempt row by id only (no status filter)
        const { data: attempt, error: fetchError } = await supabase
          .from("attempts")
          .select("id, answers, total_score, status")
          .eq("id", attemptId)
          .maybeSingle();

        if (fetchError) {
          console.error("[ResultPage] Error fetching attempt:", {
            message: fetchError.message,
            code: fetchError.code,
          });
          setFinalizationStatus(`Error: ${fetchError.message}`);
          return;
        }

        if (!attempt) {
          console.warn("[ResultPage] Attempt not found:", attemptId);
          setFinalizationStatus("Attempt not found");
          return;
        }

        // Check if answers length is 12 AND total_score is null AND status is not completed
        const answers = attempt.answers as (number | null)[] | null;
        const hasAllAnswers = answers && Array.isArray(answers) && answers.length === 12 && 
          answers.every(a => a !== null && a !== undefined);
        const isAlreadyCompleted = attempt.status === "completed";
        const needsFinalization = hasAllAnswers && !isAlreadyCompleted && (attempt.total_score === null || attempt.total_score === undefined);

        if (!needsFinalization) {
          console.log("[ResultPage] Attempt does not need finalization:", {
            hasAllAnswers,
            total_score: attempt.total_score,
            status: attempt.status,
            isAlreadyCompleted,
          });
          if (isAlreadyCompleted) {
            setFinalizationStatus("Already finalized ✅");
          } else {
            setFinalizationStatus(null);
          }
          return;
        }

        console.log("[ResultPage] Attempt needs finalization, computing scores...");

        // Compute scores using existing domain logic
        const answersArray = answers as number[];
        const normalizedAnswers = normalizeAnswers(answersArray);
        const totalScore = computeTotalScore(normalizedAnswers);
        const dimensionScores = computeDimensionScores(normalizedAnswers);

        console.log("[ResultPage] Computed scores:", {
          totalScore,
          dimensionScores,
        });

        // Compute band id
        let scoreBandId: number | null = null;
        try {
          scoreBandId = await calculateBand(totalScore);
          console.log("[ResultPage] Score band ID:", scoreBandId || "null (no band found)");
        } catch (bandError) {
          console.error("[ResultPage] Error calculating band (non-blocking):", bandError);
          scoreBandId = null;
        }

        // Call completeAttempt automatically once
        const completedData = await completeAttempt({
          attemptId,
          totalScore,
          dimensionScores,
          scoreBandId,
        });

        // Store completed data for DevPanel
        setCompletedAttemptData(completedData);

        // Fetch full attempt to get quiz_id
        const { data: fullAttempt } = await supabase
          .from("attempts")
          .select("quiz_id, score_band_id, dimension_scores")
          .eq("id", attemptId)
          .maybeSingle();

        if (fullAttempt) {
          setAttemptData({
            quiz_id: fullAttempt.quiz_id,
            score_band_id: fullAttempt.score_band_id,
            dimension_scores: (fullAttempt.dimension_scores as Record<string, number>) || {},
          });
        }

        if (import.meta.env.DEV) {
          console.log("[ResultPage] ✅ Attempt finalized successfully");
        }
        setFinalizationStatus("Finalized ✅");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[ResultPage] Error finalizing attempt:", error);
        setFinalizationStatus(`Error: ${errorMsg}`);
      }
    };

    finalizeIfNeeded();
  }, [attemptId, isPreviewMode]);

  // Fetch attempt data for mind profile template (if not already fetched from finalization)
  useEffect(() => {
    if (isPreviewMode || !attemptId || attemptData) return;

    const fetchAttemptData = async () => {
      try {
        const { data: attempt, error } = await supabase
          .from("attempts")
          .select("quiz_id, score_band_id, dimension_scores, status")
          .eq("id", attemptId)
          .maybeSingle();

        if (error) {
          if (import.meta.env.DEV) {
            console.error("[ResultPage] Error fetching attempt data for mind profile:", error);
          }
          return;
        }

        // Only set if attempt is completed and has required data
        if (attempt && attempt.status === "completed" && attempt.quiz_id && attempt.dimension_scores) {
          setAttemptData({
            quiz_id: attempt.quiz_id,
            score_band_id: attempt.score_band_id,
            dimension_scores: (attempt.dimension_scores as Record<string, number>) || {},
          });
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[ResultPage] Error in fetchAttemptData:", error);
        }
      }
    };

    fetchAttemptData();
  }, [attemptId, isPreviewMode, attemptData]);

  useEffect(() => {
    // DEV-ONLY: Check for score query parameter (e.g., /result?score=28)
    const scoreParam = searchParams.get("score");
    if (scoreParam) {
      const scoreNum = parseInt(scoreParam, 10);
      if (!isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 48) {
        // Use score param to override displayed score for preview
        setScore(scoreNum);
        // Determine level from score for display
        setLevel(getLevel(scoreNum));
        setFirstName(MOCK_INTAKE.firstName);
        setIsPreviewMode(true);
        return;
      }
    }

    // DEV-ONLY: Check for route param first (e.g., /result/low)
    const routeLevel = params.level;
    if (routeLevel && (routeLevel === "low" || routeLevel === "medium" || routeLevel === "high")) {
      // Preview mode via route: use mock data
      const mockScore = PREVIEW_SCORES[routeLevel];
      setScore(mockScore);
      setLevel(routeLevel);
      setFirstName(MOCK_INTAKE.firstName);
      setIsPreviewMode(true);
      return;
    }

    // DEV-ONLY: Check for preview query parameter (e.g., /result?preview=low)
    const previewParam = searchParams.get("preview");
    if (previewParam && (previewParam === "low" || previewParam === "medium" || previewParam === "high")) {
      // Preview mode via query: use mock data
      const mockScore = PREVIEW_SCORES[previewParam];
      setScore(mockScore);
      setLevel(previewParam);
      setFirstName(MOCK_INTAKE.firstName);
      setIsPreviewMode(true);
      return;
    }

    // Production mode: read from sessionStorage
    setIsPreviewMode(false);
    try {
      const resultData = sessionStorage.getItem("quiz_result_v1");
      if (resultData) {
        const parsed = JSON.parse(resultData) as QuizResult;
        if (parsed.total !== undefined && parsed.level && parsed.maxTotal === 48) {
          setScore(parsed.total);
          setLevel(parsed.level);
        }
      }

      const intakeData = sessionStorage.getItem("quiz_intake_v1");
      if (intakeData) {
        const parsed = JSON.parse(intakeData) as QuizIntake;
        if (parsed.firstName) {
          setFirstName(parsed.firstName);
        }
      }
    } catch (error) {
      console.error("Failed to read from sessionStorage:", error);
    }
  }, [params, searchParams]);

  const handleRetake = () => {
    sessionStorage.removeItem("quiz_result_v1");
    navigate("/");
  };

  if (score === null || level === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">نتیجه‌ای برای نمایش پیدا نشد.</p>
          <button
            onClick={handleRetake}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ResultPageComponent 
        score={score} 
        level={level} 
        firstName={firstName} 
        onRetake={handleRetake} 
        isPreviewMode={isPreviewMode}
        attemptData={attemptData}
        attemptId={attemptId}
      />
      {import.meta.env.DEV && <DevPanel attemptId={attemptId} participantId={userId} finalizationStatus={finalizationStatus} completedAttemptData={completedAttemptData} />}
    </>
  );
}
