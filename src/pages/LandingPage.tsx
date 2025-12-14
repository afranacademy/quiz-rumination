import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LandingPage as LandingPageComponent } from "@/app/components/LandingPage";
import { normalizePhone } from "@/features/quiz/utils/normalizeMobile";
import type { QuizIntake } from "@/features/quiz/types";

export default function LandingPage() {
  const navigate = useNavigate();
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

  const handleStart = () => {
    if (!validateForm()) {
      return;
    }

    const firstNameTrimmed = formData.firstName.trim();
    const lastNameTrimmed = formData.lastName.trim();
    const mobileTrimmed = formData.mobile.trim();
    const normalized = normalizePhone(mobileTrimmed);

    if (!normalized) {
      setErrors({ mobile: "شماره موبایل معتبر نیست" });
      return;
    }

    const intake: QuizIntake = {
      firstName: firstNameTrimmed,
      lastName: lastNameTrimmed,
      mobile: normalized.e164,
      mobileRegion: normalized.region,
      createdAt: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem("quiz_intake_v1", JSON.stringify(intake));
      navigate("/quiz");
    } catch (error) {
      console.error("Failed to save to sessionStorage:", error);
      navigate("/quiz");
    }
  };

  return (
    <LandingPageComponent
      onStart={handleStart}
      formData={formData}
      errors={errors}
      onFieldChange={handleFieldChange}
    />
  );
}
