import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

/**
 * DEV-ONLY: Page that fetches the latest completed compare token
 * and redirects to the compare result page.
 * 
 * Route: /compare/dev/latest
 * 
 * This is a development shortcut to quickly open the latest compare card
 * without needing to manually copy/paste tokens.
 */
export default function CompareDevLatestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DEV-only check: redirect if not in DEV mode
  useEffect(() => {
    if (!import.meta.env.DEV) {
      if (import.meta.env.DEV) {
        console.warn("[CompareDevLatestPage] This page is DEV-only. Redirecting...");
      }
      navigate("/", { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const fetchLatestToken = async () => {
      try {
        setLoading(true);
        setError(null);

        if (import.meta.env.DEV) {
          console.log("[CompareDevLatestPage] 🔵 Fetching latest completed compare token...");
        }

        const { data: token, error: rpcError } = await supabase.rpc(
          "get_latest_completed_compare_token"
        );

        if (rpcError) {
          if (import.meta.env.DEV) {
            console.error("[CompareDevLatestPage] ❌ RPC Error:", {
              code: rpcError.code,
              message: rpcError.message,
              details: rpcError.details,
              hint: rpcError.hint,
            });
          }
          setError(`خطا در دریافت توکن: ${rpcError.message}`);
          setLoading(false);
          return;
        }

        if (import.meta.env.DEV) {
          console.log("[CompareDevLatestPage] ✅ RPC Response:", {
            token: token ? token.substring(0, 12) + "..." : null,
            hasToken: !!token,
          });
        }

        if (!token || typeof token !== "string") {
          if (import.meta.env.DEV) {
            console.log("[CompareDevLatestPage] ⚠️ No completed compare session found");
          }
          setError(null); // Not an error, just no data
          setLoading(false);
          return;
        }

        // Navigate to the canonical compare result route
        const targetPath = `/compare/result/${token}`;
        if (import.meta.env.DEV) {
          console.log("[CompareDevLatestPage] ✅ Navigating to:", targetPath);
        }
        navigate(targetPath, { replace: true });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("[CompareDevLatestPage] ❌ Unexpected error:", err);
        }
        setError(err instanceof Error ? err.message : "خطای ناشناخته");
        setLoading(false);
      }
    };

    fetchLatestToken();
  }, [navigate]);

  // DEV-only check: show "Not Found" if not in DEV mode
  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl text-foreground font-medium">Not Found</h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-foreground/80">در حال بارگذاری...</p>
          <p className="text-xs text-foreground/60">در حال دریافت آخرین توکن مقایسه...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-xl text-foreground font-medium">خطا</h1>
          <p className="text-sm text-foreground/70">{error}</p>
        </div>
      </div>
    );
  }

  // No token found (not an error, just no data)
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-xl text-foreground font-medium">هیچ مقایسه‌ی کامل‌شده‌ای پیدا نشد</h1>
        <p className="text-sm text-foreground/70">
          هیچ جلسه‌ی مقایسه‌ای با وضعیت "completed" در دیتابیس وجود ندارد.
        </p>
        {import.meta.env.DEV && (
          <p className="text-xs text-foreground/60 mt-4">
            برای استفاده از این صفحه، ابتدا یک جلسه‌ی مقایسه را کامل کنید.
          </p>
        )}
      </div>
    </div>
  );
}

