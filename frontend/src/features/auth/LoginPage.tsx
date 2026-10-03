import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import {
  Bus,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const queryParams = new URLSearchParams(location.search);
  const redirectPath = queryParams.get("redirect") || "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please provide both username and password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await loginApi(username.trim(), password);
      login({ access: data.access, refresh: data.refresh }, data.user);

      // Redirect logic: if redirect specified, use it. Otherwise, operators go to /operator, commuters to /commuter
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else if (data.user.role === "operator" || data.user.role === "admin") {
        navigate("/operator", { replace: true });
      } else {
        navigate("/commuter", { replace: true });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        "Invalid username or password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080d18] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient glowing gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center">
        <Link to="/commuter" className="flex items-center gap-2.5 mb-2 group">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shadow-lg shadow-cyan-500/20">
            <Bus size={22} />
          </div>
          <span className="font-black text-2xl tracking-tight text-slate-100">
            Bus<span className="text-cyan-400">AI</span>
          </span>
        </Link>
        <p className="text-xs text-slate-400">
          Intelligent Delhi Transit Operations & Passenger Platform
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-slate-900/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 shadow-2xl relative z-10">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-100">Welcome Back</h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to access live Delhi bus telemetry and fleet tools.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User size={15} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. commuter_delhi or dispatcher"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={15} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Role Access Indicator */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-300 font-semibold text-xs">
              <ShieldCheck size={13} className="text-cyan-400" />
              <span>Universal Account Access</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Certified Fleet Operators are automatically routed to the Real-Time Dispatch Sentinel. Passengers access live vehicle search.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account yet?{" "}
            <Link
              to="/register"
              className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Sign Up here
            </Link>
          </p>

          <div className="mt-4">
            <Link
              to="/commuter"
              className="text-[11px] text-slate-500 hover:text-slate-400 transition-colors"
            >
              ← Continue as Guest Passenger
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
