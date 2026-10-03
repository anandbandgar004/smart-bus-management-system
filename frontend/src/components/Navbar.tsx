import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { logoutApi } from "../services/api";
import {
  Bus,
  Shield,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  MapPin,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOperatorPage = location.pathname.startsWith("/operator");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logoutApi();
    setDropdownOpen(false);
    navigate("/login");
  };

  return (
    <header className="h-14 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between z-30 select-none">
      {/* Brand & Mode */}
      <div className="flex items-center gap-3">
        <Link to="/commuter" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shadow-sm shadow-cyan-500/10">
            <Bus size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-slate-100">
                Bus<span className="text-cyan-400">AI</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                Delhi OTD
              </span>
            </div>
          </div>
        </Link>

        <span className="text-slate-700">|</span>

        {/* View title */}
        <div className="flex items-center gap-2">
          {isOperatorPage ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <Shield size={13} className="text-amber-400" />
              <span>Fleet Operations Sentinel</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/30 px-2.5 py-1 rounded-lg border border-cyan-500/30">
              <MapPin size={13} className="text-cyan-400" />
              <span>Passenger Live Tracker</span>
            </div>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Quick Portal Switch for Operators/Admins */}
        {isAuthenticated && (user?.role === "operator" || user?.role === "admin") && (
          <Link
            to={isOperatorPage ? "/commuter" : "/operator"}
            className={clsx(
              "hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
              isOperatorPage
                ? "bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 border border-slate-700"
                : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
            )}
          >
            {isOperatorPage ? (
              <>
                <MapPin size={13} />
                <span>Passenger Map</span>
              </>
            ) : (
              <>
                <LayoutDashboard size={13} />
                <span>Operator Console</span>
              </>
            )}
          </Link>
        )}

        {/* Auth section */}
        {isAuthenticated && user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 py-1 px-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-xs text-slate-200"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px] border border-cyan-500/40">
                {user.first_name ? user.first_name[0].toUpperCase() : user.username[0].toUpperCase()}
              </div>

              <div className="text-left hidden md:block">
                <div className="font-semibold text-xs leading-none">
                  {user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.username}
                </div>
              </div>

              {/* Role Badge */}
              <span
                className={clsx(
                  "text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border",
                  user.role === "operator" && "bg-amber-500/10 text-amber-300 border-amber-500/30",
                  user.role === "commuter" && "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                  user.role === "admin" && "bg-purple-500/10 text-purple-300 border-purple-500/30"
                )}
              >
                {user.role}
              </span>

              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-xl p-1.5 text-xs text-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <div className="font-semibold text-slate-100">{user.username}</div>
                  <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                  {user.is_verified_operator && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1">
                      <Sparkles size={11} />
                      <span>Verified Dispatch Officer</span>
                    </div>
                  )}
                </div>

                {user.role === "operator" && !isOperatorPage && (
                  <Link
                    to="/operator"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-amber-300"
                  >
                    <LayoutDashboard size={14} />
                    <span>Open Operator Console</span>
                  </Link>
                )}

                <Link
                  to="/commuter"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-300"
                >
                  <MapPin size={14} />
                  <span>Passenger Live Map</span>
                </Link>

                <div className="border-t border-slate-800 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-500/20 text-rose-300 transition-colors"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
