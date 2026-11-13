import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import BookApp from "./BookApp";
import AssessmentApp from "./AssessmentApp";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Booking online & formulir pendaftaran sekarang berupa PATH di domain utama:
//   flourishcare.id/book        (dulu book.flourishcare.id)
//   flourishcare.id/assessment  (dulu assessment.flourishcare.id)
// Subdomain lama (bila masih diarahkan ke Vercel) otomatis dialihkan ke path baru.

function isUnder(path: string, base: string) {
  return path === base || path.startsWith(base + "/");
}

function redirectLegacySubdomain(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname, pathname, search, hash } = window.location;
  const map: Record<string, string> = { "book.": "/book", "assessment.": "/assessment" };
  for (const [prefix, base] of Object.entries(map)) {
    if (hostname.startsWith(prefix)) {
      const root = hostname.slice(prefix.length);
      const rest = pathname === "/" ? "" : pathname;
      window.location.replace(`https://${root}${base}${rest}${search}${hash}`);
      return true;
    }
  }
  return false;
}

function pickApp() {
  const path = typeof window === "undefined" ? "/" : window.location.pathname;
  if (isUnder(path, "/book")) return <BookApp basename="/book" />;
  if (isUnder(path, "/assessment")) return <AssessmentApp basename="/assessment" />;
  return <App />;
}

if (!redirectLegacySubdomain()) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>{pickApp()}</ErrorBoundary>
    </StrictMode>
  );
}
