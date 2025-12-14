import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { getAnswerLabel } from "@/features/compare/getAnswerLabel";
import type { ComparisonResult } from "@/features/compare/computeComparison";

const API_URL = import.meta.env.VITE_NETLIFY_FUNCTIONS_URL || "";

export default function ComparePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("لینک دعوت معتبر نیست.");
      setLoading(false);
      return;
    }

    const fetchComparison = () => {
      fetch(`${API_URL}/.netlify/functions/getComparison`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "expired") {
            setError("لینک دعوت منقضی شده است.");
            setLoading(false);
          } else if (data.status === "pending") {
            // Keep loading and retry after delay
            setTimeout(fetchComparison, 2000);
          } else if (data.comparison) {
            setComparison(data.comparison);
            setLoading(false);
          } else {
            setError("خطا در دریافت مقایسه.");
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch comparison:", err);
          setError("خطا در دریافت مقایسه.");
          setLoading(false);
        });
    };

    fetchComparison();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto text-center space-y-4">
          <BrandLogo size="md" />
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 space-y-4">
            <h1 className="text-xl sm:text-2xl text-foreground font-semibold">
              در حال آماده‌سازی مقایسه...
            </h1>
            <p className="text-sm sm:text-base text-foreground/80 leading-7">
              لطفاً صبر کنید تا مقایسه آماده بشه.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto text-center space-y-6">
          <BrandLogo size="md" />
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 space-y-4">
            <h1 className="text-xl sm:text-2xl text-foreground font-semibold">خطا</h1>
            <p className="text-sm sm:text-base text-foreground/80 leading-7">{error}</p>
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
    <div className="min-h-screen px-4 py-6" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-none sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-center mb-4">
          <BrandLogo size="md" />
        </div>

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/20 p-6 sm:p-8 text-center space-y-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl text-foreground font-semibold">
            ذهن ما کنار هم
          </h1>

          {/* Similarity Indicator */}
          <div className="space-y-2">
            <div className="text-4xl sm:text-5xl font-bold text-primary">
              {comparison.similarityPercent}%
            </div>
            <p className="text-base sm:text-lg text-foreground/90">{comparison.similarityLabel}</p>
          </div>
        </div>

        {/* Similarities Section */}
        {comparison.similarities.length > 0 && (
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6 text-right">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
              شباهت‌های ذهنی
            </h2>
            <div className="space-y-4">
              {comparison.similarities.map((item, index) => (
                <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-sm sm:text-base text-foreground/90 leading-7 mb-2">
                    {item.questionText}
                  </p>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-6">{item.insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Differences Section */}
        {comparison.differences.length > 0 && (
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6 text-right">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
              تفاوت‌های ذهنی
            </h2>
            <div className="space-y-4">
              {comparison.differences.map((item, index) => (
                <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-sm sm:text-base text-foreground/90 leading-7 mb-2">
                    {item.questionText}
                  </p>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-6">{item.insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Questions Detail */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-xl shadow-black/10 p-4 sm:p-5 md:p-6 text-right">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
            جزئیات سؤال‌به‌سؤال
          </h2>
          <div className="space-y-4">
            {comparison.allQuestions.map((item, index) => (
              <div key={index} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <p className="text-sm sm:text-base text-foreground/90 leading-7 font-medium">
                  {item.questionText}
                </p>
                <div className="flex items-center justify-between text-xs sm:text-sm text-foreground/70">
                  <span>پاسخ شما: {getAnswerLabel(item.inviteeAnswer)}</span>
                  <span>پاسخ طرف مقابل: {getAnswerLabel(item.inviterAnswer)}</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/80 leading-6 pt-2 border-t border-white/10">
                  {item.insight}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Closing Note */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 text-center">
          <p className="text-xs sm:text-sm text-foreground/80 leading-7">
            تفاوت‌های ذهنی طبیعی‌اند؛ هدف این مقایسه، فهم بهتره نه تغییر دادن همدیگه.
          </p>
        </div>

        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="w-full rounded-2xl min-h-[48px] bg-white/10 border-white/20"
        >
          بازگشت به صفحه اصلی
        </Button>
      </div>
    </div>
  );
}
