import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QuizPage as QuizPageComponent } from "@/app/components/QuizPage";
import { scoreAfranR14 } from "@/features/quiz/scoring/scoreAfranR14";
import { getLevel } from "@/features/quiz/scoring/levelsAfranR14";
import { calculateBand } from "@/features/attempts/calculateBand";
import { updateAttemptAnswers, completeAttempt, markAttemptAbandoned } from "@/features/attempts/createAttempt";
import { computeTotalScore, normalizeAnswers } from "@/domain/quiz/scoring";
import { computeDimensionScores } from "@/domain/quiz/dimensions";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { completeSession } from "@/api/compare";
import { completeCompareSession } from "@/features/compare/completeCompareSession";
import { supabase } from "@/lib/supabaseClient";
import type { LikertValue, LevelKey } from "@/features/quiz/types";

export default function QuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  // Support multiple token patterns: /quiz?compare=... or /compare?token=... (from URL) or sessionStorage
  const compareTokenFromUrl = searchParams.get("compare") || searchParams.get("token");
  const compareTokenFromStorage = sessionStorage.getItem("afran_compare_token");
  const compareToken = compareTokenFromUrl || compareTokenFromStorage;
  
  // If token is in URL but not in sessionStorage, store it
  if (compareTokenFromUrl && compareTokenFromUrl !== compareTokenFromStorage) {
    sessionStorage.setItem("afran_compare_token", compareTokenFromUrl);
    if (import.meta.env.DEV) {
      console.log("[QuizPage] Token from URL stored in sessionStorage:", compareTokenFromUrl.substring(0, 12) + "...");
    }
  }
  
  if (import.meta.env.DEV && compareToken) {
    console.log("[QuizPage] Compare token detected:", {
      fromUrl: !!compareTokenFromUrl,
      fromStorage: !!compareTokenFromStorage,
      token: compareToken.substring(0, 12) + "...",
    });
  }
  
  const { userId, loading: authLoading } = useAnonAuth();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const answersRef = useRef<Record<number, LikertValue>>({});
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastOperationError, setLastOperationError] = useState<string | null>(null);
  const abandonedAttemptsRef = useRef<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isCompletingRef = useRef<boolean>(false);

  // Load attempt ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("afran_attempt_id");
    if (stored) {
      setAttemptId(stored);
      console.log("[QuizPage] Loaded attempt ID from localStorage:", stored);
    } else {
      console.error("[QuizPage] No attempt ID found in localStorage");
      navigate("/");
    }
  }, [navigate]);

  // Handle page visibility change and beforeunload for abandon
  useEffect(() => {
    if (!attemptId) return;

    const calculateLastQuestionIndex = (): number => {
      // Find the highest question index that has been answered
      let lastIndex = 0;
      for (let i = 1; i <= 12; i++) {
        if (answersRef.current[i] !== undefined) {
          lastIndex = i - 1; // 0-indexed
        }
      }
      return lastIndex;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !abandonedAttemptsRef.current.has(attemptId)) {
        // User left the page mid-quiz
        const lastQuestionIndex = calculateLastQuestionIndex();
        abandonedAttemptsRef.current.add(attemptId);
        markAttemptAbandoned(attemptId, lastQuestionIndex).catch((err) => {
          console.error("[QuizPage] Failed to abandon attempt on visibility change:", err);
        });
      }
    };

    const handleBeforeUnload = () => {
      if (!abandonedAttemptsRef.current.has(attemptId)) {
        // Best-effort abandon (may not complete due to navigation)
        const lastQuestionIndex = calculateLastQuestionIndex();
        abandonedAttemptsRef.current.add(attemptId);
        markAttemptAbandoned(attemptId, lastQuestionIndex).catch(() => {
          // Ignore errors on beforeunload
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [attemptId]);

  // Debounced update function
  const debouncedUpdate = (answers: Record<number, LikertValue>) => {
    if (!attemptId) return;

    // Clear previous timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Set new timeout
    updateTimeoutRef.current = setTimeout(() => {
      // Convert answers to array (use null for unanswered)
      const answersArray: (number | null)[] = [];
      let lastQuestionIndex = 0;
      for (let i = 1; i <= 12; i++) {
        if (answers[i] !== undefined) {
          answersArray.push(answers[i]);
          lastQuestionIndex = i - 1; // 0-indexed
        } else {
          answersArray.push(null);
        }
      }

      // Update attempt in Supabase
      updateAttemptAnswers({
        attemptId,
        answers: answersArray,
        lastQuestionIndex,
      })
        .then(() => {
          setLastOperationError(null);
        })
        .catch((error) => {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          console.error("[QuizPage] Failed to update attempt answers:", error);
          setLastOperationError(errorMsg);
        });
    }, 500); // 500ms debounce
  };

  const handleComplete = async (quizAnswers: Record<number, LikertValue>) => {
    // Prevent double-submit using ref (prevents race conditions)
    if (isCompletingRef.current || isSubmitting) {
      if (import.meta.env.DEV) {
        console.log("[QuizPage] Already submitting, ignoring duplicate submit");
      }
      return;
    }

    // Generate unique request ID for dev tracking
    const requestId = import.meta.env.DEV ? `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
    if (import.meta.env.DEV && requestId) {
      console.log(`[QuizPage] [${requestId}] Starting completion flow`);
    }

    // Set guard immediately (before any async calls)
    isCompletingRef.current = true;

    // Validate attemptId exists
    const currentAttemptId = attemptId || localStorage.getItem("afran_attempt_id");
    
    if (!currentAttemptId) {
      const errorMsg = "[QuizPage] CRITICAL: No attempt ID found in state or localStorage";
      console.error(errorMsg);
      if (import.meta.env.DEV) {
        alert(`DEV ERROR: ${errorMsg}. Cannot complete attempt.`);
      }
      // Unlock before navigating (graceful degradation)
      isCompletingRef.current = false;
      setIsSubmitting(false);
      // Still navigate to result (graceful degradation)
      navigate("/result");
      return;
    }

    // Set submitting flag
    setIsSubmitting(true);
    if (import.meta.env.DEV && requestId) {
      console.log(`[QuizPage] [${requestId}] Starting completion for attempt:`, currentAttemptId);
    }

    try {
      // Convert answers to array format (ensure all 12 answers)
      const answersArray: LikertValue[] = [];
      for (let i = 1; i <= 12; i++) {
        const answer = quizAnswers[i];
        if (answer === undefined || answer === null) {
          console.warn(`[QuizPage] Missing answer for question ${i}, using 0`);
          answersArray.push(0);
        } else {
          answersArray.push(answer);
        }
      }

      // Store raw answers for mind pattern feature
      sessionStorage.setItem("quiz_answers_v1", JSON.stringify(answersArray));

      // Calculate scores using domain functions
      const normalizedAnswers = normalizeAnswers(answersArray);
      const totalScore = computeTotalScore(normalizedAnswers);
      const dimensionScores = computeDimensionScores(normalizedAnswers);

      // Calculate level for result page
      const breakdown = scoreAfranR14(quizAnswers);
      const level = getLevel(breakdown.total);
      const result = {
        total: breakdown.total,
        maxTotal: 48,
        level: level as LevelKey,
        createdAt: new Date().toISOString(),
      };
      sessionStorage.setItem("quiz_result_v1", JSON.stringify(result));

      // Get score_band_id (may be null - that's OK)
      let scoreBandId: number | null = null;
      try {
        scoreBandId = await calculateBand(totalScore);
      } catch (bandError) {
        if (import.meta.env.DEV) {
        console.error("[QuizPage] Error calculating band (non-blocking):", bandError);
        }
        scoreBandId = null;
      }

      const completedData = await completeAttempt({
        attemptId: currentAttemptId,
        totalScore,
        dimensionScores,
        scoreBandId,
      });

      if (import.meta.env.DEV && requestId) {
        console.log(`[QuizPage] [${requestId}] ✅ Attempt completed successfully:`, currentAttemptId);
        console.log(`[QuizPage] [${requestId}] Completed attempt data:`, completedData);
      }
      setLastOperationError(null);

      // Clean up localStorage and in-memory state after successful completion
      localStorage.removeItem("afran_attempt_id");
      setAttemptId(null);
      // DO NOT unlock on success - keep lock until navigation completes

      // ============================================
      // CRITICAL: Re-read token LIVE on completion
      // ============================================
      // Read token from URLSearchParams (live, not from render-time state)
      const currentSearchParams = new URLSearchParams(window.location.search);
      const liveTokenFromUrl = currentSearchParams.get("compare") || currentSearchParams.get("token");
      
      // Read token from sessionStorage (live, not from render-time state)
      const liveTokenFromStorage = sessionStorage.getItem("afran_compare_token");
      
      // Determine live compare token
      const liveCompareToken = liveTokenFromUrl || liveTokenFromStorage;
      
      if (import.meta.env.DEV && requestId) {
        console.log(`[QuizPage] [${requestId}] 🔍 Live token check:`, {
          fromUrl: !!liveTokenFromUrl,
          fromStorage: !!liveTokenFromStorage,
          token: liveCompareToken ? liveCompareToken.substring(0, 12) + "..." : null,
        });
      }

      // ============================================
      // CRITICAL: Handle compare flow if token exists
      // ============================================
      if (liveCompareToken) {
        const rpcPayload = {
          p_token: liveCompareToken,
          p_attempt_b_id: currentAttemptId,
        };
        
        if (import.meta.env.DEV && requestId) {
          console.log(`[QuizPage] [${requestId}] 🎯 Compare token detected - completing session:`, {
            token: liveCompareToken.substring(0, 12) + "...",
            attemptBId: currentAttemptId,
            rpcPayload,
          });
        }
        
        try {
          // Call RPC directly using supabase client
          const { data: rpcData, error: rpcError } = await supabase.rpc("complete_compare_session", rpcPayload);
          
          if (rpcError) {
            // RPC FAILED - DO NOT navigate, DO NOT fall back
            const errorMsg = rpcError.message || "Unknown RPC error";
            if (import.meta.env.DEV && requestId) {
              console.error(`[QuizPage] [${requestId}] ❌ RPC FAILED:`, {
                rpcPayload,
                error: {
                  code: rpcError.code,
                  message: rpcError.message,
                  details: rpcError.details,
                  hint: rpcError.hint,
                },
                rpcResponse: rpcData,
              });
            }
            
            // Show visible dev error
            if (import.meta.env.DEV) {
              alert(`DEV ERROR: Failed to complete compare session:\n\n${errorMsg}\n\nCheck console for details.`);
            }
            
            // DO NOT navigate anywhere
            // DO NOT fall back to individual result
            // DO NOT remove token from sessionStorage
            // Unlock to allow retry
            isCompletingRef.current = false;
            setIsSubmitting(false);
            setLastOperationError(`Compare session failed: ${errorMsg}`);
            return; // CRITICAL: Exit immediately
          }
          
          // RPC SUCCEEDED
          if (import.meta.env.DEV && requestId) {
            console.log(`[QuizPage] [${requestId}] ✅ Compare session completed successfully`);
            console.log(`[QuizPage] [${requestId}] RPC response:`, rpcData);
            console.log(`[QuizPage] [${requestId}] 🎯 Final navigation target: /compare/result/${liveCompareToken}`);
          }
          
          // Navigate to compare result page
          navigate(`/compare/result/${liveCompareToken}`);
          
          // Remove token from sessionStorage AFTER successful navigation
          // (Navigation will unmount component, but cleanup is good practice)
          sessionStorage.removeItem("afran_compare_token");
          
          if (import.meta.env.DEV && requestId) {
            console.log(`[QuizPage] [${requestId}] Token cleared from sessionStorage after navigation`);
          }
          
          // Lock remains until component unmounts (navigation)
          return; // CRITICAL: Exit immediately - do not continue to individual result
        } catch (compareError) {
          // Unexpected error (not RPC error, but exception)
          const errorMsg = compareError instanceof Error ? compareError.message : "Unknown error";
          if (import.meta.env.DEV && requestId) {
            console.error(`[QuizPage] [${requestId}] ❌ Unexpected error completing compare session:`, compareError);
            if (compareError instanceof Error) {
              console.error(`[QuizPage] [${requestId}] Error details:`, {
                message: compareError.message,
                stack: compareError.stack,
                name: compareError.name,
              });
            }
          }
          
          // Show visible dev error
          if (import.meta.env.DEV) {
            alert(`DEV ERROR: Unexpected error completing compare session:\n\n${errorMsg}\n\nCheck console for details.`);
          }
          
          // DO NOT navigate anywhere
          // DO NOT fall back to individual result
          // DO NOT remove token from sessionStorage
          // Unlock to allow retry
          isCompletingRef.current = false;
          setIsSubmitting(false);
          setLastOperationError(`Compare session error: ${errorMsg}`);
          return; // CRITICAL: Exit immediately
        }
      }

      // ============================================
      // Individual result flow (NO compare token)
      // ============================================
      if (import.meta.env.DEV && requestId) {
        console.log(`[QuizPage] [${requestId}] No compare token - navigating to individual result`);
      }
      
      // Only navigate AFTER successful update and no compare token
      if (inviteToken) {
        navigate(`/compare/${inviteToken}`);
      } else {
        navigate("/result");
      }
      // Lock remains until component unmounts (navigation)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      if (import.meta.env.DEV && requestId) {
        console.error(`[QuizPage] [${requestId}] ❌ Error completing quiz:`, error);
      if (error instanceof Error) {
          console.error(`[QuizPage] [${requestId}] Error details:`, {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      } else {
        console.error("[QuizPage] ❌ Error completing quiz:", error);
      }
      setLastOperationError(errorMsg);

      // In dev mode, show error in UI
      if (import.meta.env.DEV) {
        alert(`DEV ERROR: Failed to complete attempt: ${errorMsg}\n\nCheck console for details.`);
      }

      // DO NOT navigate on error - let user see the error
      // User can manually navigate or retry
      // Unlock on error only (allows retry)
      isCompletingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Show loading if auth is still loading or attempt ID is missing
  if (authLoading || !attemptId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground/80">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  const handleExit = () => {
    if (!attemptId || abandonedAttemptsRef.current.has(attemptId)) return;
    
    // Calculate last question index from current answers
    let lastQuestionIndex = 0;
    for (let i = 1; i <= 12; i++) {
      if (answersRef.current[i] !== undefined) {
        lastQuestionIndex = i - 1; // 0-indexed
      }
    }
    
    // Abandon attempt when user exits
    abandonedAttemptsRef.current.add(attemptId);
    markAttemptAbandoned(attemptId, lastQuestionIndex).catch((err) => {
      console.error("[QuizPage] Failed to abandon attempt on exit:", err);
    });
  };

  return (
    <>
      <QuizPageComponent
        onComplete={handleComplete}
        onAnswerChange={(answers) => {
          answersRef.current = answers;
          debouncedUpdate(answers);
        }}
        onExit={handleExit}
        isSubmitting={isSubmitting}
      />
      {/* Dev Panel - only in dev mode */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 left-4 bg-black/90 text-white text-xs p-4 rounded-lg font-mono max-w-sm z-50 border border-white/20">
          <div className="font-bold mb-2 text-yellow-400">Dev Panel</div>
          <div className="space-y-1">
            <div>
              <span className="text-gray-400">Attempt ID:</span>{" "}
              {attemptId ? attemptId.substring(0, 8) + "..." : "N/A"}
            </div>
            <div>
              <span className="text-gray-400">Participant:</span>{" "}
              {userId ? userId.substring(0, 8) + "..." : "N/A"}
            </div>
            {lastOperationError && (
              <div className="text-red-400 mt-2 break-words">
                <div className="font-bold">Error:</div>
                {lastOperationError}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
