import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import {
  Bus,
  Shield,
  KeyRound,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [role, setRole] = useState<"commuter" | "operator">("commuter");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [operatorPasscode, setOperatorPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (role === "operator" && !operatorPasscode.trim()) {
      setError("Fleet Operator Secret Passcode is required.");
      return;
    }

    setLoading(true);

    try {
      const data = await registerApi({
        username: username.trim(),
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
        operator_passcode: role === "operator" ? operatorPasscode.trim() : undefined,
      });

      // Save tokens and user in store for instant authenticated session
      login({ access: data.access, refresh: data.refresh }, data.user);

      // Route directly to respective interface
      if (data.user.role === "operator" || data.user.role === "admin") {
        navigate("/operator", { replace: true });
      } else {
        navigate("/commuter", { replace: true });
      }
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.operator_passcode) {
        setError(Array.isArray(resp.operator_passcode) ? resp.operator_passcode[0] : resp.operator_passcode);
      } else if (resp?.username) {
        setError(Array.isArray(resp.username) ? resp.username[0] : resp.username);
      } else if (resp?.email) {
        setError(Array.isArray(resp.email) ? resp.email[0] : resp.email);
      } else if (resp?.detail) {
        setError(resp.detail);
      } else {
        setError("Registration failed. Please check your information.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080d18] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans py-12">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

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
          Create an account to personalize live tracking or access operations
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-slate-900/85 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 shadow-2xl relative z-10">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-100">Create an Account</h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose your role to get started with Delhi transit telemetry.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => {
              setRole("commuter");
              setError(null);
            }}
            className={clsx(
              "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between",
              role === "commuter"
                ? "bg-cyan-500/15 border-cyan-500/60 shadow-md shadow-cyan-500/10"
                : "bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-70"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                <Bus size={15} className={role === "commuter" ? "text-cyan-400" : "text-slate-400"} />
                Commuter
              </span>
              {role === "commuter" && <CheckCircle2 size={14} className="text-cyan-400" />}
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Live bus tracking, route searching & favorite stops.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole("operator");
              setError(null);
            }}
            className={clsx(
              "p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between",
              role === "operator"
                ? "bg-amber-500/15 border-amber-500/60 shadow-md shadow-amber-500/10"
                : "bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-70"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                <Shield size={15} className={role === "operator" ? "text-amber-400" : "text-slate-400"} />
                Fleet Operator
              </span>
              {role === "operator" && <CheckCircle2 size={14} className="text-amber-400" />}
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Operations console, AI dispatch & fleet telemetry.
            </p>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle size={16} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Operator Passcode Field (Shown only when role === 'operator') */}
          {role === "operator" && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 animate-in fade-in slide-in-from-top-2 duration-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <KeyRound size={13} />
                  <span>Operator Secret Passcode</span>
                </label>
                <span className="text-[10px] text-amber-400/80 uppercase font-semibold tracking-wider">
                  Verification Required
                </span>
              </div>
              <input
                type="password"
                value={operatorPasscode}
                onChange={(e) => setOperatorPasscode(e.target.value)}
                placeholder="Enter dispatcher passcode (e.g. OPERATOR2026)"
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-amber-500/40 rounded-xl text-xs text-amber-100 placeholder-amber-400/40 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all font-mono"
                required={role === "operator"}
              />
              <p className="text-[10px] text-slate-400">
                Contact dispatch administration for the official deployment key. Default test key: <code className="text-amber-300 font-mono">OPERATOR2026</code>
              </p>
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Rajesh"
                className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Kumar"
                className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User size={14} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail size={14} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all"
                required
              />
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={14} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full pl-9 pr-8 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={14} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={clsx(
              "w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2",
              role === "operator"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20"
            )}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Complete Registration & Launch</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
