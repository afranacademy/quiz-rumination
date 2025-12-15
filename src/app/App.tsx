import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import LandingPage from "@/pages/LandingPage";
import QuizPage from "@/pages/QuizPage";
import ResultPage from "@/pages/ResultPage";
import InvitePage from "@/pages/InvitePage";
import ComparePage from "@/pages/ComparePage";
import CompareInvitePage from "@/pages/CompareInvitePage";
import CompareLandingPage from "@/pages/CompareLandingPage";
import CompareResultPage from "@/pages/CompareResultPage";
import CompareSessionPage from "@/pages/CompareSessionPage";
import { useAnonAuth } from "@/hooks/useAnonAuth";

// DEV-only: Import the latest compare shortcut page
// The component itself handles DEV-only checks, so this import is safe
// Vite will tree-shake this in production if the route is not rendered
import CompareDevLatestPage from "@/pages/CompareDevLatestPage";

export default function App() {
  // Initialize anonymous auth for all visitors
  const { userId, loading: authLoading, error: authError } = useAnonAuth();

  // Log auth state for debugging
  if (authError) {
    console.error("[App] Auth error:", authError);
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      {/* Premium calm gradient: deep blue-gray → charcoal → soft neutral */}
      <div className="fixed inset-0 -z-10" style={{
        background: 'linear-gradient(135deg, #1a1f2e 0%, #252a3a 25%, #2d3442 50%, #252a3a 75%, #1a1f2e 100%)',
      }} />
      {/* Subtle overlay for depth */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-black/5" />
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/result/:level" element={<ResultPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/compare/invite/:token" element={<CompareInvitePage />} />
          <Route path="/compare/result/:token" element={<CompareResultPage />} />
          {/* DEV-only: Latest compare shortcut - route only exists in DEV mode */}
          {import.meta.env.DEV && (
            <Route path="/compare/dev/latest" element={<CompareDevLatestPage />} />
          )}
          <Route path="/compare/session/:id" element={<CompareSessionPage />} />
          <Route path="/compare/:token" element={<CompareLandingPage />} />
          <Route path="/compare" element={<CompareLandingPage />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </div>
  );
}
