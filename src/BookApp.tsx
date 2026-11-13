import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { supabase } from "./lib/supabase";
import { BookLayout } from "./features/book/BookLayout";
import { BookSignUp } from "./features/book/pages/BookSignUp";
import { BookLogin } from "./features/book/pages/BookLogin";
import { BookLanding } from "./features/book/pages/BookLanding";
import { StepProfile } from "./features/book/pages/StepProfile";
import { StepSchedule } from "./features/book/pages/StepSchedule";
import { StepPayment } from "./features/book/pages/StepPayment";
import { BookSuccess } from "./features/book/pages/BookSuccess";
import { BookCancel } from "./features/book/pages/BookCancel";
import { BookWizardProvider } from "./features/book/wizardContext";
import { Loader2 } from "lucide-react";

/**
 * Halaman yang menangani OAuth callback (?code=...) — Supabase JS dengan
 * detectSessionInUrl:true otomatis exchange, tapi kadang butuh eksplisit
 * exchangeCodeForSession untuk lebih pasti. Sekaligus tampilkan loading state
 * yang jelas biar user tidak merasa "hang".
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  const location = useLocation();
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (code && !session && !exchanging) {
      setExchanging(true);
      // Force-exchange kalau Supabase belum sempat process (defensif).
      supabase.auth.exchangeCodeForSession(code).finally(() => {
        setExchanging(false);
      });
    }
  }, [location.search, session, exchanging]);

  if (loading || exchanging) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-3" size={28} />
          <p className="text-text-secondary text-sm">Memuat sesi Anda…</p>
        </div>
      </div>
    );
  }
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/signup?next=${next}`} replace />;
  }
  return <>{children}</>;
}

export default function BookApp({ basename = "/book" }: { basename?: string }) {
  return (
    <AuthProvider>
      <BookWizardProvider>
        <BrowserRouter basename={basename}>
          <Routes>
            <Route element={<BookLayout />}>
              <Route index element={<BookLanding />} />
              <Route path="signup" element={<BookSignUp />} />
              <Route path="login" element={<BookLogin />} />
              <Route
                path="profile"
                element={<RequireAuth><StepProfile /></RequireAuth>}
              />
              <Route
                path="schedule"
                element={<RequireAuth><StepSchedule /></RequireAuth>}
              />
              <Route
                path="payment"
                element={<RequireAuth><StepPayment /></RequireAuth>}
              />
              <Route path="success" element={<BookSuccess />} />
              <Route path="cancel" element={<BookCancel />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BookWizardProvider>
    </AuthProvider>
  );
}
