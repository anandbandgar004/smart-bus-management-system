import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import type { UserRole } from "../types/auth";
import { ShieldAlert, ArrowLeft, LogIn } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen w-full bg-[#080d18] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900/80 border border-rose-500/30 backdrop-blur-xl shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert size={32} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Operator Access Restricted
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Your account is registered as a{" "}
              <span className="font-semibold text-emerald-400 uppercase">
                {user.role}
              </span>
              . The Fleet Operations Console requires certified Fleet Dispatcher
              credentials.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              to="/commuter"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 transition-all"
            >
              <ArrowLeft size={14} />
              Return to Commuter Passenger Map
            </Link>

            <Link
              to="/login?switch=true"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-all"
            >
              <LogIn size={14} />
              Sign in with an Operator Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
