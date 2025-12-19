import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QuizPage as QuizPageComponent } from "@/app/components/QuizPage";
import { scoreAfranR14 } from "@/features/quiz/scoring/scoreAfranR14";
import { getLevel } from "@/features/quiz/scoring/levelsAfranR14";
import { calculateBand } from "@/features/attempts/calculateBand";
import { updateAttemptAnswers, completeAttempt, markAttemptAbandoned, startAttempt } from "@/features/attempts/createAttempt";
import { computeTotalScore, normalizeAnswers } from "@/domain/quiz/scoring";
import { computeDimensionScores } from "@/domain/quiz/dimensions";
import { useAnonAuth } from "@/hooks/useAnonAuth";
// import { completeSession } from "@/api/compare"; // Unused
// import { completeCompareSession } from "@/features/compare/completeCompareSession"; // Unused
import { supabase } from "@/lib/supabaseClient";
import { getAttemptStorageKey } from "@/features/attempts/getAttemptStorageKey";
import { getQuizId } from "@/features/attempts/getQuizId";
import { getCompareSession } from "@/features/compare/getCompareSession";
// import { InviteIdentityGate } from "@/features/compare/InviteIdentityGate"; // Unused
import { getInviteTokenSafe } from "@/features/compare/getInviteToken";
import type { LikertValue, LevelKey } from "@/features/quiz/types";

