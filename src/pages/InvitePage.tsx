import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

const API_URL = import.meta.env.VITE_NETLIFY_FUNCTIONS_URL || "";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "pending" | "expired" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("لینک دعوت معتبر نیست.");
      setStatus("expired");
      return;
    }

    // Check invite status
    fetch(`${API_URL}/.netlify/functions/getInviteStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "expired") {
          setStatus("expired");
        } else {
          setStatus("ready");
        }
      })
      .catch((err) => {
        console.error("Failed to check invite status:", err);
        setError("خطا در بررسی لینک دعوت.");
        setStatus("expired");
      });
  }, [token]);

  if (showQuiz && token) {
    // Navigate to quiz with invite token
    return <QuizPageComponent onComplete={async (quizAnswers) => {
      // This will be handled by QuizPage with invite token from URL
    }} />;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-foreground/80">در حال بررسی...</p>
        </div>
      </div>
    );
  }

  if (status === "expired" || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto text-center space-y-6">
          <BrandLogo size="md" />
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 space-y-4">
            <h1 className="text-xl sm:text-2xl text-foreground font-semibold">
              لینک دعوت منقضی شده
            </h1>
            <p className="text-sm sm:text-base text-foreground/80 leading-7">
              {error || "این لینک دعوت منقضی شده یا معتبر نیست."}
            </p>
            <Button
              onClick={() => navigate("/")}
              className="w-full rounded-2xl min-h-[48px] bg-primary/80 hover:bg-primary"
            >
              بازگشت به صفحه اصلی
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto text-center space-y-6">
        <BrandLogo size="md" />
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 space-y-6">
          <h1 className="text-xl sm:text-2xl text-foreground font-semibold">
            دعوت به مقایسه‌ی ذهن‌ها
          </h1>
          <p className="text-sm sm:text-base text-foreground/80 leading-7">
            یک نفر دوست داشته الگوی ذهنی شما و خودش رو کنار هم ببینه.
          </p>
          <p className="text-xs text-foreground/70 leading-6">
            با انجام این آزمون، می‌تونید الگوهای ذهنی‌تون رو با هم مقایسه کنین و درک بهتری از همدیگه پیدا کنین.
          </p>
          <Button
            onClick={() => navigate(`/quiz?invite=${token}`)}
            className="w-full rounded-2xl min-h-[48px] bg-primary/80 hover:bg-primary"
          >
            شروع آزمون
          </Button>
        </div>
      </div>
    </div>
  );
}
