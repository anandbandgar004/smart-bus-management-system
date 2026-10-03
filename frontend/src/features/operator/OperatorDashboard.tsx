import { useEffect, useRef, useMemo } from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useFleetStore } from "../../store/fleetStore";
import { useIncidentStore } from "../../store/incidentStore";
import LiveMapPanel from "./LiveMapPanel";
import DelayBarChart from "./DelayBarChart";
import AlertsDrawer from "./AlertsDrawer";
import { Link } from "react-router-dom";
import {
  Bus,
  Users,
  CheckCircle2,
  AlertTriangle,
  Timer,
} from "lucide-react";

function ConnectionBadge() {
  const status = useFleetStore((s) => s.connectionStatus);
  const styles: Record<string, string> = {
    connected: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    disconnected: "bg-red-500/20 text-red-400 border border-red-500/30",
    connecting: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  };
  const label = {
    connected: "● Live Stream",
    disconnected: "✕ Disconnected",
    connecting: "◌ Connecting…",
  }[status];

  return (
    <span
      className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${styles[status]}`}
    >
      {label}
    </span>
  );
}

function Clock() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const update = () => {
      if (ref.current)
        ref.current.textContent = new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span ref={ref} className="text-slate-400 text-xs font-mono tabular-nums bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800" />
  );
}

function StatCard({
  label,
  value,
  accent,
  icon: Icon,
  subtitle,
}: {
  label: string;
  value: string | number;
  accent: string;
  icon: any;
  subtitle: string;
}) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md shadow-lg flex items-center justify-between">
      <div>
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{subtitle}</p>
      </div>
      <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
        <Icon size={17} className={accent} />
      </div>
    </div>
  );
}

export default function OperatorDashboard() {
  useWebSocket();
  const busMap = useFleetStore((s) => s.buses);
  const buses = useMemo(() => Object.values(busMap), [busMap]);
  const unreadCount = useIncidentStore((s) => s.unreadCount);

  const totalBuses = buses.length;
  const delayed = buses.filter((b) => b.delay_min > 0).length;
  const onTime = buses.filter((b) => b.delay_min <= 0).length;
  const avgDelay =
    totalBuses > 0
      ? (
          buses.reduce((acc, b) => acc + Math.max(0, b.delay_min), 0) /
          totalBuses
        ).toFixed(1)
      : "0";

  return (
    <div className="flex h-full bg-[#080d18] text-slate-100 overflow-hidden font-sans">
      {/* Main content */}
      <div className="flex-1 flex flex-col gap-3.5 p-4.5 overflow-y-auto">
        {/* Header */}
        <header className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Bus size={18} className="text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white leading-tight">
                  BusAI Navigator
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Delhi NCR
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Intelligent Fleet Telemetry & Operations Command
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock />
            <ConnectionBadge />
            <Link
              to="/commuter"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg
                         bg-slate-800/90 border border-slate-700 text-slate-300
                         hover:text-white hover:border-slate-500 transition-all shadow-sm"
            >
              <Users size={13} />
              Commuter View
            </Link>
          </div>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
          <StatCard
            label="Active Buses"
            value={totalBuses}
            accent="text-white"
            icon={Bus}
            subtitle="GPS connected units"
          />
          <StatCard
            label="On Time"
            value={onTime}
            accent="text-emerald-400"
            icon={CheckCircle2}
            subtitle="Schedule variance ≤ 0m"
          />
          <StatCard
            label="Delayed"
            value={delayed}
            accent="text-amber-400"
            icon={AlertTriangle}
            subtitle="Variance > 0m"
          />
          <StatCard
            label="Avg Delay"
            value={`${avgDelay}m`}
            accent="text-rose-400"
            icon={Timer}
            subtitle="Across monitored fleet"
          />
        </div>

        {/* Live map */}
        <div className="flex-1 min-h-[340px] flex flex-col">
          <LiveMapPanel buses={buses} />
        </div>

        {/* Delay Chart */}
        <div className="flex-shrink-0">
          <DelayBarChart buses={buses} />
        </div>

        {unreadCount > 0 && (
          <p className="text-xs text-center text-amber-400/80 font-medium">
            ⚠ {unreadCount} unread critical incident{unreadCount > 1 ? "s" : ""} requiring operator attention
          </p>
        )}
      </div>

      {/* Right sidebar */}
      <AlertsDrawer />
    </div>
  );
}
