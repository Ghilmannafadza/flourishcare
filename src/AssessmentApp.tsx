import { Seo } from "./components/Seo";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider";
import { AssessmentLayout } from "./features/assessment/AssessmentLayout";
import { AssessmentIntro } from "./features/assessment/pages/AssessmentIntro";
import { AssessmentForm } from "./features/assessment/pages/AssessmentForm";
import { AssessmentSuccess } from "./features/assessment/pages/AssessmentSuccess";

export default function AssessmentApp({ basename = "/assessment" }: { basename?: string }) {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Seo base={basename} />
        <Routes>
          <Route element={<AssessmentLayout />}>
            <Route index element={<AssessmentIntro />} />
            <Route path="form" element={<AssessmentForm />} />
            <Route path="success" element={<AssessmentSuccess />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
