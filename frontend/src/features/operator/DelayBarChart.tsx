import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Bus } from "../../types/bus";
import { useFleetStore } from "../../store/fleetStore";
import { BarChart3 } from "lucide-react";

function barColor(delay: number): string {
  if (delay >= 12) return "#ef4444";
  if (delay >= 5) return "#f59e0b";
  return "#10b981";
}

interface Props {
  buses: Bus[];
}

export default function DelayBarChart({ buses }: Props) {
  const selectBus = useFleetStore((s) => s.selectBus);
  const selectedBusId = useFleetStore((s) => s.selectedBusId);
  const [limit, setLimit] = useState<number>(12);

  const delayedBuses = [...buses]
    .filter((b) => b.delay_min > 0)
    .sort((a, b) => b.delay_min - a.delay_min);

  const data = (limit === 0 ? delayedBuses : delayedBuses.slice(0, limit)).map((b) => ({
    id: b.id,
    delay: b.delay_min,
    route: b.route_id,
    speed: b.speed_kmh,
  }));

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col justify-between">
      {/* Header and Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <BarChart3 size={13} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 leading-tight">
              Real-Time Fleet Delay Distribution
            </h3>
            <p className="text-[11px] text-slate-400">
              Showing top delayed vehicles currently active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Limit pill filters */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-[10px]">
            <button
              onClick={() => setLimit(10)}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                limit === 10
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Top 10
            </button>
            <button
              onClick={() => setLimit(15)}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                limit === 15
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Top 15
            </button>
            <button
              onClick={() => setLimit(0)}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                limit === 0
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All
            </button>
          </div>

          {/* Color legend */}
          <div className="hidden sm:flex items-center gap-2.5 text-[11px]">
            <div className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-2 rounded bg-emerald-500"></span> &lt;5m
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-2 rounded bg-amber-500"></span> 5-11m
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-2 rounded bg-rose-500"></span> &ge;12m
            </div>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-slate-500 text-xs">
          All active buses are currently running on schedule.
        </div>
      ) : (
        <div className="w-full h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 6, right: 10, bottom: 0, left: -22 }}
            >
              <XAxis
                dataKey="id"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={32}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                }}
                cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                formatter={(val: any) => [`${val ?? 0} min delay`, "Delay"]}
                labelFormatter={(label: any) => `Bus: ${label ?? ""}`}
              />
              <Bar
                dataKey="delay"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
                onClick={(entry: any) => {
                  if (entry && entry.id) {
                    selectBus(selectedBusId === entry.id ? null : entry.id);
                  }
                }}
                className="cursor-pointer transition-opacity hover:opacity-80"
              >
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={barColor(d.delay)}
                    opacity={selectedBusId ? (selectedBusId === d.id ? 1 : 0.4) : 0.9}
                    stroke={selectedBusId === d.id ? "#ffffff" : "none"}
                    strokeWidth={selectedBusId === d.id ? 1.5 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
