import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./Layout";
import { Homepage } from "./pages/Homepage";
import { Booking } from "./pages/Booking";
import { Services } from "./pages/Services";
import { Team } from "./pages/Team";
import { About } from "./pages/About";
import { Progress } from "./pages/Progress";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { PatientPortal } from "./pages/PatientPortal";
import { NotFound } from "./pages/NotFound";
import { AuthProvider } from "./providers/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Homepage />} />
            <Route path="booking" element={<Booking />} />
            <Route path="services" element={<Services />} />
            <Route path="team" element={<Team />} />
            <Route path="about" element={<About />} />
            <Route path="progress" element={<Progress />} />
            <Route path="pricing" element={<Navigate to="/services" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal"
            element={
              <ProtectedRoute>
                <PatientPortal />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
