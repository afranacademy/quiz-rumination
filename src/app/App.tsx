import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import QuizPage from "@/pages/QuizPage";
import ResultPage from "@/pages/ResultPage";
import InvitePage from "@/pages/InvitePage";
import ComparePage from "@/pages/ComparePage";

export default function App() {
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
          <Route path="/compare/:token" element={<ComparePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
