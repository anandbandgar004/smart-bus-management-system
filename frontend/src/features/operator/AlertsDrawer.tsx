import { useEffect } from "react";
import { useIncidentStore } from "../../store/incidentStore";
import {
  AlertTriangle,
  Activity,
  MapPin,
  CheckCircle2,
  Sparkles,
  Radio,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import type { Incident } from "../../types/incident";
import clsx from "clsx";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-500 bg-red-950/40 text-red-200",
  high: "border-rose-500 bg-rose-950/30 text-rose-200",
  medium: "border-amber-500 bg-amber-950/30 text-amber-200",
  low: "border-sky-500 bg-sky-950/20 text-sky-200",
};

const ICON_MAP: Record<string, React.ReactNode> = {
  stuck_bus: <AlertTriangle size={15} className="text-rose-400 shrink-0" />,
  headway_risk: <Activity size={15} className="text-amber-400 shrink-0" />,
  coverage_gap: <MapPin size={15} className="text-sky-400 shrink-0" />,
};

function IncidentCard({ inc }: { inc: Incident }) {
  return (
    <div
      className={clsx(
        "border-l-4 rounded-xl p-3.5 text-xs transition-all shadow-md hover:shadow-lg",
        SEVERITY_STYLES[inc.severity] || "border-slate-600 bg-slate-800/40 text-slate-200"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 font-semibold">
          {ICON_MAP[inc.type] || <AlertTriangle size={15} />}
          <span>{inc.title}</span>
        </div>
        <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-black/40">
          {inc.severity}
        </span>
      </div>

      <p className="text-slate-300 leading-relaxed mb-2">{inc.description}</p>

      {inc.solution && (
        <div className="mt-2 pt-2 border-t border-white/10 bg-slate-900/60 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px] mb-1">
            <Sparkles size={13} />
            <span>AI Automated Action</span>
          </div>
          <p className="text-cyan-200/90 text-[11px] leading-snug">
            {inc.solution}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AlertsDrawer() {
  const incidents = useIncidentStore((s) => s.incidents);
  const unreadCount = useIncidentStore((s) => s.unreadCount);
  const markAllRead = useIncidentStore((s) => s.markAllRead);

  useEffect(() => {
    // Initial fetch of active incidents from REST API if empty
    if (incidents.length === 0) {
      fetch("http://localhost:8000/api/v1/intelligence/incidents/?status=pending")
        .then((res) => res.json())
        .then((data) => {
          const items = Array.isArray(data) ? data : data.results;
          if (items && items.length > 0) {
            useIncidentStore.getState().setIncidents(
              items.map((it: { incident_type: string; severity: string; title: string; description: string; suggested_action?: string }) => ({
                type: it.incident_type,
                severity: it.severity,
                title: it.title,
                description: it.description,
                solution: it.suggested_action,
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [incidents.length]);

  // Priority Incidents: raw operational alarms / stuck buses / critical status
  const criticalAndHigh = incidents.filter(
    (i) => i.severity === "critical" || (i.type === "stuck_bus" && !i.solution)
  );

  // AI Dispatch Recommendations: actionable solutions (headway pacing, coverage, divert proposals)
  const otherIncidents = incidents.filter(
    (i) => Boolean(i.solution) || i.type === "headway_risk" || i.type === "coverage_gap"
  );

  return (
    <aside className="w-84 flex-shrink-0 flex flex-col gap-4 p-5 bg-slate-900/95 backdrop-blur-lg border-l border-slate-800 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h2 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
            <Cpu size={15} className="text-cyan-400" />
            AI Operations Sentinel
          </h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[11px] font-bold rounded-full border border-rose-500/40">
              {unreadCount}
            </span>
          )}
        </div>
        {incidents.length > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <CheckCircle2 size={12} />
            Mark Read
          </button>
        )}
      </div>

      {/* AI Telemetry Active Watchers Status */}
      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Radio size={12} className="text-emerald-400 animate-pulse" />
            Live GTFS-RT Telemetry
          </span>
          <span className="text-emerald-400 font-semibold">Active</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[10px]">
          <div className="flex items-center gap-1 text-slate-300">
            <ShieldCheck size={11} className="text-indigo-400" />
            <span>Anti-Bunching: OK</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <ShieldCheck size={11} className="text-indigo-400" />
            <span>Stuck Bus Watch: OK</span>
          </div>
        </div>
      </div>

      {/* Critical Incidents Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="text-slate-200 font-semibold">Priority Incidents</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px]">{criticalAndHigh.length}</span>
        </div>

        {criticalAndHigh.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-slate-800/20 border border-slate-800/60 text-center text-slate-500 text-xs">
            No critical anomalies detected.
          </div>
        ) : (
          criticalAndHigh.map((inc, i) => <IncidentCard key={i} inc={inc} />)
        )}
      </div>

      {/* Other AI Predictions */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="text-slate-200 font-semibold">AI Dispatch Recommendations</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px]">{otherIncidents.length}</span>
        </div>

        {otherIncidents.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-slate-800/20 border border-slate-800/60 text-center text-slate-500 text-xs flex flex-col items-center gap-1.5">
            <Sparkles size={16} className="text-slate-600" />
            <span>Analyzing real-time fleet intervals...</span>
          </div>
        ) : (
          otherIncidents.map((inc, i) => <IncidentCard key={i} inc={inc} />)
        )}
      </div>
    </aside>
  );
}
