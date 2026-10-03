import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import OperatorDashboard from "./features/operator/OperatorDashboard";
import CommuterDashboard from "./features/commuter/CommuterDashboard";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080d18] font-sans">
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Operator Console (Restricted to Operator / Admin roles) */}
          <Route
            path="/operator"
            element={
              <ProtectedRoute allowedRoles={["operator", "admin"]}>
                <div className="flex flex-col h-screen w-full overflow-hidden">
                  <Navbar />
                  <div className="flex-1 overflow-hidden">
                    <OperatorDashboard />
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Commuter Live Map (Accessible to both Guests and Authenticated Commuters) */}
          <Route
            path="/commuter"
            element={
              <div className="flex flex-col h-screen w-full overflow-hidden">
                <Navbar />
                <div className="flex-1 relative overflow-hidden">
                  <CommuterDashboard />
                </div>
              </div>
            }
          />

          {/* Fallbacks */}
          <Route path="/" element={<Navigate to="/commuter" replace />} />
          <Route path="*" element={<Navigate to="/commuter" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
