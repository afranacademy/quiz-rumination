import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandingPage as LandingPageComponent } from "@/app/components/LandingPage";
import { normalizePhone } from "@/features/quiz/utils/normalizeMobile";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { supabase } from "@/lib/supabaseClient";
import { getQuizId } from "@/features/attempts/getQuizId";
import { startAttempt } from "@/features/attempts/createAttempt";
import { getAttemptStorageKey } from "@/features/attempts/getAttemptStorageKey";
import type { QuizIntake } from "@/features/quiz/types";

export default function LandingPage() {
  const navigate = useNavigate();
  const { userId, loading: authLoading, error: authError } = useAnonAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
  });
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    mobile?: string;
  }>({});
  const [isStarting, setIsStarting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleFieldChange = (field: "firstName" | "lastName" | "mobile", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    const firstNameTrimmed = formData.firstName.trim();
    if (!firstNameTrimmed || firstNameTrimmed.length < 2) {
      newErrors.firstName = "نام را وارد کنید";
    }

    const lastNameTrimmed = formData.lastName.trim();
    if (!lastNameTrimmed || lastNameTrimmed.length < 2) {
      newErrors.lastName = "نام خانوادگی را وارد کنید";
    }

    const mobileTrimmed = formData.mobile.trim();
    if (!mobileTrimmed) {
      newErrors.mobile = "شماره موبایل را وارد کنید";
    } else {
      const normalized = normalizePhone(mobileTrimmed);
      if (!normalized) {
        newErrors.mobile = "شماره موبایل معتبر نیست";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = async () => {
    if (!validateForm()) {
      return;
    }

    // Wait for auth if still loading
    if (authLoading) {
      console.log("[LandingPage] Waiting for auth...");
      return;
    }

    // Check auth
    if (!userId) {
      const errorMsg = authError || "User not authenticated";
      console.error("[LandingPage] User not authenticated:", errorMsg);
      setLastError(errorMsg);
      alert(`خطا در احراز هویت: ${errorMsg}`);
      return;
    }

    setIsStarting(true);
    setLastError(null);

    try {
      // Get current user to ensure session is valid
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error(`Failed to get user: ${userError?.message || "No user"}`);
      }

      const firstNameTrimmed = formData.firstName.trim();
      const lastNameTrimmed = formData.lastName.trim();
      const mobileTrimmed = formData.mobile.trim();
      const normalized = normalizePhone(mobileTrimmed);

      if (!normalized) {
        setErrors({ mobile: "شماره موبایل معتبر نیست" });
        setIsStarting(false);
        return;
      }

      // Get quiz ID
      const quizId = await getQuizId();
      console.log("[LandingPage] Quiz ID:", quizId);

      // Create attempt in Supabase
      const attemptId = await startAttempt({
        quizId,
        participantId: user.id,
        userFirstName: firstNameTrimmed,
        userLastName: lastNameTrimmed || null,
        userPhone: normalized.e164,
        userAgent: navigator.userAgent,
      });

      console.log("[LandingPage] Attempt created:", attemptId);

      // Store intake and attempt ID in localStorage
      const intake: QuizIntake = {
        firstName: firstNameTrimmed,
        lastName: lastNameTrimmed,
        mobile: normalized.e164,
        mobileRegion: normalized.region,
        createdAt: new Date().toISOString(),
      };

      sessionStorage.setItem("quiz_intake_v1", JSON.stringify(intake));
      
      // Store attempt ID in scoped storage key (no compare token for normal flow)
      const storageKey = getAttemptStorageKey(quizId, user.id, null);
      localStorage.setItem(storageKey, attemptId);
      
      if (import.meta.env.DEV) {
        console.log("[LandingPage] Stored attempt ID in scoped key:", storageKey);
      }

      // Navigate to quiz
      navigate("/quiz");
    } catch (error) {
      console.error("[LandingPage] Error starting quiz:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setLastError(errorMsg);
      if (error instanceof Error && error.message.includes("RLS")) {
        alert(`خطا در دسترسی به دیتابیس: ${error.message}`);
      } else {
        alert(`خطا در شروع آزمون: ${errorMsg}`);
      }
    } finally {
      setIsStarting(false);
    }
  };

  // Show auth error if present
  if (authError && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl text-destructive">خطا در احراز هویت</h2>
          <p className="text-sm text-foreground/80">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary rounded-lg"
          >
            رفرش صفحه
          </button>
        </div>
      </div>
    );
  }

  return (
    <LandingPageComponent
      onStart={handleStart}
      formData={formData}
      errors={errors}
      onFieldChange={handleFieldChange}
      isLoading={isStarting || authLoading}
    />
  );
}
