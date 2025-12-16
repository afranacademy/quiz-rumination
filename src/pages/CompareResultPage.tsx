import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { RefreshCw, Link as LinkIcon, Share2, BookOpen, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { copyText, shareOrCopyText } from "@/features/share/shareClient";
import {
  generatePdfBlob,
  downloadPdf,
  sharePdf,
  generateComparePdfFilename,
} from "@/utils/pdfGenerator";
import { ComparePdfDocument } from "@/pdf/ComparePdfDocument";
import { computeSimilarity } from "@/features/compare/computeSimilarity";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { trackShareEvent } from "@/lib/trackShareEvent";
import { AppModal } from "@/components/AppModal";
import { createCompareInvite } from "@/features/compare/createCompareInvite";
import { getLatestCompletedAttempt } from "@/features/compare/getLatestCompletedAttempt";
import { LINKS } from "@/config/links";
import {
  DIMENSION_DEFINITIONS,
  getAlignmentLabel,
  getLargestDifferenceDimension,
  getLargestSimilarityDimension,
  generateCentralInterpretation,
  generateNeutralBlendedInterpretation,
  getContextualTriggers,
  getCombinedContextualTriggers,
  getSeenUnseenConsequences,
  CONVERSATION_STARTERS,
  SAFETY_STATEMENT,
  getDimensionNameForSnapshot,
  shouldShowCTA,
  generateSafeShareText,
  getMisunderstandingRisk,
  getMisunderstandingRiskText,
  getTopDimensionForPerson,
  generateMindSnapshot,
  generateMisunderstandingLoop,
  generateEmotionalExperience,
  getSimilarityComplementarySentence,
  generateDimensionSummary,
  getSimilaritiesAndDifferences,
  getConversationStarters,
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
  user_first_name: string | null; // Allow null to preserve RPC values, fallback applied at display time
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
  a_dimension_scores: Record<DimensionKey, number> | null | unknown; // Can be jsonb, string, or null
  a_score_band_id: number | null;
  a_score_band_title: string | null;
  a_user_first_name: string | null;
  a_user_last_name: string | null;
  b_total_score: number | null;
  b_dimension_scores: Record<DimensionKey, number> | null | unknown; // Can be jsonb, string, or null
  b_score_band_id: number | null;
  b_score_band_title: string | null;
  b_user_first_name: string | null;
  b_user_last_name: string | null;
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
  relation: "similar" | "different" | "very_different";
  direction: "a_higher" | "b_higher" | "equal";
  aLevel: "low" | "medium" | "high";
  bLevel: "low" | "medium" | "high";
};

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  stickiness: "چسبندگی فکری",
  pastBrooding: "بازگشت به گذشته",
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
type DimensionScoresResult = {
  scores: Record<DimensionKey, number>;
  validDimensions: DimensionKey[];
  hasUnknown: boolean;
};

function parseDimensionScores(
  raw: unknown,
  context: string
): DimensionScoresResult {
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
  const scores: Record<DimensionKey, number> = {} as Record<DimensionKey, number>;
  const validDimensions: DimensionKey[] = [];
  let hasUnknown = false;

  // Only mark as unknown if truly null/undefined - not if it's a valid object
  if (raw === null || raw === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[parseDimensionScores] ${context}: raw is null/undefined, marking all as unknown`);
    }
    // Mark all as unknown (use NaN to indicate unknown)
    for (const key of dimensionKeys) {
      scores[key] = NaN;
    }
    return { scores, validDimensions, hasUnknown: true };
  }
  
  // If it's already a valid object with dimension keys, parse it directly
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const rawObj = raw as Record<string, unknown>;
    const hasValidKeys = dimensionKeys.some(key => key in rawObj);
    if (hasValidKeys) {
      // Direct object with dimension keys - parse immediately
      for (const key of dimensionKeys) {
        const value = rawObj[key];
        if (typeof value === "number" && !isNaN(value)) {
          scores[key] = value;
          validDimensions.push(key);
        } else {
          scores[key] = NaN;
          hasUnknown = true;
        }
      }
      if (import.meta.env.DEV) {
        console.log(`[parseDimensionScores] ${context}: Parsed directly from object:`, {
          validDimensions,
          scores,
        });
      }
      return { scores, validDimensions, hasUnknown };
    }
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
      // Return all unknown if parse fails
      for (const key of dimensionKeys) {
        scores[key] = NaN;
    }
      return { scores, validDimensions, hasUnknown: true };
    }
  } else if (typeof raw === "object" && raw !== null) {
    parsed = raw as Record<string, unknown>;
  } else {
    if (import.meta.env.DEV) {
      console.warn(`[parseDimensionScores] ${context}: Unexpected type:`, typeof raw);
    }
    // Return all unknown for unexpected types
    for (const key of dimensionKeys) {
      scores[key] = NaN;
    }
    return { scores, validDimensions, hasUnknown: true };
  }

  // Safely extract each dimension - use NaN for unknown/missing
  for (const key of dimensionKeys) {
    const value = parsed[key];
    if (typeof value === "number" && !isNaN(value)) {
      scores[key] = value;
      validDimensions.push(key);
    } else {
      scores[key] = NaN; // Mark as unknown
      hasUnknown = true;
    }
  }

  if (import.meta.env.DEV) {
    const unknownCount = dimensionKeys.length - validDimensions.length;
    if (unknownCount > 0) {
      console.warn(`[parseDimensionScores] ${context}: ${unknownCount} dimension(s) are unknown/missing:`, 
        dimensionKeys.filter(k => !validDimensions.includes(k)));
    }
    const allUnknown = validDimensions.length === 0;
    if (allUnknown && raw !== null && raw !== undefined) {
      console.error(`[parseDimensionScores] ${context}: ⚠️ CRITICAL - All dimensions are unknown! Raw value:`, raw);
    }
  }

  return { scores, validDimensions, hasUnknown };
}

/**
 * Builds a comparison from dimension scores of two attempts.
 */
function buildComparison(
  attemptA: AttemptData,
  attemptB: AttemptData
): Comparison {
  // Threshold constants for relation calculation
  const SIMILAR_THRESHOLD = 0.8;
  const DIFFERENT_THRESHOLD = 1.6;

  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];

  const dimensions: Record<DimensionKey, DimensionComparison> = {} as Record<
    DimensionKey,
    DimensionComparison
  >;
  let similarCount = 0;

  // Safely access dimension scores with defaults
  const aDims = attemptA.dimension_scores ?? {};
  const bDims = attemptB.dimension_scores ?? {};

  // Track valid dimensions
  const validDimensions: DimensionKey[] = [];

  for (const key of dimensionKeys) {
    // Use safe access - check for NaN (unknown)
    const aScoreRaw = aDims[key];
    const bScoreRaw = bDims[key];
    const aScore = (typeof aScoreRaw === "number" && !isNaN(aScoreRaw)) ? aScoreRaw : NaN;
    const bScore = (typeof bScoreRaw === "number" && !isNaN(bScoreRaw)) ? bScoreRaw : NaN;
    
    // If either score is unknown, mark dimension as unknown
    const isUnknown = isNaN(aScore) || isNaN(bScore);
    const delta = isUnknown ? NaN : Math.round(Math.abs(aScore - bScore) * 10) / 10;
    
    if (!isUnknown) {
      validDimensions.push(key);
    }

    let relation: "similar" | "different" | "very_different";
    if (isUnknown) {
      relation = "similar"; // Default for unknown
    } else if (delta < SIMILAR_THRESHOLD) {
      relation = "similar";
      similarCount++;
    } else if (delta < DIFFERENT_THRESHOLD) {
      relation = "different";
    } else {
      relation = "very_different";
    }

    // Determine direction
    let direction: "a_higher" | "b_higher" | "equal";
    if (isUnknown) {
      direction = "equal"; // Default for unknown
    } else if (Math.abs(aScore - bScore) < 0.1) {
      direction = "equal";
    } else if (aScore > bScore) {
      direction = "a_higher";
    } else {
      direction = "b_higher";
    }

    const aLevel = isUnknown ? "low" : levelOfDimension(aScore);
    const bLevel = isUnknown ? "low" : levelOfDimension(bScore);

    dimensions[key] = {
      aScore: isUnknown ? 0 : aScore, // Use 0 for display if unknown
      bScore: isUnknown ? 0 : bScore,
      delta: isUnknown ? 0 : delta,
      relation,
      direction,
      aLevel,
      bLevel,
    };

    // Comprehensive debug logging for each dimension
    if (import.meta.env.DEV) {
      const isHighHighDifferent = (aLevel === "high" && bLevel === "high" && relation !== "similar");
      console.log(`[buildComparison] Dimension ${key}:`, {
        aScore, bScore, delta,
        aLevel, bLevel, relation,
        thresholds: {
          similar: SIMILAR_THRESHOLD,
          different: DIFFERENT_THRESHOLD,
        },
        // Validation
        isHighHighDifferent,
        explanation: isHighHighDifferent
          ? "Both high but delta >= 0.8 (different) - this is valid but may be confusing"
          : "OK"
      });
    }
  }

  // Calculate similarity based on valid dimensions only
  const validDimensionsCount = validDimensions.length;
  let summarySimilarity: "low" | "medium" | "high";
  
  if (validDimensionsCount === 0) {
    // No valid dimensions - default to low
    summarySimilarity = "low";
  } else if (validDimensionsCount <= 2) {
    // 1-2 valid dimensions
    if (similarCount <= 1) {
      summarySimilarity = "low";
    } else {
      summarySimilarity = "medium";
    }
  } else {
    // 3-4 valid dimensions
  if (similarCount <= 1) {
    summarySimilarity = "low";
  } else if (similarCount === 2) {
    summarySimilarity = "medium";
  } else {
    summarySimilarity = "high";
    }
  }

  if (import.meta.env.DEV) {
    console.log("[buildComparison] Summary:", {
      validDimensionsCount,
      similarCount,
      summarySimilarity,
      validDimensions,
      totalDimensions: dimensionKeys.length,
    });
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

/**
 * Formats expires_at date for Persian display
 */
function formatExpiresAt(expiresAt: string | null): string {
  if (!expiresAt) return "";
  
  try {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return "منقضی شده";
    } else if (diffDays === 1) {
      return "تا فردا";
    } else if (diffDays <= 7) {
      return `تا ${diffDays} روز دیگر`;
    } else {
      const diffWeeks = Math.floor(diffDays / 7);
      return `تا ${diffWeeks} هفته دیگر`;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[formatExpiresAt] Error formatting date:", error);
    }
    return "";
  }
}

/**
 * Masks phone number for display (safety guardrail)
 * Shows only first 3 and last 2 digits: +98***1234
 */
function maskPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== "string") return "";
  // Remove any non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length < 6) return cleaned; // Too short to mask
  // Show first 3 chars and last 2 chars
  const prefix = cleaned.substring(0, 3);
  const suffix = cleaned.substring(cleaned.length - 2);
  const masked = "*".repeat(Math.max(0, cleaned.length - 5));
  return `${prefix}${masked}${suffix}`;
}

export default function CompareResultPage() {
  // #region agent log - Safety: Log render start
  console.log("[CompareResultPage] 🟢 Render start");
  // #endregion
  
  const { token } = useParams<{ token: string }>();
  
  // #region agent log - Safety: Log token parse
  console.log("[CompareResultPage] 🔍 Token parsed:", {
    token: token ? token.substring(0, 12) + "..." : null,
    hasToken: !!token,
  });
  // #endregion
  
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
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState<{
    token: string;
    url: string;
    expiresAt: string;
  } | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const compareContentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const maxPollingTime = 60000; // 60 seconds
  const pollingInterval = 2000; // 2 seconds
  
  // DEV: Track RPC data for diagnostics
  const [devRpcData, setDevRpcData] = useState<any>(null);
  const [devLastError, setDevLastError] = useState<any>(null);
  
  // CRITICAL: Declare dimensionKeys at component level to avoid TDZ
  const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"] as const;

  // DEV: Log component mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🟢 Component mounted:", {
        token: token ? token.substring(0, 12) + "..." : "N/A",
        pathname: window.location.pathname,
        search: window.location.search,
        timestamp: new Date().toISOString(),
      });
    }
  }, [token]);

  // Load compare payload using RPC (bypasses RLS)
  const loadComparePayload = async (): Promise<ComparePayloadRPCResponse | null> => {
    if (!token) return null;

      try {
        if (import.meta.env.DEV) {
        console.log("[CompareResultPage] 🔵 Calling RPC get_compare_payload_by_token");
        console.log("[CompareResultPage] RPC Payload:", { p_token: token.substring(0, 12) + "..." });
        }

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:376',message:'RPC call start',data:{token:token?.substring(0,12)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
      // #endregion

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_compare_payload_by_token",
          { p_token: token }
        );

      // DEV: Store RPC data for diagnostics
      if (import.meta.env.DEV) {
        setDevRpcData(rpcData);
        // CRITICAL: Log Object.keys for RPC mapping verification
        const rpcKeys = rpcData && typeof rpcData === "object" && !Array.isArray(rpcData) 
          ? Object.keys(rpcData) 
          : Array.isArray(rpcData) && rpcData.length > 0 && typeof rpcData[0] === "object"
          ? Object.keys(rpcData[0])
          : null;
        console.log("[CompareResultPage] 🔵 RPC Response (raw):", {
          hasError: !!rpcError,
          errorCode: rpcError?.code,
          errorMessage: rpcError?.message,
          hasData: !!rpcData,
          dataType: Array.isArray(rpcData) ? "array" : typeof rpcData,
          dataLength: Array.isArray(rpcData) ? rpcData.length : null,
          dataKeys: rpcKeys,
          dataKeysString: rpcKeys ? rpcKeys.join(", ") : "N/A",
          rawData: rpcData,
        });
        // Explicit log for RPC field mapping verification
        if (rpcKeys) {
          console.log("[CompareResultPage] 📋 RPC Field Mapping Check:", {
            allKeys: rpcKeys,
            has_a_user_first_name: rpcKeys.includes("a_user_first_name"),
            has_b_user_first_name: rpcKeys.includes("b_user_first_name"),
            has_a_dimension_scores: rpcKeys.includes("a_dimension_scores"),
            has_b_dimension_scores: rpcKeys.includes("b_dimension_scores"),
            has_names: rpcKeys.some(k => k.includes("name") || k.includes("first") || k.includes("last")),
            has_dimensions: rpcKeys.some(k => k.includes("dimension") || k.includes("dims")),
          });
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:383',message:'RPC response',data:{hasError:!!rpcError,errorCode:rpcError?.code,errorMessage:rpcError?.message,hasData:!!rpcData,dataType:Array.isArray(rpcData)?'array':typeof rpcData,dataLength:Array.isArray(rpcData)?rpcData.length:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion

      if (rpcError) {
          if (import.meta.env.DEV) {
          console.error("[CompareResultPage] ❌ RPC Error:", {
            code: rpcError.code,
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
            stack: rpcError.stack,
            fullError: rpcError,
          });
          setDevLastError(rpcError);
        }
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:390',message:'RPC error - returning null',data:{code:rpcError.code,message:rpcError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return null;
      }

      // Handle both array and single object responses
      let resultRow: ComparePayloadRPCResponse | null = null;
      if (Array.isArray(rpcData)) {
        if (rpcData.length === 0) {
          if (import.meta.env.DEV) {
            console.log("[CompareResultPage] RPC returned empty array - no session found");
          }
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:396',message:'RPC returned empty array',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return null;
        }
        resultRow = rpcData[0] as ComparePayloadRPCResponse;
      } else if (rpcData && typeof rpcData === "object") {
        resultRow = rpcData as ComparePayloadRPCResponse;
      } else {
        if (import.meta.env.DEV) {
          console.error("[CompareResultPage] ❌ Invalid RPC response format:", rpcData);
        }
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:405',message:'Invalid RPC response format',data:{dataType:typeof rpcData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return null;
      }

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:410',message:'RPC result row extracted',data:{status:resultRow.status,hasAttemptB:!!resultRow.attempt_b_id,bTotalScore:resultRow.b_total_score,bDimensionScores:resultRow.b_dimension_scores!==null?'present':'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D,E'})}).catch(()=>{});
      // #endregion

      // Quick Verification Log (30-second test)
      if (import.meta.env.DEV) {
        console.log("[CompareResultPage] RPC keys:", Object.keys(resultRow || {}));
        console.log("[CompareResultPage] Names raw:", {
          a_user_first_name: (resultRow as any).a_user_first_name,
          a_first: (resultRow as any).a_first,
          b_user_first_name: (resultRow as any).b_user_first_name,
          b_first: (resultRow as any).b_first,
        });
      }

      if (import.meta.env.DEV) {
        console.log("[CompareResultPage] ✅ RPC Response (raw):", {
          token: token ? token.substring(0, 12) + "..." : "N/A",
          allKeys: Object.keys(resultRow),
          allKeysString: Object.keys(resultRow).join(", "),
          session_id: resultRow.session_id,
          status: resultRow.status,
          attempt_a_id: resultRow.attempt_a_id,
          attempt_b_id: resultRow.attempt_b_id,
          a_total_score: resultRow.a_total_score,
          b_total_score: resultRow.b_total_score,
          a_dimension_scores_raw: resultRow.a_dimension_scores,
          b_dimension_scores_raw: resultRow.b_dimension_scores,
          a_dimension_scores_type: typeof resultRow.a_dimension_scores,
          b_dimension_scores_type: typeof resultRow.b_dimension_scores,
          a_dimension_scores_is_null: resultRow.a_dimension_scores === null,
          b_dimension_scores_is_null: resultRow.b_dimension_scores === null,
          a_score_band_title: resultRow.a_score_band_title,
          b_score_band_title: resultRow.b_score_band_title,
          // Name fields from RPC - check all possible key variations
          a_user_first_name: resultRow.a_user_first_name,
          a_user_last_name: resultRow.a_user_last_name,
          b_user_first_name: resultRow.b_user_first_name,
          b_user_last_name: resultRow.b_user_last_name,
          // Check for nested structures
          has_attempt_a: !!(resultRow as any).attempt_a,
          has_attempt_b: !!(resultRow as any).attempt_b,
          attempt_a_keys: (resultRow as any).attempt_a ? Object.keys((resultRow as any).attempt_a) : null,
          attempt_b_keys: (resultRow as any).attempt_b ? Object.keys((resultRow as any).attempt_b) : null,
          // Check alternative key names
          a_first_name: (resultRow as any).a_first_name,
          a_last_name: (resultRow as any).a_last_name,
          b_first_name: (resultRow as any).b_first_name,
          b_last_name: (resultRow as any).b_last_name,
          a_dims: (resultRow as any).a_dims,
          b_dims: (resultRow as any).b_dims,
          a_name_present: !!(resultRow.a_user_first_name),
          b_name_present: !!(resultRow.b_user_first_name),
          fullRawData: resultRow, // Full object for inspection
        });
        
        // CRITICAL: Explicit RPC field verification for name fields
        console.log("[CompareResultPage] 📋 RPC Name Fields Verification:", {
          rpcKeys: Object.keys(resultRow),
          a_user_first_name: {
            value: resultRow.a_user_first_name,
            type: typeof resultRow.a_user_first_name,
            isNull: resultRow.a_user_first_name === null,
            isUndefined: resultRow.a_user_first_name === undefined,
            isEmptyString: resultRow.a_user_first_name === "",
            truthy: !!resultRow.a_user_first_name,
          },
          a_user_last_name: {
            value: resultRow.a_user_last_name,
            type: typeof resultRow.a_user_last_name,
            isNull: resultRow.a_user_last_name === null,
            isUndefined: resultRow.a_user_last_name === undefined,
            isEmptyString: resultRow.a_user_last_name === "",
          },
          b_user_first_name: {
            value: resultRow.b_user_first_name,
            type: typeof resultRow.b_user_first_name,
            isNull: resultRow.b_user_first_name === null,
            isUndefined: resultRow.b_user_first_name === undefined,
            isEmptyString: resultRow.b_user_first_name === "",
            truthy: !!resultRow.b_user_first_name,
          },
          b_user_last_name: {
            value: resultRow.b_user_last_name,
            type: typeof resultRow.b_user_last_name,
            isNull: resultRow.b_user_last_name === null,
            isUndefined: resultRow.b_user_last_name === undefined,
            isEmptyString: resultRow.b_user_last_name === "",
          },
        });
      }

      return resultRow;
    } catch (err) {
      if (import.meta.env.DEV) {
        const errorDetails = err instanceof Error ? {
          name: err.name,
          message: err.message,
          stack: err.stack,
        } : { raw: err };
        console.error("[CompareResultPage] ❌ Error calling RPC:", {
          error: err,
          errorDetails,
          token: token ? token.substring(0, 12) + "..." : "N/A",
        });
        setDevLastError(err);
      }
      return null;
    }
  };

  // Process RPC response and set state
  const processCompareData = async (rpcData: ComparePayloadRPCResponse) => {
    // DEV: Log before building comparison
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 processCompareData entry:", {
        status: rpcData.status,
        hasAttemptB: !!rpcData.attempt_b_id,
        attempt_a_id: rpcData.attempt_a_id?.substring(0, 8) + "..." || "null",
        attempt_b_id: rpcData.attempt_b_id?.substring(0, 8) + "..." || "null",
        aTotalScore: rpcData.a_total_score,
        bTotalScore: rpcData.b_total_score,
        aDimScores: rpcData.a_dimension_scores !== null ? "present" : "null",
        bDimScores: rpcData.b_dimension_scores !== null ? "present" : "null",
        aDimScoresType: typeof rpcData.a_dimension_scores,
        bDimScoresType: typeof rpcData.b_dimension_scores,
      });
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:448',message:'processCompareData entry',data:{status:rpcData.status,hasAttemptB:!!rpcData.attempt_b_id,aTotalScore:rpcData.a_total_score,bTotalScore:rpcData.b_total_score,aDimScores:rpcData.a_dimension_scores!==null?'present':'null',bDimScores:rpcData.b_dimension_scores!==null?'present':'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,D,E'})}).catch(()=>{});
    // #endregion

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

    // Defensive check: Validate both attempts have total scores
    // If attempt B was deleted, fallback to pending state
    if (rpcData.a_total_score === null) {
          if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ Attempt A missing total_score - attempt may be deleted");
      }
      setError("اطلاعات آزمون نفر اول یافت نشد.");
          setLoading(false);
          return;
    }

    if (rpcData.b_total_score === null || rpcData.b_dimension_scores === null) {
      if (import.meta.env.DEV) {
        console.warn("[CompareResultPage] ⚠️ Attempt B missing total_score or dimension_scores - may still be processing, will poll");
        console.warn("[CompareResultPage] Attempt B data:", {
          b_total_score: rpcData.b_total_score,
          b_dimension_scores: rpcData.b_dimension_scores,
          b_attempt_id: rpcData.attempt_b_id,
        });
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:492',message:'Attempt B missing data - starting polling',data:{bTotalScore:rpcData.b_total_score,bDimScores:rpcData.b_dimension_scores!==null?'present':'null',status:rpcData.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      // Attempt B not completed yet - start polling
          setLoading(false);
      startPolling();
          return;
        }

    // Safely parse dimension scores (handle null, string, or object)
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 Before parsing dimension scores:", {
        a_dimension_scores_raw: rpcData.a_dimension_scores,
        b_dimension_scores_raw: rpcData.b_dimension_scores,
        a_type: typeof rpcData.a_dimension_scores,
        b_type: typeof rpcData.b_dimension_scores,
        a_is_null: rpcData.a_dimension_scores === null,
        b_is_null: rpcData.b_dimension_scores === null,
        a_is_undefined: rpcData.a_dimension_scores === undefined,
        b_is_undefined: rpcData.b_dimension_scores === undefined,
      });
    }
    
    // Parse dimension scores - use mapped values (handle multiple shapes)
    // Declare rpcAny once for the entire function scope
    const rpcAny = rpcData as any;
    
    let aDimsRaw = rpcData.a_dimension_scores;
    let bDimsRaw = rpcData.b_dimension_scores;
    
    // Check for nested or alternative keys
    if (rpcAny.attempt_a?.dimension_scores) {
      aDimsRaw = rpcAny.attempt_a.dimension_scores;
    } else if (rpcAny.a_dims) {
      aDimsRaw = rpcAny.a_dims;
    }
    if (rpcAny.attempt_b?.dimension_scores) {
      bDimsRaw = rpcAny.attempt_b.dimension_scores;
    } else if (rpcAny.b_dims) {
      bDimsRaw = rpcAny.b_dims;
    }
    
    const aDimsResult = parseDimensionScores(aDimsRaw, "Attempt A");
    const bDimsResult = parseDimensionScores(bDimsRaw, "Attempt B");
    
      if (import.meta.env.DEV) {
        console.log("[CompareResultPage] ✅ Attempt IDs validated:", {
          attemptA_id: rpcData.attempt_a_id.substring(0, 8) + "...",
          attemptB_id: rpcData.attempt_b_id?.substring(0, 8) + "..." || "null",
          a_user_first_name: rpcData.a_user_first_name,
          a_user_last_name: rpcData.a_user_last_name,
          b_user_first_name: rpcData.b_user_first_name,
          b_user_last_name: rpcData.b_user_last_name,
        });
        console.log("[CompareResultPage] 🔍 After parsing dimension scores:", {
          aDims: aDimsResult.scores,
          bDims: bDimsResult.scores,
          aValidDimensions: aDimsResult.validDimensions,
          bValidDimensions: bDimsResult.validDimensions,
          aHasUnknown: aDimsResult.hasUnknown,
          bHasUnknown: bDimsResult.hasUnknown,
          aDims_sum: aDimsResult.validDimensions.reduce((sum, k) => sum + aDimsResult.scores[k], 0),
          bDims_sum: bDimsResult.validDimensions.reduce((sum, k) => sum + bDimsResult.scores[k], 0),
        });
      }

    // Build AttemptData objects - handle multiple RPC response shapes
    // CRITICAL: Defensive Normalizer - supports both new and old aliases, flat and nested structures
    // This ensures we read names correctly even if RPC contract changes or is deployed incorrectly
    // Priority: 1) Flat fields (a_user_first_name), 2) Nested (attempt_a.user_first_name), 3) Old aliases (a_first)
    const aFirst = (rpcData as any).a_user_first_name 
      ?? (rpcData as any).attempt_a?.user_first_name 
      ?? (rpcData as any).a_first 
      ?? null;
    const aLast  = (rpcData as any).a_user_last_name  
      ?? (rpcData as any).attempt_a?.user_last_name  
      ?? (rpcData as any).a_last  
      ?? null;
    const bFirst = (rpcData as any).b_user_first_name 
      ?? (rpcData as any).attempt_b?.user_first_name 
      ?? (rpcData as any).b_first 
      ?? null;
    const bLast  = (rpcData as any).b_user_last_name  
      ?? (rpcData as any).attempt_b?.user_last_name  
      ?? (rpcData as any).b_last  
      ?? null;
    
    // Store raw values (null or string) - NO fallback here
    let attemptAFirstName: string | null = aFirst;
    let attemptALastName: string | null = aLast;
    let attemptBFirstName: string | null = bFirst;
    let attemptBLastName: string | null = bLast;
    let attemptATotalScore: number | null = rpcData.a_total_score;
    let attemptBTotalScore: number | null = rpcData.b_total_score;
    
    // Fallback to nested structure if flat fields are null/undefined (for backward compatibility)
    if (!attemptAFirstName && rpcAny.attempt_a && typeof rpcAny.attempt_a === "object") {
      attemptAFirstName = rpcAny.attempt_a.user_first_name || rpcAny.attempt_a.first_name || null;
      attemptALastName = rpcAny.attempt_a.user_last_name || rpcAny.attempt_a.last_name || null;
      attemptATotalScore = rpcAny.attempt_a.total_score || rpcAny.attempt_a.totalScore || attemptATotalScore;
    }
    if (!attemptBFirstName && rpcAny.attempt_b && typeof rpcAny.attempt_b === "object") {
      attemptBFirstName = rpcAny.attempt_b.user_first_name || rpcAny.attempt_b.first_name || null;
      attemptBLastName = rpcAny.attempt_b.user_last_name || rpcAny.attempt_b.last_name || null;
      attemptBTotalScore = rpcAny.attempt_b.total_score || rpcAny.attempt_b.totalScore || attemptBTotalScore;
    }
    
    // CRITICAL: Fallback fetch from attempts table if RPC didn't return names
    // Check if names are missing (null, undefined, or empty string)
    const needsFetchA = !attemptAFirstName || (typeof attemptAFirstName === "string" && attemptAFirstName.trim() === "");
    const needsFetchB = !attemptBFirstName || (typeof attemptBFirstName === "string" && attemptBFirstName.trim() === "");
    
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 Name fetch check:", {
        token: token ? token.substring(0, 12) + "..." : "N/A",
        attempt_a_id: rpcData.attempt_a_id,
        attempt_b_id: rpcData.attempt_b_id,
        rpc_a_user_first_name: rpcData.a_user_first_name,
        rpc_b_user_first_name: rpcData.b_user_first_name,
        current_attemptAFirstName: attemptAFirstName,
        current_attemptBFirstName: attemptBFirstName,
        needsFetchA,
        needsFetchB,
      });
    }
    
    // Fetch names from attempts table if needed
    if (needsFetchA && rpcData.attempt_a_id) {
      try {
        const { data: attemptA, error: errorA } = await supabase
          .from("attempts")
          .select("user_first_name, user_last_name")
          .eq("id", rpcData.attempt_a_id)
          .single();
        
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] 🔍 Fetched Attempt A names:", {
            attempt_a_id: rpcData.attempt_a_id,
            fetched: attemptA,
            error: errorA,
            user_first_name: attemptA?.user_first_name,
            user_last_name: attemptA?.user_last_name,
          });
        }
        
        if (!errorA && attemptA) {
          attemptAFirstName = attemptA.user_first_name || null;
          attemptALastName = attemptA.user_last_name || null;
        } else if (import.meta.env.DEV) {
          console.warn("[CompareResultPage] ⚠️ Failed to fetch Attempt A names:", errorA);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[CompareResultPage] ❌ Error fetching Attempt A names:", err);
        }
      }
    }
    
    if (needsFetchB && rpcData.attempt_b_id) {
      try {
        const { data: attemptB, error: errorB } = await supabase
          .from("attempts")
          .select("user_first_name, user_last_name")
          .eq("id", rpcData.attempt_b_id)
          .single();
        
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] 🔍 Fetched Attempt B names:", {
            attempt_b_id: rpcData.attempt_b_id,
            fetched: attemptB,
            error: errorB,
            user_first_name: attemptB?.user_first_name,
            user_last_name: attemptB?.user_last_name,
          });
        }
        
        if (!errorB && attemptB) {
          attemptBFirstName = attemptB.user_first_name || null;
          attemptBLastName = attemptB.user_last_name || null;
        } else if (import.meta.env.DEV) {
          console.warn("[CompareResultPage] ⚠️ Failed to fetch Attempt B names:", errorB);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[CompareResultPage] ❌ Error fetching Attempt B names:", err);
        }
      }
    }
    
    // Use parsed dimension scores (will handle null/undefined gracefully)
    // NOTE: Do NOT apply fallback here - preserve null/undefined values
    // Fallback will be applied only at display time (in name computation)
    const attemptAFirstNameFinal = attemptAFirstName; // Keep null/undefined, no fallback
    const attemptBFirstNameFinal = attemptBFirstName; // Keep null/undefined, no fallback
    
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 Final names before AttemptData:", {
        attemptAFirstNameFinal,
        attemptALastName,
        attemptBFirstNameFinal,
        attemptBLastName,
        source: {
          a: needsFetchA && attemptAFirstName ? "fetched" : "rpc",
          b: needsFetchB && attemptBFirstName ? "fetched" : "rpc",
        },
      });
    }
    
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 Mapped RPC fields:", {
        attemptAFirstName,
        attemptALastName,
        attemptBFirstName,
        attemptBLastName,
        attemptATotalScore,
        attemptBTotalScore,
        aDimsRaw: aDimsRaw,
        bDimsRaw: bDimsRaw,
        aDimsRawType: typeof aDimsRaw,
        bDimsRawType: typeof bDimsRaw,
        aDimsRawIsNull: aDimsRaw === null,
        bDimsRawIsNull: bDimsRaw === null,
        rpcKeys: Object.keys(rpcData).join(", "),
        // CRITICAL: Log raw RPC name fields to verify they're being returned
        rpc_a_user_first_name: rpcData.a_user_first_name,
        rpc_a_user_last_name: rpcData.a_user_last_name,
        rpc_b_user_first_name: rpcData.b_user_first_name,
        rpc_b_user_last_name: rpcData.b_user_last_name,
        rpc_a_user_first_name_type: typeof rpcData.a_user_first_name,
        rpc_b_user_first_name_type: typeof rpcData.b_user_first_name,
        rpc_a_user_first_name_is_null: rpcData.a_user_first_name === null,
        rpc_b_user_first_name_is_null: rpcData.b_user_first_name === null,
        // Log normalizer results
        normalizer_aFirst: aFirst,
        normalizer_aLast: aLast,
        normalizer_bFirst: bFirst,
        normalizer_bLast: bLast,
        // Log nested structure if exists
        has_attempt_a: !!(rpcAny.attempt_a),
        has_attempt_b: !!(rpcAny.attempt_b),
        attempt_a_user_first_name: rpcAny.attempt_a?.user_first_name,
        attempt_b_user_first_name: rpcAny.attempt_b?.user_first_name,
      });
    }
    
    // Build AttemptData objects - use scores from parseDimensionScores result
    // NOTE: Preserve null/undefined values from RPC - do NOT apply fallback here
    const attemptAData: AttemptData = {
      id: rpcData.attempt_a_id,
      user_first_name: attemptAFirstNameFinal, // May be null/undefined - fallback applied at display time
      user_last_name: attemptALastName,
      total_score: attemptATotalScore,
      dimension_scores: aDimsResult.scores, // Use scores from parse result
      score_band_id: rpcData.a_score_band_id,
      completed_at: new Date().toISOString(),
    };

    const attemptBData: AttemptData = {
      id: rpcData.attempt_b_id,
      user_first_name: attemptBFirstNameFinal, // May be null/undefined - fallback applied at display time
      user_last_name: attemptBLastName,
      total_score: attemptBTotalScore,
      dimension_scores: bDimsResult.scores, // Use scores from parse result
      score_band_id: rpcData.b_score_band_id,
      completed_at: new Date().toISOString(),
    };
    
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 Built AttemptData objects:", {
        attemptA: {
          id: attemptAData.id.substring(0, 8) + "...",
          user_first_name: attemptAData.user_first_name,
          user_last_name: attemptAData.user_last_name,
          total_score: attemptAData.total_score,
          dimension_scores: attemptAData.dimension_scores,
          nameSource: rpcData.a_user_first_name ? "RPC" : "fallback",
        },
        attemptB: {
          id: attemptBData.id.substring(0, 8) + "...",
          user_first_name: attemptBData.user_first_name,
          user_last_name: attemptBData.user_last_name,
          total_score: attemptBData.total_score,
          dimension_scores: attemptBData.dimension_scores,
          nameSource: rpcData.b_user_first_name ? "RPC" : "fallback",
        },
      });
    }

    // Validate attempt IDs are different
    if (attemptAData.id === attemptBData.id) {
      if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ CRITICAL: Attempt A and B have the same ID!", {
          attemptA_id: attemptAData.id,
          attemptB_id: attemptBData.id,
        });
      }
      setError("خطا در داده‌ها: شناسه‌های آزمون یکسان هستند.");
      setLoading(false);
      return;
    }
    
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] ✅ Attempt IDs validated as different:", {
        attemptA_id: attemptAData.id.substring(0, 8) + "...",
        attemptB_id: attemptBData.id.substring(0, 8) + "...",
      });
    }

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
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 Building comparison with:", {
        attemptA_id: attemptAData.id,
        attemptB_id: attemptBData.id,
        attemptA_dimension_scores: attemptAData.dimension_scores,
        attemptB_dimension_scores: attemptBData.dimension_scores,
        attemptA_total_score: attemptAData.total_score,
        attemptB_total_score: attemptBData.total_score,
      });
    }
    
    const builtComparison = buildComparison(attemptAData, attemptBData);
    
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 Built comparison dimensions:", {
        stickiness: {
          aScore: builtComparison.dimensions.stickiness.aScore,
          bScore: builtComparison.dimensions.stickiness.bScore,
          delta: builtComparison.dimensions.stickiness.delta,
        },
        pastBrooding: {
          aScore: builtComparison.dimensions.pastBrooding.aScore,
          bScore: builtComparison.dimensions.pastBrooding.bScore,
          delta: builtComparison.dimensions.pastBrooding.delta,
        },
        futureWorry: {
          aScore: builtComparison.dimensions.futureWorry.aScore,
          bScore: builtComparison.dimensions.futureWorry.bScore,
          delta: builtComparison.dimensions.futureWorry.delta,
        },
        interpersonal: {
          aScore: builtComparison.dimensions.interpersonal.aScore,
          bScore: builtComparison.dimensions.interpersonal.bScore,
          delta: builtComparison.dimensions.interpersonal.delta,
        },
        summarySimilarity: builtComparison.summarySimilarity,
      });
    }
    
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

      let rpcData = await loadComparePayload();

      // Fallback: If RPC returns empty but session might exist, try direct fetch
      if (!rpcData) {
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] ⚠️ RPC returned null - attempting fallback fetch");
        }
        
        try {
          // Fallback: Fetch session directly
          const { data: sessionData, error: sessionError } = await supabase
            .from("compare_sessions")
            .select("id, status, attempt_a_id, attempt_b_id, expires_at")
            .eq("invite_token", token)
            .maybeSingle();
          
          if (sessionData && sessionData.status === "completed" && sessionData.attempt_b_id) {
            if (import.meta.env.DEV) {
              console.log("[CompareResultPage] ✅ Fallback: Found completed session, fetching attempts");
            }
            
            // Fetch attempts A and B
            const { data: attemptsData, error: attemptsError } = await supabase
              .from("attempts")
              .select("id, total_score, dimension_scores, user_first_name, user_last_name, score_band_id")
              .in("id", [sessionData.attempt_a_id, sessionData.attempt_b_id]);
            
            if (attemptsData && attemptsData.length === 2) {
              const attemptA = attemptsData.find(a => a.id === sessionData.attempt_a_id);
              const attemptB = attemptsData.find(a => a.id === sessionData.attempt_b_id);
              
              if (attemptA && attemptB) {
                // Build payload manually
                rpcData = {
                  session_id: sessionData.id,
                  status: sessionData.status,
                  invite_token: token,
                  attempt_a_id: sessionData.attempt_a_id,
                  attempt_b_id: sessionData.attempt_b_id,
                  expires_at: sessionData.expires_at,
                  a_total_score: attemptA.total_score,
                  a_dimension_scores: attemptA.dimension_scores as any,
                  a_score_band_id: attemptA.score_band_id,
                  a_score_band_title: null,
                  a_user_first_name: attemptA.user_first_name,
                  a_user_last_name: attemptA.user_last_name,
                  b_total_score: attemptB.total_score,
                  b_dimension_scores: attemptB.dimension_scores as any,
                  b_score_band_id: attemptB.score_band_id,
                  b_score_band_title: null,
                  b_user_first_name: attemptB.user_first_name,
                  b_user_last_name: attemptB.user_last_name,
                };
                
                if (import.meta.env.DEV) {
                  console.log("[CompareResultPage] ✅ Fallback: Built payload from direct queries");
                }
              }
            }
          }
        } catch (fallbackError) {
          if (import.meta.env.DEV) {
            console.error("[CompareResultPage] ❌ Fallback fetch failed:", fallbackError);
          }
        }
      }

      if (!rpcData) {
        if (import.meta.env.DEV) {
          console.log("[CompareResultPage] ⚠️ No data after fallback - link invalid or expired");
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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:764',message:'About to process compare data',data:{status:rpcData.status,hasAttemptB:!!rpcData.attempt_b_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      try {
      await processCompareData(rpcData);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:768',message:'processCompareData completed successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        } catch (processError) {
        // DEV: Log process error
        if (import.meta.env.DEV) {
          const errorDetails = processError instanceof Error ? {
            name: processError.name,
            message: processError.message,
            stack: processError.stack,
          } : { raw: processError };
          console.error("[CompareResultPage] ❌ processCompareData error:", {
            error: processError,
            errorDetails,
            token: token ? token.substring(0, 12) + "..." : "N/A",
          });
          setDevLastError(processError);
        }
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:771',message:'processCompareData threw error',data:{errorMessage:processError instanceof Error?processError.message:'unknown',errorStack:processError instanceof Error?processError.stack:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        throw processError; // Re-throw to be caught by outer catch
      }
        setLoading(false);
      } catch (err) {
        // DEV: Log full error with stack
        if (import.meta.env.DEV) {
          const errorDetails = err instanceof Error ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          } : { raw: err };
          console.error("[CompareResultPage] ❌ Unexpected error in loadCompareResult:", {
          error: err,
            errorDetails,
          token: token ? token.substring(0, 12) + "..." : "N/A",
            loading,
            session: session ? { id: session.id.substring(0, 8) + "...", status: session.status } : null,
            attemptA: attemptA ? { id: attemptA.id.substring(0, 8) + "..." } : null,
            attemptB: attemptB ? { id: attemptB.id.substring(0, 8) + "..." } : null,
            comparison: comparison ? "exists" : null,
        });
          setDevLastError(err);
      }
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/fb99dfc7-ad09-4314-aff7-31e67b3ec776',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CompareResultPage.tsx:780',message:'Caught exception in loadCompareResult',data:{errorMessage:err instanceof Error?err.message:'unknown',errorName:err instanceof Error?err.name:'unknown',hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
        if (rpcData && rpcData.status === "completed" && rpcData.attempt_b_id && 
            rpcData.b_total_score !== null && rpcData.b_dimension_scores !== null) {
          stopPolling();
          await processCompareData(rpcData);
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
    // #region agent log - Safety: Log state branch
    console.log("[CompareResultPage] 📊 State branch: LOADING (loading && !session)");
    // #endregion
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-foreground/80">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // #region agent log - Safety: Log state branch
    console.log("[CompareResultPage] 📊 State branch: ERROR", { error });
    // #endregion
    
    // Check if error is about expired/invalid link
    const isExpiredError = error.includes("منقضی") || error.includes("معتبر نیست");
    
    // Handler for creating new invite (only if we have attemptA)
    const handleCreateNewInvite = async () => {
      if (!attemptA) {
        toast.error("برای ساخت لینک جدید، ابتدا باید آزمون را انجام دهید");
        return;
      }
      
      setIsCreatingInvite(true);
      try {
        const result = await createCompareInvite(attemptA.id, 10080);
        const newUrl = `${window.location.origin}/compare/result/${result.invite_token}`;
        // Navigate to new link
        navigate(newUrl);
        toast.success("لینک جدید ساخته شد");
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[CompareResultPage] Error creating new invite:", err);
        }
        toast.error("خطا در ساخت لینک جدید");
      } finally {
        setIsCreatingInvite(false);
      }
    };
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-xl text-foreground font-medium">
            {isExpiredError ? "لینک منقضی شده" : "مشکل در بارگذاری"}
          </h1>
          <p className="text-sm text-foreground/70 leading-relaxed">
            {error}
          </p>
          {isExpiredError && attemptA && (
            <Button
              onClick={handleCreateNewInvite}
              disabled={isCreatingInvite}
              className="rounded-xl min-h-[48px] px-8 bg-primary/80 hover:bg-primary mt-4"
            >
              {isCreatingInvite ? "در حال ساخت..." : "ساخت لینک جدید"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Waiting state (pending) - friendly loading with auto-retry
  if (session && (session.status !== "completed" || !session.attemptBId)) {
    // #region agent log - Safety: Log state branch
    console.log("[CompareResultPage] 📊 State branch: PENDING", {
      sessionStatus: session.status,
      hasAttemptBId: !!session.attemptBId,
      pollingCount,
    });
    // #endregion
    const elapsedSeconds = Math.floor((pollingCount * pollingInterval) / 1000);
    const remainingSeconds = Math.max(0, Math.floor((maxPollingTime - elapsedSeconds * 1000) / 1000));
    const hasTimedOut = elapsedSeconds * 1000 >= maxPollingTime;

    if (hasTimedOut) {
      // #region agent log - Safety: Log state branch
      console.log("[CompareResultPage] 📊 State branch: PENDING_TIMEOUT");
      // #endregion
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

    // #region agent log - Safety: Log state branch
    console.log("[CompareResultPage] 📊 State branch: PENDING_WAITING");
    // #endregion
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
    // #region agent log - Safety: Log state branch
    console.log("[CompareResultPage] 📊 State branch: ERROR_MISSING_DATA", {
      hasAttemptA: !!attemptA,
      hasAttemptB: !!attemptB,
      hasComparison: !!comparison,
    });
    // #endregion
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
    // #region agent log - Safety: Log state branch
    console.log("[CompareResultPage] 📊 State branch: STATE_A_PENDING", {
      hasAttemptA: !!attemptA,
      hasAttemptB: !!attemptB,
      hasComparison: !!comparison,
    });
    // #endregion
    const nameA = attemptA?.user_first_name || "شما";
    
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 Pending state - computed nameA:", {
        nameA,
        attemptA_user_first_name: attemptA?.user_first_name,
        attemptA_user_last_name: attemptA?.user_last_name,
      });
    }
    const dimensionKeys: DimensionKey[] = ["stickiness", "pastBrooding", "futureWorry", "interpersonal"];
    
    const handleCreateInvite = async () => {
      // Try to get attempt A ID from session or attemptA
      let attemptAId = session?.attemptAId;
      if (!attemptAId && attemptA) {
        attemptAId = attemptA.id;
      }
      
      // If still no attemptAId, try to get latest completed attempt (if userId available)
      if (!attemptAId && userId) {
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
        setInviteData({
          token: result.invite_token,
          url: `${window.location.origin}/compare/invite/${result.invite_token}`,
          expiresAt: result.expires_at,
        });
        setInviteModalOpen(true);
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

          {/* Pending State Message */}
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-base text-foreground/90 leading-relaxed font-medium">
                منتظر تکمیل آزمون توسط نفر دوم
              </p>
              
              {/* Show invite link if token exists */}
              {token && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/15">
                    <p className="text-xs text-muted-foreground/70 mb-2">لینک دعوت:</p>
                    <input
                      readOnly
                      value={`${window.location.origin}/compare/invite/${token}`}
                      className="w-full p-2 rounded-lg bg-black/20 border border-white/10 text-sm text-foreground font-mono break-all"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                  
                  {session?.expiresAt && (
                    <p className="text-xs text-foreground/70">
                      این لینک {formatExpiresAt(session.expiresAt)} معتبر است
                    </p>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={async () => {
                        const inviteUrl = `${window.location.origin}/compare/invite/${token}`;
                        try {
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(inviteUrl);
                            toast.success("لینک کپی شد");
                          } else {
                            const success = await copyText(inviteUrl);
                            if (success) {
                              toast.success("لینک کپی شد");
                            } else {
                              toast.error("خطا در کپی لینک");
                            }
                          }
                        } catch (error) {
                          if (import.meta.env.DEV) {
                            console.error("[CompareResultPage] Error copying link:", error);
                          }
                          toast.error("خطا در کپی لینک");
                        }
                      }}
                      variant="outline"
                      className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
                    >
                      <Copy className="w-4 h-4 ml-2" />
                      کپی لینک
                    </Button>
                    {navigator.share && (
                      <Button
                        onClick={async () => {
                          try {
                            await navigator.share({
                              title: "دعوت به مقایسه‌ی ذهن‌ها",
                              text: "یک نفر دوست داشته الگوی ذهنی شما و خودش رو کنار هم ببینه.",
                              url: `${window.location.origin}/compare/invite/${token}`,
                            });
                          } catch (error: any) {
                            if (error.name !== "AbortError" && import.meta.env.DEV) {
                              console.error("[CompareResultPage] Error sharing:", error);
                            }
                          }
                        }}
                        className="flex-1 rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40"
                      >
                        <Share2 className="w-4 h-4 ml-2" />
                        اشتراک‌گذاری
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* If no token, show create invite button */}
              {!token && (
                <>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    برای دیدن مقایسه، نفر دوم باید آزمون را انجام دهد
                  </p>
                  <Button
                    onClick={handleCreateInvite}
                    disabled={isCreatingInvite}
                    className="rounded-xl min-h-[48px] px-8 bg-primary/80 hover:bg-primary"
                  >
                    {isCreatingInvite ? "در حال ساخت..." : "ساخت لینک دعوت"}
                  </Button>
                </>
              )}
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
  // Defensive: If missing data, show error state instead of blank
  if (!session || !attemptA || !attemptB || !comparison) {
    // #region agent log - Safety: Log state branch
    console.log("[CompareResultPage] 📊 State branch: STATE_B_ERROR_MISSING_DATA", {
      hasSession: !!session,
      hasAttemptA: !!attemptA,
      hasAttemptB: !!attemptB,
      hasComparison: !!comparison,
    });
    // #endregion
    if (import.meta.env.DEV) {
      console.warn("[CompareResultPage] ⚠️ Missing data for full render:", {
        hasSession: !!session,
        hasAttemptA: !!attemptA,
        hasAttemptB: !!attemptB,
        hasComparison: !!comparison,
        sessionStatus: session?.status,
        attemptAId: attemptA?.id?.substring(0, 8) + "..." || "null",
        attemptBId: attemptB?.id?.substring(0, 8) + "..." || "null",
      });
    }
    // Show error state instead of blank
    return (
      <div className="min-h-screen p-4 py-8 bg-gradient-to-b from-background to-background/50">
        <div className="max-w-4xl mx-auto space-y-8">
          {devDebugPanel}
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-md">
              <h1 className="text-xl text-foreground font-medium">مشکل در بارگذاری</h1>
              <p className="text-sm text-foreground/70 leading-relaxed">
                یه مشکلی پیش اومده و این مقایسه الان در دسترس نیست.
                <br />
                اگه دوباره امتحانش کنی یا لینک جدید بسازی، درست می‌شه.
              </p>
              {import.meta.env.DEV && (
                <div className="text-xs text-foreground/60 font-mono p-4 bg-black/20 rounded-lg text-left space-y-2 mt-4">
                  <div><strong>Missing:</strong></div>
                  <div>Session: {session ? "✓" : "✗"}</div>
                  <div>Attempt A: {attemptA ? "✓" : "✗"}</div>
                  <div>Attempt B: {attemptB ? "✓" : "✗"}</div>
                  <div>Comparison: {comparison ? "✓" : "✗"}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute display names: first_name + last_name if exists
  // Only apply fallback if name is truly empty (null, undefined, or empty string after trim)
  // Check for real names vs fallback text to avoid double fallback
  const buildDisplayName = (firstName: string | null, lastName: string | null, fallback: string): string => {
    // Check if firstName is null, undefined, empty string, or fallback text
    if (!firstName || (typeof firstName === "string" && firstName.trim() === "") || firstName === "نفر اول" || firstName === "نفر دوم") {
      if (import.meta.env.DEV) {
        console.log("[CompareResultPage] 🔍 buildDisplayName: Using fallback", {
          firstName,
          lastName,
          fallback,
          firstNameType: typeof firstName,
          firstNameIsNull: firstName === null,
          firstNameIsUndefined: firstName === undefined,
          firstNameIsEmpty: firstName === "",
        });
      }
      return fallback;
    }
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const result = fullName || fallback;
    if (import.meta.env.DEV) {
      console.log("[CompareResultPage] 🔍 buildDisplayName: Built name", {
        firstName,
        lastName,
        fullName,
        result,
        fallback,
      });
    }
    return result;
  };
  
  const nameA = buildDisplayName(attemptA.user_first_name, attemptA.user_last_name, "نفر اول");
  const nameB = buildDisplayName(attemptB.user_first_name, attemptB.user_last_name, "نفر دوم");
  
  if (import.meta.env.DEV) {
    console.log("[CompareResultPage] 🔍 Computed display names (FINAL):", {
      token: token ? token.substring(0, 12) + "..." : "N/A",
      attempt_a_id: attemptA.id,
      attempt_b_id: attemptB.id,
      nameA,
      nameB,
      attemptA_user_first_name: attemptA.user_first_name,
      attemptA_user_first_name_type: typeof attemptA.user_first_name,
      attemptA_user_first_name_is_null: attemptA.user_first_name === null,
      attemptA_user_first_name_is_empty: attemptA.user_first_name === "",
      attemptA_user_last_name: attemptA.user_last_name,
      attemptB_user_first_name: attemptB.user_first_name,
      attemptB_user_first_name_type: typeof attemptB.user_first_name,
      attemptB_user_first_name_is_null: attemptB.user_first_name === null,
      attemptB_user_first_name_is_empty: attemptB.user_first_name === "",
      attemptB_user_last_name: attemptB.user_last_name,
      final_display_names: {
        nameA,
        nameB,
        nameA_is_fallback: nameA === "نفر اول",
        nameB_is_fallback: nameB === "نفر دوم",
      },
    });
  }

  // Compute similarity from dimension deltas - only valid dimensions (null-safe)
  const dimensionDeltas: Record<DimensionKey, number> = {
    stickiness: comparison?.dimensions?.stickiness?.delta ?? 0,
    pastBrooding: comparison?.dimensions?.pastBrooding?.delta ?? 0,
    futureWorry: comparison?.dimensions?.futureWorry?.delta ?? 0,
    interpersonal: comparison?.dimensions?.interpersonal?.delta ?? 0,
  };
  const overallSimilarity = computeSimilarity(dimensionDeltas);

  // Get largest difference dimension for central interpretation - only valid dimensions (null-safe)
  // Note: dimensionKeys is already declared at component level (line 423)
  const largestDiff = getLargestDifferenceDimension({
    stickiness: {
      ...(comparison?.dimensions?.stickiness || { delta: 0, relation: "similar" as const, direction: "equal" as const, aScore: 0, bScore: 0, aLevel: "low" as const, bLevel: "low" as const }),
    },
    pastBrooding: {
      ...(comparison?.dimensions?.pastBrooding || { delta: 0, relation: "similar" as const, direction: "equal" as const, aScore: 0, bScore: 0, aLevel: "low" as const, bLevel: "low" as const }),
    },
    futureWorry: {
      ...(comparison?.dimensions?.futureWorry || { delta: 0, relation: "similar" as const, direction: "equal" as const, aScore: 0, bScore: 0, aLevel: "low" as const, bLevel: "low" as const }),
    },
    interpersonal: {
      ...(comparison?.dimensions?.interpersonal || { delta: 0, relation: "similar" as const, direction: "equal" as const, aScore: 0, bScore: 0, aLevel: "low" as const, bLevel: "low" as const }),
    },
  });

  // Get similarities and differences - filter out unknown dimensions (null-safe)
  const validDimensionsForComparison = dimensionKeys.filter(key => {
    const dim = comparison?.dimensions?.[key];
    return dim && !isNaN(dim.delta ?? NaN) && !isNaN(dim.aScore ?? NaN) && !isNaN(dim.bScore ?? NaN);
  });

  const dimensionsForComparison: Record<DimensionKey, { relation: "similar" | "different" | "very_different"; delta: number }> = {} as any;
  for (const key of validDimensionsForComparison) {
    const dim = comparison?.dimensions?.[key];
    if (dim) {
      dimensionsForComparison[key] = {
        relation: dim.relation,
        delta: dim.delta,
      };
    }
  }

  const { similarities, differences } = getSimilaritiesAndDifferences(dimensionsForComparison);
  
  // Calculate misunderstanding risk - only from valid dimensions
  // Build validDimensionsForRisk BEFORE using it (null-safe)
  const validDimensionsForRisk: Record<DimensionKey, { relation: "similar" | "different" | "very_different" }> = {} as any;
  for (const key of validDimensionsForComparison) {
    const dim = comparison?.dimensions?.[key];
    if (dim) {
      validDimensionsForRisk[key] = {
        relation: dim.relation,
      };
    }
  }

  // Calculate misunderstanding risk - only from valid dimensions
  const misunderstandingRisk = getMisunderstandingRisk(validDimensionsForRisk);

  // Get top dimensions for each person (may be null if all dimensions are unknown)
  const topDimensionA = getTopDimensionForPerson(attemptA.dimension_scores);
  const topDimensionB = getTopDimensionForPerson(attemptB.dimension_scores);

  if (import.meta.env.DEV) {
    console.log("[CompareResultPage] Top dimensions:", {
      topDimensionA,
      topDimensionB,
      attemptA_scores: attemptA.dimension_scores,
      attemptB_scores: attemptB.dimension_scores,
      // Verify topDimensionA matches highest score in attemptA.dimension_scores
      topDimensionA_score: topDimensionA ? attemptA.dimension_scores[topDimensionA] : null,
      topDimensionB_score: topDimensionB ? attemptB.dimension_scores[topDimensionB] : null,
    });
  }
  
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

  // PDF handlers
  const handleDownloadPdf = async () => {
    if (!comparison || !attemptA || !attemptB) {
      toast.error("خطا در تولید PDF: داده‌های کافی موجود نیست");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const filename = generateComparePdfFilename(nameA, nameB);
      
      const pdfDocument = (
        <ComparePdfDocument
          nameA={nameA}
          nameB={nameB}
          comparison={comparison}
          attemptA={attemptA}
          attemptB={attemptB}
          topDimensionA={topDimensionA || undefined}
          topDimensionB={topDimensionB || undefined}
          overallSimilarity={overallSimilarity}
          misunderstandingRisk={misunderstandingRisk}
          largestDiff={largestDiff || undefined}
          similarities={similarities}
          differences={differences}
          getDimensionNameForSnapshot={getDimensionNameForSnapshot}
          generateMindSnapshot={generateMindSnapshot}
          generateCentralInterpretation={generateCentralInterpretation}
          generateNeutralBlendedInterpretation={generateNeutralBlendedInterpretation}
          generateMisunderstandingLoop={generateMisunderstandingLoop}
          getCombinedContextualTriggers={getCombinedContextualTriggers}
          getSeenUnseenConsequences={getSeenUnseenConsequences}
          generateEmotionalExperience={generateEmotionalExperience}
          getConversationStarters={getConversationStarters}
          getMisunderstandingRiskText={getMisunderstandingRiskText}
          getSimilarityComplementarySentence={getSimilarityComplementarySentence}
          getAlignmentLabel={getAlignmentLabel}
          generateDimensionSummary={generateDimensionSummary}
          DIMENSION_LABELS={DIMENSION_LABELS}
          DIMENSION_DEFINITIONS={DIMENSION_DEFINITIONS}
          LEVEL_LABELS={LEVEL_LABELS}
          SIMILARITY_LABELS={SIMILARITY_LABELS}
          SAFETY_STATEMENT={SAFETY_STATEMENT}
        />
      );

      const blob = await generatePdfBlob(pdfDocument);
      downloadPdf(blob, filename);
      
      await trackShareEvent({
        cardType: "compare_minds",
        action: "download_pdf",
        compareSessionId: session?.id ?? null,
        inviteToken: token ?? null,
      });

      toast.success("PDF دانلود شد");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ Error generating PDF:", error);
        console.error("[CompareResultPage] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`خطا در تولید PDF: ${errorMessage}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (!comparison || !attemptA || !attemptB) {
      toast.error("خطا در تولید PDF: داده‌های کافی موجود نیست");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const filename = generateComparePdfFilename(nameA, nameB);
      
      const pdfDocument = (
        <ComparePdfDocument
          nameA={nameA}
          nameB={nameB}
          comparison={comparison}
          attemptA={attemptA}
          attemptB={attemptB}
          topDimensionA={topDimensionA || undefined}
          topDimensionB={topDimensionB || undefined}
          overallSimilarity={overallSimilarity}
          misunderstandingRisk={misunderstandingRisk}
          largestDiff={largestDiff || undefined}
          similarities={similarities}
          differences={differences}
          getDimensionNameForSnapshot={getDimensionNameForSnapshot}
          generateMindSnapshot={generateMindSnapshot}
          generateCentralInterpretation={generateCentralInterpretation}
          generateNeutralBlendedInterpretation={generateNeutralBlendedInterpretation}
          generateMisunderstandingLoop={generateMisunderstandingLoop}
          getCombinedContextualTriggers={getCombinedContextualTriggers}
          getSeenUnseenConsequences={getSeenUnseenConsequences}
          generateEmotionalExperience={generateEmotionalExperience}
          getConversationStarters={getConversationStarters}
          getMisunderstandingRiskText={getMisunderstandingRiskText}
          getSimilarityComplementarySentence={getSimilarityComplementarySentence}
          getAlignmentLabel={getAlignmentLabel}
          generateDimensionSummary={generateDimensionSummary}
          DIMENSION_LABELS={DIMENSION_LABELS}
          DIMENSION_DEFINITIONS={DIMENSION_DEFINITIONS}
          LEVEL_LABELS={LEVEL_LABELS}
          SIMILARITY_LABELS={SIMILARITY_LABELS}
          SAFETY_STATEMENT={SAFETY_STATEMENT}
        />
      );

      const blob = await generatePdfBlob(pdfDocument);
      const result = await sharePdf(blob, filename);

      if (result.method === "share" && result.success) {
        await trackShareEvent({
          cardType: "compare_minds",
          action: "share_pdf",
          compareSessionId: session?.id ?? null,
          inviteToken: token ?? null,
        });
        toast.success("PDF به اشتراک گذاشته شد");
      } else if (result.method === "download") {
        await trackShareEvent({
          cardType: "compare_minds",
          action: "download_pdf",
          compareSessionId: session?.id ?? null,
          inviteToken: token ?? null,
        });
        toast.info("مرورگر شما اشتراک‌گذاری مستقیم PDF را پشتیبانی نمی‌کند؛ فایل دانلود شد.");
      } else {
        toast.error("خطا در اشتراک‌گذاری PDF");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[CompareResultPage] ❌ Error sharing PDF:", error);
        console.error("[CompareResultPage] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`خطا در تولید PDF: ${errorMessage}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Course URL - from single source of truth
  const COURSE_URL = LINKS.MIND_CHATTER_COURSE;

  // #region agent log - Safety: Log state branch
  if (import.meta.env.DEV) {
    console.log("[CompareResultPage] 📊 State branch: STATE_B_COMPLETED", {
      hasSession: !!session,
      hasAttemptA: !!attemptA,
      hasAttemptB: !!attemptB,
      hasComparison: !!comparison,
      nameA,
      nameB,
    });
  }
  // #endregion

  return (
    <div className="min-h-screen p-4 py-8 bg-gradient-to-b from-background to-background/50">
      <div id="compare-pdf-root" className="max-w-4xl mx-auto space-y-8" ref={compareContentRef}>
        {/* STATE C: Expired link note (if applicable) */}
        {isExpired && (
          <Card className="bg-orange-500/10 backdrop-blur-2xl border-orange-500/20">
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                این لینک منقضی شده است
              </p>
              <p className="text-xs text-foreground/70 leading-relaxed">
                برای ساخت لینک جدید، از صفحه نتیجه آزمون خود استفاده کنید
              </p>
            </CardContent>
          </Card>
        )}

        {/* SECTION 1: HEADER (Identity) */}
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
          <p className="text-xs text-foreground/60 mt-2">
            ترجمه‌ی تفاوت‌های ذهنی به زبان رابطه
          </p>
          </div>

        {/* SECTION 2: SNAPSHOT (3-Second Understanding) */}
        <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
          <CardContent className="pt-6 space-y-4">
            {/* Chips */}
            <div className="flex flex-wrap justify-center gap-3">
              <span className="inline-block px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-sm font-medium text-foreground">
                شباهت کلی: {SIMILARITY_LABELS[overallSimilarity]}
              </span>
              <span className="inline-block px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30 text-sm font-medium text-foreground">
                ریسک سوءتفاهم: {misunderstandingRisk === "low" ? "کم" : misunderstandingRisk === "medium" ? "متوسط" : "زیاد"}
              </span>
          </div>

            {/* Risk explanation text */}
            <p className="text-center text-sm text-foreground/80 leading-relaxed">
              {getMisunderstandingRiskText(misunderstandingRisk)}
            </p>

            {/* Central sentence */}
            {(() => {
              const maxDelta = largestDiff?.delta || 0;
              if (maxDelta < 0.8) {
                // All aligned - show similarity message
                const largestSimilar = getLargestSimilarityDimension({
                  stickiness: { delta: comparison?.dimensions?.stickiness?.delta ?? 0, relation: comparison?.dimensions?.stickiness?.relation ?? "similar" },
                  pastBrooding: { delta: comparison?.dimensions?.pastBrooding?.delta ?? 0, relation: comparison?.dimensions?.pastBrooding?.relation ?? "similar" },
                  futureWorry: { delta: comparison?.dimensions?.futureWorry?.delta ?? 0, relation: comparison?.dimensions?.futureWorry?.relation ?? "similar" },
                  interpersonal: { delta: comparison?.dimensions?.interpersonal?.delta ?? 0, relation: comparison?.dimensions?.interpersonal?.relation ?? "similar" },
                });
                
                if (largestSimilar) {
                  return (
                    <p className="text-center text-base text-foreground/90 leading-relaxed font-medium">
                      بزرگ‌ترین همسویی ذهنی شما در: {getDimensionNameForSnapshot(largestSimilar)}
                    </p>
                  );
                } else {
                  return (
                    <p className="text-center text-base text-foreground/90 leading-relaxed font-medium">
                      در این مقایسه، تفاوت برجسته‌ای دیده نمی‌شود؛ بیشتر همسویی مشاهده می‌شود.
                    </p>
                  );
                }
              } else if (largestDiff) {
                return (
                  <p className="text-center text-base text-foreground/90 leading-relaxed font-medium">
                    بزرگ‌ترین تفاوت ذهنی شما در: {getDimensionNameForSnapshot(largestDiff.key)}
                  </p>
                );
              }
              return null;
            })()}

            {/* Complementary sentence */}
            <p className="text-center text-sm text-foreground/80 leading-relaxed">
              {getSimilarityComplementarySentence(overallSimilarity)}
            </p>
          </CardContent>
        </Card>

        {/* SECTION 3: MIND PROFILES FOR EACH PERSON */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topDimensionA && (
            <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">سبک ذهنی {nameA}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {generateMindSnapshot(nameA, topDimensionA, attemptA.dimension_scores)}
                </p>
              </CardContent>
            </Card>
          )}
          {topDimensionB && (
            <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">سبک ذهنی {nameB}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {generateMindSnapshot(nameB, topDimensionB, attemptB.dimension_scores)}
                </p>
          </CardContent>
        </Card>
          )}
        </div>

        {/* SECTION 4: 4-DIMENSION MENTAL MAP */}
        <div className="space-y-4">
          <h2 className="text-xl text-foreground font-medium text-center mb-4">نقشه‌ی ذهنی</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dimensionKeys.map((key) => {
              const dim = comparison?.dimensions?.[key];
              
              // Defensive check: skip if dimension data is missing
              if (!dim) {
                if (import.meta.env.DEV) {
                  console.warn(`[CompareResultPage] Missing dimension data for ${key}`);
                }
                return null;
              }
              
              // Check if dimension is unknown (NaN) - null-safe
              const isUnknown = !dim || isNaN(dim.delta ?? NaN) || isNaN(dim.aScore ?? NaN) || isNaN(dim.bScore ?? NaN);
              
              const alignment = isUnknown ? "نامشخص" : getAlignmentLabel(dim.delta ?? 0);
              
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
                         <span className="text-foreground/90">
                           {isUnknown ? "نامشخص" : (LEVEL_LABELS[dim.aLevel] || "نامشخص")}
                         </span>
                </div>
                      <div>
                        <span className="text-foreground/60">{nameB}:</span>{" "}
                         <span className="text-foreground/90">
                           {isUnknown ? "نامشخص" : (LEVEL_LABELS[dim.bLevel] || "نامشخص")}
                         </span>
            </div>
                    </div>

                    {/* Dimension summary */}
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-xs text-foreground/80 leading-relaxed">
                        {isUnknown 
                          ? "این بُعد قابل محاسبه نیست (داده ناقص است)."
                          : generateDimensionSummary(dim.relation, dim.aLevel, dim.bLevel)
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* SECTION 5: SIMILARITIES AND DIFFERENCES */}
        <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-xl">شباهت‌ها و تفاوت‌های کلیدی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Similarities */}
            <div>
              <h3 className="text-base font-medium text-foreground mb-3">شباهت‌ها</h3>
              {similarities.length > 0 ? (
                <ul className="space-y-2">
                  {similarities.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-green-400 shrink-0 mt-1">•</span>
                      <span>{DIMENSION_LABELS[key]}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-foreground/70 italic">
                  همسویی کامل کمتر دیده می‌شود؛ این نشانه‌ی تفاوت سبک‌هاست، نه مشکل.
                </p>
              )}
            </div>

            {/* Differences */}
            <div>
              <h3 className="text-base font-medium text-foreground mb-3">تفاوت‌ها</h3>
              {differences.length > 0 ? (
                <ul className="space-y-2">
                  {differences.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-orange-400 shrink-0 mt-1">•</span>
                      <span>{DIMENSION_LABELS[key]} {comparison?.dimensions?.[key]?.relation === "very_different" && "(خیلی متفاوت)"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-foreground/70 italic">
                  در این نتایج، تفاوت چشمگیری بین شما دیده نشد. این یعنی در چند الگوی کلیدی، واکنش ذهنی‌تان شبیه‌تر است.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 6: CENTRAL HUMAN INTERPRETATION */}
        {(() => {
          const maxDelta = largestDiff?.delta || 0;
          if (maxDelta < 0.8) {
            // All aligned - use largest similarity dimension
            const largestSimilar = getLargestSimilarityDimension({
              stickiness: { delta: comparison?.dimensions?.stickiness?.delta ?? 0, relation: comparison?.dimensions?.stickiness?.relation ?? "similar" },
              pastBrooding: { delta: comparison?.dimensions?.pastBrooding?.delta ?? 0, relation: comparison?.dimensions?.pastBrooding?.relation ?? "similar" },
              futureWorry: { delta: comparison?.dimensions?.futureWorry?.delta ?? 0, relation: comparison?.dimensions?.futureWorry?.relation ?? "similar" },
              interpersonal: { delta: comparison?.dimensions?.interpersonal?.delta ?? 0, relation: comparison?.dimensions?.interpersonal?.relation ?? "similar" },
            });
            
            if (largestSimilar) {
              const dim = comparison?.dimensions?.[largestSimilar];
              return (
                <Card className="bg-primary/10 backdrop-blur-2xl border-primary/20 shadow-xl">
                  <CardContent className="pt-6">
                    <div className="prose prose-invert max-w-none">
                      <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-line text-center">
                        {generateCentralInterpretation(
                          largestSimilar,
                          nameA,
                          nameB,
                          dim.aLevel,
                          dim.bLevel,
                          dim.aScore,
                          dim.bScore,
                          dim.relation,
                          dim.direction
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          }
          
          return largestDiff ? (
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
                      largestDiff.bScore,
                      comparison?.dimensions?.[largestDiff.key]?.relation ?? "similar",
                      comparison?.dimensions?.[largestDiff.key]?.direction ?? "equal"
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
          );
        })()}

        {/* CTA Section - Enhanced Prominent Course CTA */}
        <Card className="bg-gradient-to-br from-green-500/25 via-green-500/20 to-green-500/15 backdrop-blur-2xl border-2 border-green-500/40 shadow-2xl shadow-green-500/20">
          <CardHeader className="text-center pb-3">
            <div className="flex items-center justify-center gap-3 mb-3">
              <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" />
              <CardTitle className="text-2xl sm:text-3xl text-foreground font-bold">
                دوره ذهن‌وراج
              </CardTitle>
            </div>
            <div className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-green-500/30 border-2 border-green-500/50 text-green-200 text-sm sm:text-base font-bold shadow-lg">
              پیشنهاد اختصاصی برای شما
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* Enhanced Reason Why */}
            <div className="space-y-3">
              <h3 className="text-lg sm:text-xl text-foreground font-semibold text-center">
                چرا دوره ذهن‌وراج؟
              </h3>
              <p className="text-base sm:text-lg text-foreground/95 leading-relaxed text-center px-3 font-medium">
                این کارت فقط الگوها رو نشان می‌دهد. اگر دوست داری مهارت «توقف نشخوار» و «خارج شدن از چرخه فکر» را مرحله‌به‌مرحله یاد بگیری، دوره ذهن‌وراج دقیقاً برای همین طراحی شده.
              </p>
            </div>
            
            {/* Enhanced Action Button */}
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => window.open(COURSE_URL, "_blank")}
                className="w-full sm:w-auto rounded-xl min-h-[60px] px-10 text-lg font-bold bg-green-500 hover:bg-green-400 border-2 border-green-400/50 shadow-xl shadow-green-500/30 transition-all hover:scale-105"
                size="lg"
              >
                <BookOpen className="w-6 h-6 ml-2" />
                مشاهده و تهیه دوره ذهن‌وراج
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 7: MISUNDERSTANDING LOOP */}
        {(() => {
          const maxDelta = largestDiff?.delta || 0;
          const dimensionToUse = maxDelta < 0.8 
            ? getLargestSimilarityDimension({
                stickiness: { delta: comparison?.dimensions?.stickiness?.delta ?? 0, relation: comparison?.dimensions?.stickiness?.relation ?? "similar" },
                pastBrooding: { delta: comparison?.dimensions?.pastBrooding?.delta ?? 0, relation: comparison?.dimensions?.pastBrooding?.relation ?? "similar" },
                futureWorry: { delta: comparison?.dimensions?.futureWorry?.delta ?? 0, relation: comparison?.dimensions?.futureWorry?.relation ?? "similar" },
                interpersonal: { delta: comparison?.dimensions?.interpersonal?.delta ?? 0, relation: comparison?.dimensions?.interpersonal?.relation ?? "similar" },
              })
            : largestDiff?.key;
          
          if (!dimensionToUse) return null;
          
          const relation = maxDelta < 0.8 ? "similar" : (comparison?.dimensions?.[dimensionToUse]?.relation ?? "similar");
          const title = relation === "similar" 
            ? "وقتی این همسویی فعال می‌شود، معمولاً این چرخه شکل می‌گیرد:"
            : "وقتی این تفاوت فعال می‌شود، معمولاً این چرخه شکل می‌گیرد:";
          
          return (
          <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
            <CardHeader>
                <CardTitle className="text-center text-xl">{title}</CardTitle>
            </CardHeader>
              <CardContent className="space-y-4">
                {generateMisunderstandingLoop(dimensionToUse, relation).map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-primary/80 shrink-0 mt-1 font-medium">{index + 1}.</span>
                  <p className="text-sm text-foreground/90 leading-relaxed flex-1">{step}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          );
        })()}

        {/* SECTION 8: TRIGGER SITUATIONS */}
        {(() => {
          const maxDelta = largestDiff?.delta || 0;
          const dimensionToUse = maxDelta < 0.8 
            ? getLargestSimilarityDimension({
                stickiness: { delta: comparison?.dimensions?.stickiness?.delta ?? 0, relation: comparison?.dimensions?.stickiness?.relation ?? "similar" },
                pastBrooding: { delta: comparison?.dimensions?.pastBrooding?.delta ?? 0, relation: comparison?.dimensions?.pastBrooding?.relation ?? "similar" },
                futureWorry: { delta: comparison?.dimensions?.futureWorry?.delta ?? 0, relation: comparison?.dimensions?.futureWorry?.relation ?? "similar" },
                interpersonal: { delta: comparison?.dimensions?.interpersonal?.delta ?? 0, relation: comparison?.dimensions?.interpersonal?.relation ?? "similar" },
              })
            : largestDiff?.key;
          
          if (!dimensionToUse) return null;
          
          return (
            <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-center text-xl">موقعیت‌های فعال‌ساز</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {getCombinedContextualTriggers(dimensionToUse, topDimensionB).map((trigger, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-primary/80 shrink-0 mt-1">•</span>
                      <span>{trigger}</span>
                </li>
                  ))}
            </ul>
              </CardContent>
            </Card>
          );
        })()}

        {/* SECTION 9: SEEN/UNSEEN CONSEQUENCES */}
        {(() => {
          const maxDelta = largestDiff?.delta || 0;
          const dimensionToUse = maxDelta < 0.8 
            ? getLargestSimilarityDimension({
                stickiness: { delta: comparison?.dimensions?.stickiness?.delta ?? 0, relation: comparison?.dimensions?.stickiness?.relation ?? "similar" },
                pastBrooding: { delta: comparison?.dimensions?.pastBrooding?.delta ?? 0, relation: comparison?.dimensions?.pastBrooding?.relation ?? "similar" },
                futureWorry: { delta: comparison?.dimensions?.futureWorry?.delta ?? 0, relation: comparison?.dimensions?.futureWorry?.relation ?? "similar" },
                interpersonal: { delta: comparison?.dimensions?.interpersonal?.delta ?? 0, relation: comparison?.dimensions?.interpersonal?.relation ?? "similar" },
              })
            : largestDiff?.key;
          
          if (!dimensionToUse) return null;
          
          return (
            <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-center text-xl">پیامد دیده نشدن / دیده شدن</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const consequences = getSeenUnseenConsequences(dimensionToUse);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <h4 className="text-sm font-medium text-red-300 mb-2">اگر دیده نشود</h4>
                  <ul className="space-y-1 text-xs text-foreground/80">
                        {consequences.unseen.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                  </ul>
                </div>
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <h4 className="text-sm font-medium text-green-300 mb-2">اگر دیده شود</h4>
                  <ul className="space-y-1 text-xs text-foreground/80">
                        {consequences.seen.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                  </ul>
                </div>
              </div>
                );
              })()}
            </CardContent>
          </Card>
          );
        })()}

        {/* SECTION 10: EMOTIONAL EXPERIENCE */}
        {(() => {
          const maxDelta = largestDiff?.delta || 0;
          const dimensionToUse = maxDelta < 0.8 
            ? getLargestSimilarityDimension({
                stickiness: { delta: comparison?.dimensions?.stickiness?.delta ?? 0, relation: comparison?.dimensions?.stickiness?.relation ?? "similar" },
                pastBrooding: { delta: comparison?.dimensions?.pastBrooding?.delta ?? 0, relation: comparison?.dimensions?.pastBrooding?.relation ?? "similar" },
                futureWorry: { delta: comparison?.dimensions?.futureWorry?.delta ?? 0, relation: comparison?.dimensions?.futureWorry?.relation ?? "similar" },
                interpersonal: { delta: comparison?.dimensions?.interpersonal?.delta ?? 0, relation: comparison?.dimensions?.interpersonal?.relation ?? "similar" },
              })
            : largestDiff?.key;
          
          if (!dimensionToUse) return null;
          
          const relation = maxDelta < 0.8 ? "similar" : (comparison?.dimensions?.[dimensionToUse]?.relation ?? "similar");
          const dim = comparison?.dimensions?.[dimensionToUse];
          
          const emotionalExp = generateEmotionalExperience(
            dimensionToUse,
            nameA,
            nameB,
            dim.aLevel,
            dim.bLevel,
            relation
          );
          
          const title = relation === "similar"
            ? "این همسویی ممکن است این‌طور حس شود"
            : "این تفاوت ممکن است این‌طور حس شود";
          
          return (
            <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-center text-xl">{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {emotionalExp.shared ? (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-sm text-foreground/90">{emotionalExp.shared}</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <p className="text-sm text-foreground/90">
                        <span className="font-medium">{nameA}:</span> {emotionalExp.forA}
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <p className="text-sm text-foreground/90">
                        <span className="font-medium">{nameB}:</span> {emotionalExp.forB}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* SECTION 11: CONVERSATION STARTERS */}
        {(() => {
          const maxDelta = largestDiff?.delta || 0;
          const dimensionToUse = maxDelta < 0.8 
            ? getLargestSimilarityDimension({
                stickiness: { delta: comparison?.dimensions?.stickiness?.delta ?? 0, relation: comparison?.dimensions?.stickiness?.relation ?? "similar" },
                pastBrooding: { delta: comparison?.dimensions?.pastBrooding?.delta ?? 0, relation: comparison?.dimensions?.pastBrooding?.relation ?? "similar" },
                futureWorry: { delta: comparison?.dimensions?.futureWorry?.delta ?? 0, relation: comparison?.dimensions?.futureWorry?.relation ?? "similar" },
                interpersonal: { delta: comparison?.dimensions?.interpersonal?.delta ?? 0, relation: comparison?.dimensions?.interpersonal?.relation ?? "similar" },
              })
            : largestDiff?.key;
          
          if (!dimensionToUse) return null;
          
          const relation = maxDelta < 0.8 ? "similar" : (comparison?.dimensions?.[dimensionToUse]?.relation ?? "similar");
          const questions = getConversationStarters(dimensionToUse, relation);
          
          return (
        <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
          <CardHeader>
                <CardTitle className="text-center text-xl">شروع گفت‌وگو</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-sm text-foreground/90 leading-relaxed">{q}</p>
              </div>
            ))}
          </CardContent>
        </Card>
          );
        })()}

        {/* SECTION 12: FINAL SUMMARY */}
        <Card className="bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <p className="text-sm text-foreground/90 leading-relaxed text-center whitespace-pre-line">
              این صفحه قرار نیست چیزی را درست یا غلط کند.
              {"\n"}
              فقط نشان می‌دهد ذهن‌ها چطور متفاوت واکنش نشان می‌دهند.
              {"\n"}
              دیدن این تفاوت‌ها می‌تواند نقطه‌ی شروع فهم باشد، نه بحث.
            </p>
          </CardContent>
        </Card>

        {/* SECTION 13: SAFETY & UNCERTAINTY (Always Render, Distinct Box) */}
        <Card className="bg-blue-500/10 backdrop-blur-2xl border-blue-500/20 shadow-xl">
          <CardContent className="pt-6">
            <p className="text-xs text-foreground/80 leading-relaxed text-center whitespace-pre-line">
              {SAFETY_STATEMENT}
            </p>
          </CardContent>
        </Card>

        {/* Share & PDF Section */}
        <Card className="bg-white/5 backdrop-blur-2xl border-white/10">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  variant="outline"
                  className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
                  data-pdf-ignore="true"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                      در حال تولید...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 ml-2" />
                      دانلود PDF
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSharePdf}
                  disabled={isGeneratingPdf}
                  className="flex-1 rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40"
                  data-pdf-ignore="true"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                      در حال تولید...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 ml-2" />
                      اشتراک‌گذاری PDF
                    </>
                  )}
                </Button>
              </div>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="w-full rounded-xl min-h-[44px] bg-white/5 border-white/10 text-sm"
                data-pdf-ignore="true"
              >
                <LinkIcon className="w-4 h-4 ml-2" />
                کپی لینک مقایسه
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Dev Panel - Enhanced diagnostics */}
        {import.meta.env.DEV && (
          <Card className="bg-black/90 border border-white/20 shadow-xl mt-6">
            <CardHeader>
              <CardTitle className="text-sm text-yellow-400 font-mono">Compare Result Dev Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs font-mono">
              <div className="space-y-1">
                <div><span className="text-gray-400">Token:</span> {token ? token.substring(0, 12) + "..." : "N/A"}</div>
                {session && (
                  <>
                    <div><span className="text-gray-400">Session Status:</span> {session.status}</div>
                    <div><span className="text-gray-400">Session ID:</span> {session.id.substring(0, 8)}...</div>
                    <div><span className="text-gray-400">Attempt A ID:</span> {session.attemptAId?.substring(0, 8) + "..." || "N/A"}</div>
                    <div><span className="text-gray-400">Attempt B ID:</span> {session.attemptBId?.substring(0, 8) + "..." || "N/A"}</div>
                    {session.expiresAt && (
                      <div><span className="text-gray-400">Expires:</span> {new Date(session.expiresAt).toISOString()}</div>
                    )}
                  </>
                )}
              </div>
              {attemptA && (
            <div className="space-y-2">
                  <div className="text-yellow-400 font-bold">Attempt A:</div>
                  <div className="text-foreground/80 pl-4 space-y-1">
                    <div><span className="text-gray-400">ID:</span> {attemptA.id.substring(0, 8)}...</div>
                    <div><span className="text-gray-400">Name:</span> {attemptA.user_first_name ?? "null"} {attemptA.user_last_name || ""}</div>
                    <div><span className="text-gray-400">Total Score:</span> {attemptA.total_score ?? "null"}</div>
                    <div><span className="text-gray-400">Dimension Scores:</span> {attemptA.dimension_scores ? JSON.stringify(attemptA.dimension_scores) : "null"}</div>
                    <div><span className="text-gray-400">Dim Scores Present:</span> {attemptA.dimension_scores !== null && attemptA.dimension_scores !== undefined ? "YES" : "NO"}</div>
              </div>
              </div>
              )}
              {attemptB && (
                <div className="space-y-2">
                  <div className="text-yellow-400 font-bold">Attempt B:</div>
                  <div className="text-foreground/80 pl-4 space-y-1">
                    <div><span className="text-gray-400">ID:</span> {attemptB.id.substring(0, 8)}...</div>
                    <div><span className="text-gray-400">Name:</span> {attemptB.user_first_name ?? "null"} {attemptB.user_last_name || ""}</div>
                    <div><span className="text-gray-400">Total Score:</span> {attemptB.total_score ?? "null"}</div>
                    <div><span className="text-gray-400">Dimension Scores:</span> {attemptB.dimension_scores ? JSON.stringify(attemptB.dimension_scores) : "null"}</div>
                    <div><span className="text-gray-400">Dim Scores Present:</span> {attemptB.dimension_scores !== null && attemptB.dimension_scores !== undefined ? "YES" : "NO"}</div>
              </div>
              </div>
              )}
              {comparison && (
                <div className="space-y-2">
                  <div className="text-yellow-400 font-bold">Comparison:</div>
                  <div className="text-foreground/80 pl-4 space-y-1">
                    <div><span className="text-gray-400">Similarity:</span> {comparison.summarySimilarity}</div>
                    <div><span className="text-gray-400">Dimensions:</span></div>
                    {dimensionKeys.map((key) => {
                      const dim = comparison?.dimensions?.[key];
                      const isUnknown = isNaN(dim.delta);
                      return (
                        <div key={key} className="pl-4 text-foreground/70">
                          {key}: A={isUnknown ? "?" : dim.aScore.toFixed(1)}, B={isUnknown ? "?" : dim.bScore.toFixed(1)}, 
                          Δ={isUnknown ? "?" : dim.delta.toFixed(1)}, {dim.relation}
              </div>
                      );
                    })}
              </div>
            </div>
              )}
              {error && (
                <div className="space-y-1">
                  <div className="text-red-400 font-bold">Last Error:</div>
                  <div className="text-red-300 pl-4">{error}</div>
          </div>
        )}
            </CardContent>
          </Card>
        )}
              </div>

      {/* Invite Modal */}
      <AppModal
        isOpen={inviteModalOpen}
        title="لینک دعوت"
        onClose={() => {
          setInviteModalOpen(false);
          setInviteData(null);
        }}
      >
        <div className="space-y-4">
          {inviteData ? (
            <>
              <div className="p-4 rounded-2xl bg-black/20 border border-white/15">
                <p className="text-xs text-muted-foreground/70 mb-2">لینک دعوت:</p>
                <input
                  readOnly
                  value={inviteData.url}
                  className="w-full p-2 rounded-lg bg-black/20 border border-white/10 text-sm text-foreground font-mono break-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>

              {inviteData.expiresAt && (
                <p className="text-xs text-foreground/70 text-center">
                  این لینک {formatExpiresAt(inviteData.expiresAt)} معتبر است
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={async () => {
                    if (!inviteData) return;
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(inviteData.url);
                        toast.success("لینک کپی شد");
                      } else {
                        const success = await copyText(inviteData.url);
                        if (success) {
                          toast.success("لینک کپی شد");
                        } else {
                          toast.error("خطا در کپی لینک");
                        }
                      }
                    } catch (error) {
                      if (import.meta.env.DEV) {
                        console.error("[CompareResultPage] Error copying link:", error);
                      }
                      toast.error("خطا در کپی لینک");
                    }
                  }}
                  variant="outline"
                  className="flex-1 rounded-xl min-h-[44px] bg-white/10 border-white/20"
                >
                  <Copy className="w-4 h-4 ml-2" />
                  کپی لینک
                </Button>
                {navigator.share && (
                  <Button
                    onClick={async () => {
                      if (!inviteData) return;
                      try {
                        await navigator.share({
                          title: "دعوت به مقایسه‌ی ذهن‌ها",
                          text: "یک نفر دوست داشته الگوی ذهنی شما و خودش رو کنار هم ببینه.",
                          url: inviteData.url,
                        });
                      } catch (error: any) {
                        if (error.name !== "AbortError") {
                          if (import.meta.env.DEV) {
                            console.error("[CompareResultPage] Error sharing:", error);
                          }
                        }
                      }
                    }}
                    className="flex-1 rounded-xl min-h-[44px] bg-primary/80 hover:bg-primary border-primary/40"
                  >
                    <Share2 className="w-4 h-4 ml-2" />
                    اشتراک‌گذاری
                  </Button>
              )}
            </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center">
              <p className="text-sm text-foreground/80">در حال ساخت لینک...</p>
          </div>
        )}
      </div>
      </AppModal>
    </div>
  );
}