export default function QuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // const params = useParams(); // Unused
  const inviteToken = searchParams.get("invite");
  
  // Get invite token (only set in /compare/invite/:token route)
  // Priority: URL query param (invite=...) > sessionStorage (compare_invite_token)
  // Do NOT read from other sources to avoid conflicts with person A's token creation
  const compareToken = getInviteTokenSafe(searchParams);
  
  if (import.meta.env.DEV && compareToken) {
    console.log("[QuizPage] Invite token detected (component level):", {
      fromUrl: !!searchParams.get("invite"),
      fromStorage: !!sessionStorage.getItem("compare_invite_token"),
      token: compareToken.substring(0, 12) + "...",
      tokenLength: compareToken.length,
    });
  }
  
  const { userId, loading: authLoading } = useAnonAuth();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const answersRef = useRef<Record<number, LikertValue>>({});
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastOperationError, setLastOperationError] = useState<string | null>(null);
  const abandonedAttemptsRef = useRef<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isCompletingRef = useRef<boolean>(false);
  
  // Identity gate state for invited users
  const [showIdentityGate, setShowIdentityGate] = useState(false);
  const [_inviterName, setInviterName] = useState<string | null>(null);
  const [identityData, setIdentityData] = useState<{ firstName: string; lastName?: string; phone: string } | null>(null);

  // Load quiz ID and attempt ID with ownership validation
  useEffect(() => {
    const loadAttempt = async () => {
      if (authLoading || !userId) {
        return;
      }

      try {
        // Get quiz ID
        const currentQuizId = await getQuizId();
        setQuizId(currentQuizId);
        
        if (import.meta.env.DEV) {
          console.log("[QuizPage] Participant ID:", userId.substring(0, 8) + "...");
          console.log("[QuizPage] Quiz ID:", currentQuizId);
          console.log("[QuizPage] Compare token:", compareToken ? compareToken.substring(0, 8) + "..." : "none");
        }

        // Get storage key based on token presence
        const storageKey = getAttemptStorageKey(currentQuizId, userId, compareToken);
        
        if (import.meta.env.DEV) {
          console.log("[QuizPage] Storage key:", storageKey);
        }

        // Try to load stored attempt ID
        const storedAttemptId = localStorage.getItem(storageKey);
        
        if (import.meta.env.DEV) {
          console.log("[QuizPage] Stored attempt ID:", storedAttemptId ? storedAttemptId.substring(0, 8) + "..." : "none");
        }

        // Validate ownership if attempt ID exists
        if (storedAttemptId) {
          const { data: attempt, error } = await supabase
            .from("attempts")
            .select("id, participant_id, quiz_id, status")
            .eq("id", storedAttemptId)
            .eq("participant_id", userId)
            .eq("quiz_id", currentQuizId)
            .maybeSingle();

          if (import.meta.env.DEV) {
            console.log("[QuizPage] Ownership validation:", {
              attemptFound: !!attempt,
              error: error ? error.message : null,
              status: attempt?.status,
            });
          }

          if (attempt && !error) {
            // Valid attempt owned by current participant
            setAttemptId(attempt.id);
            if (import.meta.env.DEV) {
              console.log("[QuizPage] ✅ Using validated attempt ID:", attempt.id.substring(0, 8) + "...");
            }
            return;
          } else {
            // Attempt not found or not owned - clear invalid storage
            if (import.meta.env.DEV) {
              console.warn("[QuizPage] ⚠️ Stored attempt invalid, clearing storage key");
            }
            localStorage.removeItem(storageKey);
          }
        }

        // Check if identity gate is needed for invited users
        if (compareToken) {
          const identityGateKey = `afran_invited_identity_done_${compareToken}`;
          const identityDone = sessionStorage.getItem(identityGateKey);
          
          if (!identityDone) {
            // Need to show identity gate - fetch inviter name
            if (import.meta.env.DEV) {
              console.log("[QuizPage] Identity gate needed for compare token");
            }
            
            try {
              const session = await getCompareSession(compareToken);
              if (session) {
                const inviterFullName = session.inviterFirstName 
                  ? [session.inviterFirstName, session.inviterLastName].filter(Boolean).join(" ").trim()
                  : null;
                setInviterName(inviterFullName || session.inviterFirstName || null);
                setShowIdentityGate(true);
                
                if (import.meta.env.DEV) {
                  console.log("[QuizPage] Showing identity gate with inviter:", inviterFullName || "unknown");
                }
                return; // Don't create attempt yet - wait for identity gate
              }
            } catch (gateError) {
              if (import.meta.env.DEV) {
                console.error("[QuizPage] Error fetching compare session for identity gate:", gateError);
              }
              // Continue with normal flow if session fetch fails
            }
          } else {
            // Identity already collected - use stored identity data
            const storedIdentity = sessionStorage.getItem(`afran_invited_identity_${compareToken}`);
            if (storedIdentity) {
              try {
                const identity = JSON.parse(storedIdentity);
                setIdentityData(identity);
                if (import.meta.env.DEV) {
                  console.log("[QuizPage] Using stored identity data for compare token");
                }
              } catch (e) {
                if (import.meta.env.DEV) {
                  console.warn("[QuizPage] Failed to parse stored identity:", e);
                }
              }
            }
          }
        }

        // No valid stored attempt - create new one
        if (import.meta.env.DEV) {
          console.log("[QuizPage] Creating new attempt...");
        }

        // Get identity data: from identity gate (if compare flow) or intake data (normal flow)
        let firstName = "کاربر";
        let lastName: string | null = null;
        let phone = "";

        if (compareToken) {
          // Compare flow: use invitee identity from sessionStorage
          const inviteeFirstName = sessionStorage.getItem("afran_invitee_first_name");
          const inviteeLastName = sessionStorage.getItem("afran_invitee_last_name");
          const inviteePhone = sessionStorage.getItem("afran_invitee_phone");
          
          if (inviteeFirstName) {
            firstName = inviteeFirstName;
            lastName = inviteeLastName || null;
            phone = inviteePhone || "";
          } else if (identityData) {
            // Fallback to identityData if sessionStorage not set
            firstName = identityData.firstName;
            lastName = identityData.lastName || null;
            phone = identityData.phone;
          }
        } else {
          // Normal flow: get intake data from sessionStorage
          const intakeData = sessionStorage.getItem("quiz_intake_v1");
          if (intakeData) {
            try {
              const intake = JSON.parse(intakeData);
              firstName = intake.firstName || firstName;
              lastName = intake.lastName || null;
              phone = intake.mobile || "";
            } catch (e) {
              if (import.meta.env.DEV) {
                console.warn("[QuizPage] Failed to parse intake data:", e);
              }
            }
          }
        }

        const newAttemptId = await startAttempt({
          quizId: currentQuizId,
          participantId: userId,
          userFirstName: firstName,
          userLastName: lastName,
          userPhone: phone || null, // Null if no phone (nullable in DB)
          userAgent: navigator.userAgent,
        });

        // Store new attempt ID in scoped key
        localStorage.setItem(storageKey, newAttemptId);
        setAttemptId(newAttemptId);

        if (import.meta.env.DEV) {
          console.log("[QuizPage] ✅ Created and stored new attempt ID:", newAttemptId.substring(0, 8) + "...");
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[QuizPage] Error loading/creating attempt:", error);
        setLastOperationError(errorMsg);
        if (import.meta.env.DEV) {
          alert(`DEV ERROR: Failed to load/create attempt: ${errorMsg}`);
        }
      }
    };

    loadAttempt();
  }, [userId, authLoading, compareToken, navigate]);

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
    console.log("[QUIZ] submit started");
    // Prevent double-submit using ref (prevents race conditions)
    if (isCompletingRef.current || isSubmitting) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QuizPage.tsx:handleComplete:early-return',message:'[SUBMIT] early return - already submitting',data:{isCompleting:isCompletingRef.current,isSubmitting},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
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

    // ============================================
    // CRITICAL: Compute live compare token at top (before any try/await)
    // Priority: URL query param (compare_token) > URL query param (compare/token) > sessionStorage
    // Always trim to prevent whitespace issues
    // ============================================
    const currentSearchParams = new URLSearchParams(window.location.search);
    // Support both compare_token (new explicit param) and compare/token (legacy)
    // Get invite token using helper (URL query param > sessionStorage)
    // This token is ONLY set in /compare/invite/:token route
    const liveCompareToken = getInviteTokenSafe(currentSearchParams);

    // Validate attemptId exists - if missing, try to recover
    if (!attemptId || !userId || !quizId) {
      const errorMsg = "[QuizPage] CRITICAL: Missing attempt ID, user ID, or quiz ID";
      console.error(errorMsg, { attemptId, userId, quizId });
      
      // Try to recover: reload attempt if missing
      if (!attemptId && userId && quizId) {
        if (import.meta.env.DEV && requestId) {
          console.log(`[QuizPage] [${requestId}] Attempting to recover missing attemptId...`);
        }
        try {
          const currentQuizId = await getQuizId();
          const storageKey = getAttemptStorageKey(currentQuizId, userId, liveCompareToken);
          const storedAttemptId = localStorage.getItem(storageKey);
          if (storedAttemptId) {
            const { data: attempt } = await supabase
              .from("attempts")
              .select("id, status")
              .eq("id", storedAttemptId)
              .eq("participant_id", userId)
              .maybeSingle();
            if (attempt && attempt.status !== "completed") {
              setAttemptId(attempt.id);
              if (import.meta.env.DEV && requestId) {
                console.log(`[QuizPage] [${requestId}] Recovered attemptId:`, attempt.id.substring(0, 8) + "...");
              }
              // Retry completion after recovery
              setTimeout(() => handleComplete(quizAnswers), 100);
              return;
            }
          }
        } catch (recoverError) {
          if (import.meta.env.DEV && requestId) {
            console.error(`[QuizPage] [${requestId}] Failed to recover attemptId:`, recoverError);
          }
        }
      }
      
      if (import.meta.env.DEV && requestId) {
        alert(`DEV ERROR: ${errorMsg}. Cannot complete attempt.`);
      }
      // Unlock before navigating (graceful degradation)
      isCompletingRef.current = false;
      setIsSubmitting(false);
      setLastOperationError("خطا: اطلاعات آزمون یافت نشد. لطفاً دوباره تلاش کنید.");
      return;
    }

    const currentAttemptId = attemptId;

    if (import.meta.env.DEV && requestId) {
      console.log(`[QuizPage] [${requestId}] 🔍 Live token check (top-level):`, {
        token: liveCompareToken ? liveCompareToken.substring(0, 12) + "..." : null,
        tokenLength: liveCompareToken ? liveCompareToken.length : 0,
      });
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
      
      if (import.meta.env.DEV && requestId) {
        console.log(`[QuizPage] [${requestId}] 🔍 Computed dimension scores before completeAttempt:`, {
          dimensionScores,
          totalScore,
          dimensionScoresKeys: Object.keys(dimensionScores),
          dimensionScoresValues: Object.values(dimensionScores),
        });
      }
      
      if (import.meta.env.DEV) {
        console.log("[QuizPage] 🔍 Computed dimension scores before completeAttempt:", {
          dimensionScores,
          totalScore,
          dimensionScoresKeys: Object.keys(dimensionScores),
          dimensionScoresValues: Object.values(dimensionScores),
        });
      }

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

      if (import.meta.env.DEV && requestId) {
        console.log(`[QuizPage] [${requestId}] 🔍 Calling completeAttempt with payload:`, {
          attemptId: currentAttemptId.substring(0, 8) + "...",
          totalScore,
          dimensionScores,
          scoreBandId,
          dimensionScoresType: typeof dimensionScores,
          dimensionScoresIsObject: typeof dimensionScores === "object" && dimensionScores !== null,
          dimensionScoresKeys: Object.keys(dimensionScores),
        });
      }
      
      const completedData = await completeAttempt({
        attemptId: currentAttemptId,
        totalScore,
        dimensionScores,
        scoreBandId,
      });
      
      // Store attemptId in standard location for ResultPage to read
      localStorage.setItem("afran_attempt_id", currentAttemptId);
      
      if (import.meta.env.DEV && requestId) {
        console.log(`[QuizPage] [${requestId}] Stored attemptId to afran_attempt_id:`, currentAttemptId.substring(0, 8) + "...");
      }
      
      console.log("[SUBMIT] success");
      
      if (import.meta.env.DEV && requestId) {
        console.log(`[QuizPage] [${requestId}] 🔍 completeAttempt returned:`, {
          id: completedData.id.substring(0, 8) + "...",
          status: completedData.status,
          total_score: completedData.total_score,
          dimension_scores: completedData.dimension_scores,
          dimension_scoresType: typeof completedData.dimension_scores,
        });
        console.log(`[QuizPage] [${requestId}] 📊 Step 1 - Captured IDs:`, {
          compareToken: liveCompareToken ? liveCompareToken.substring(0, 12) + "..." : null,
          attemptBId: currentAttemptId.substring(0, 8) + "...",
          participantId: userId.substring(0, 8) + "...",
          quizId: quizId,
        });
      }

      if (import.meta.env.DEV && requestId) {
        console.log(`[QuizPage] [${requestId}] ✅ Attempt completed successfully:`, currentAttemptId);
        console.log(`[QuizPage] [${requestId}] Completed attempt data:`, completedData);
      }
      setLastOperationError(null);

      // Clean up scoped storage key and in-memory state after successful completion
      if (userId && quizId) {
        const storageKey = getAttemptStorageKey(quizId, userId, liveCompareToken);
        localStorage.removeItem(storageKey);
        if (import.meta.env.DEV && requestId) {
          console.log(`[QuizPage] [${requestId}] Cleared storage key:`, storageKey);
        }
      }
      setAttemptId(null);
      // DO NOT unlock on success - keep lock until navigation completes

      // ============================================
      // CRITICAL: Handle compare flow if invite token exists
      // ============================================
      if (liveCompareToken) {
        // Ensure token is trimmed before RPC call
        const trimmedToken = liveCompareToken.trim();
        const rpcPayload = {
          p_invite_token: trimmedToken,
          p_attempt_b_id: currentAttemptId,
        };
        
        if (import.meta.env.DEV && requestId) {
          console.log(`[QuizPage] [${requestId}] 🎯 Invite token detected - completing compare session:`, {
            token: trimmedToken.substring(0, 12) + "...",
            raw_token: liveCompareToken,
            trimmed_token: trimmedToken,
            tokenLength: trimmedToken.length,
            attemptBId: currentAttemptId.substring(0, 8) + "...",
            attemptBIdLength: currentAttemptId.length,
            rpcPayload,
            now: new Date().toISOString(),
            nowMs: Date.now(),
          });
        }
        
        try {
          // Call RPC directly using supabase client (uses compare_tokens table via migration 015)
          const { data: rpcData, error: rpcError } = await supabase.rpc("complete_compare_session", rpcPayload);
          
          if (import.meta.env.DEV && requestId) {
            console.log(`[QuizPage] [${requestId}] 🔍 RPC complete_compare_session response:`, {
              hasError: !!rpcError,
              errorCode: rpcError?.code,
              errorMessage: rpcError?.message,
              hasData: !!rpcData,
              dataType: Array.isArray(rpcData) ? "array" : typeof rpcData,
              dataLength: Array.isArray(rpcData) ? rpcData.length : null,
              token: trimmedToken.substring(0, 12) + "...",
            });
          }
          
          if (rpcError) {
            // RPC FAILED - DO NOT navigate, DO NOT fall back
            // Log ALL error details for debugging
            const errorDetails = {
              code: rpcError.code,
              message: rpcError.message,
              details: rpcError.details,
              hint: rpcError.hint,
            };
            
            console.error(`[QuizPage] [${requestId}] ❌ RPC FAILED - complete_compare_session:`, {
              inviteToken: trimmedToken,
              inviteTokenLength: trimmedToken.length,
              attemptBId: currentAttemptId,
              attemptBIdLength: currentAttemptId.length,
              rpcPayload,
              error: errorDetails,
              rpcResponse: rpcData,
            });
            
            // Show visible dev error
            if (import.meta.env.DEV) {
              alert(`DEV ERROR: Failed to complete compare session:\n\nToken: ${trimmedToken}\nToken Length: ${trimmedToken.length}\nAttempt B ID: ${currentAttemptId}\nCode: ${rpcError.code}\nMessage: ${rpcError.message}\nDetails: ${rpcError.details || 'N/A'}\nHint: ${rpcError.hint || 'N/A'}\n\nCheck console for full details.`);
            }
            
            // Show user-friendly toast
            try {
              const { toast } = await import("sonner");
              toast.error("لینک مقایسه نامعتبر/منقضی شد یا توکن ارسال نشد.", {
                description: rpcError.message || "خطا در تکمیل مقایسه",
              });
            } catch (toastError) {
              // Toast import failed, error already logged to console
              console.warn("[QuizPage] Failed to show toast:", toastError);
            }
            
            // DO NOT navigate anywhere
            // DO NOT fall back to individual result
            // DO NOT remove token from sessionStorage
            // Unlock to allow retry
            isCompletingRef.current = false;
            setIsSubmitting(false);
            setLastOperationError(`Compare session failed: ${rpcError.message || "Unknown error"}`);
            return; // CRITICAL: Exit immediately
          }
          
          // RPC SUCCEEDED
          // rpcData is now a TABLE (array) with one row containing: compare_id, token, status, attempt_a_id, attempt_b_id, expires_at
          const resultRow = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;
          const compareId = resultRow?.compare_id || resultRow?.token || trimmedToken;
          
          if (import.meta.env.DEV && requestId) {
            console.log(`[QuizPage] [${requestId}] ✅ Compare session completed successfully:`, {
              compareId: compareId,
              resultRow: resultRow,
              inviteToken: trimmedToken,
              attemptBId: currentAttemptId,
            });
          }
          
          // Navigate to compare result page using the invite token
          // The result page will use this token to fetch the completed session
          const targetUrl = `/compare/result/${trimmedToken}`;
          
          if (import.meta.env.DEV && requestId) {
            console.log(`[QuizPage] [${requestId}] 🎯 Navigation target:`, targetUrl);
            console.log(`[QuizPage] [${requestId}] 📊 Step 1 - Final IDs:`, {
              compareToken: liveCompareToken.substring(0, 12) + "...",
              attemptBId: currentAttemptId.substring(0, 8) + "...",
              compareId: compareId,
              navigationUrl: targetUrl,
            });
          }
          
          navigate(targetUrl);
          
          // DO NOT remove token from sessionStorage yet - wait until CompareResultPage successfully loads
          // Token will be cleared after successful render in CompareResultPage
          
          if (import.meta.env.DEV && requestId) {
            console.log(`[QuizPage] [${requestId}] ✅ Navigated to compare result (token kept in sessionStorage)`);
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
      console.error("[SUBMIT] error", error);
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

  // Handle identity gate submission - unused, removed
  // const _handleIdentityGateSubmit = (data: { firstName: string; lastName?: string; phone: string }) => {
  //   if (!compareToken) return;
  //   
  //   // Store identity data
  //   setIdentityData(data);
  //   
  //   // Mark identity gate as done
  //   const identityGateKey = `afran_invited_identity_done_${compareToken}`;
  //   sessionStorage.setItem(identityGateKey, "1");
  //   sessionStorage.setItem(`afran_invited_identity_${compareToken}`, JSON.stringify(data));
  //   
  //   // Close gate
  //   setShowIdentityGate(false);
  //   
  //   if (import.meta.env.DEV) {
  //     console.log("[QuizPage] Identity gate submitted:", {
  //       firstName: data.firstName,
  //       lastName: data.lastName,
  //       phone: data.phone.substring(0, 4) + "***",
  //     });
  //   }
  //   
  //   // Reload attempt (will create new attempt with identity data)
  //   window.location.reload();
  // };

  // Show loading if auth is still loading or attempt ID is missing (and identity gate not shown)
  if (authLoading || (!attemptId && !showIdentityGate)) {
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
