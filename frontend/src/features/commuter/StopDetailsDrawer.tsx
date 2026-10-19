import { useState, useEffect } from "react";
import { X, MapPin, Bus, Clock, RefreshCw, ArrowUpRight } from "lucide-react";
import { fetchStopArrivalsApi } from "../../services/api";
import type { TransitStop, StopArrivalsResponse } from "../../types/transit";

interface StopDetailsDrawerProps {
  stop: TransitStop | null;
  onClose: () => void;
  onSelectBusId: (busId: string) => void;
  onSelectRoute: (routeId: string) => void;
}

export default function StopDetailsDrawer({
  stop,
  onClose,
  onSelectBusId,
  onSelectRoute,
}: StopDetailsDrawerProps) {
  const [data, setData] = useState<StopArrivalsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadArrivals = async () => {
    if (!stop) return;
    setLoading(true);
    try {
      const res = await fetchStopArrivalsApi(stop.id);
      setData(res);
    } catch (err) {
      console.error("Failed to fetch stop arrivals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stop) {
      loadArrivals();
    } else {
      setData(null);
    }
  }, [stop?.id]);

  if (!stop) return null;

  const occupancyStyle = (occ: "low" | "medium" | "high") => {
    switch (occ) {
      case "low":
        return {
          bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          label: "Seats Available",
        };
      case "medium":
        return {
          bg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          label: "Standing Room",
        };
      case "high":
        return {
          bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          label: "Crowded",
        };
    }
  };

  return (
    <div className="absolute bottom-6 left-4 right-4 sm:left-4 sm:right-auto sm:w-96 z-20 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/70 rounded-3xl p-5 shadow-2xl shadow-black/90 animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
            <MapPin size={20} />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base text-slate-100 leading-tight">
              {stop.name}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stop.zone_id || "Delhi Transit Zone"} {stop.sequence ? `· Stop #${stop.sequence}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={loadArrivals}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Refresh Arrivals"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-cyan-400" : ""} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Servicing Routes Pills */}
      {stop.servicing_routes && stop.servicing_routes.length > 0 && (
        <div className="mb-4">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Connecting Corridors
          </span>
          <div className="flex flex-wrap gap-1.5">
            {stop.servicing_routes.map((rid) => (
              <button
                key={rid}
                onClick={() => onSelectRoute(rid)}
                className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>{rid}</span>
                <ArrowUpRight size={11} className="opacity-70" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live Approaching Buses Board */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Clock size={13} className="text-cyan-400" />
            <span>Live Approaching Buses</span>
          </span>
          <span className="text-[10px] text-slate-400">
            {data?.arrivals.length || 0} in range
          </span>
        </div>

        {loading && !data && (
          <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw size={18} className="animate-spin text-cyan-400" />
            <span className="text-xs">Computing live telemetry ETAs...</span>
          </div>
        )}

        {data && data.arrivals.length === 0 && (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              No active buses within 8km approaching this stop right now.
            </p>
          </div>
        )}

        {data && data.arrivals.length > 0 && (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {data.arrivals.map((arr) => {
              const occ = occupancyStyle(arr.occupancy);
              return (
                <div
                  key={arr.bus_id}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => onSelectRoute(arr.route_id)}
                      className="px-2 py-1 rounded-xl text-xs font-black shrink-0 transition-transform hover:scale-105"
                      style={{
                        backgroundColor: arr.route_color + "25",
                        color: arr.route_color,
                        border: `1px solid ${arr.route_color}50`,
                      }}
                      title="View Route"
                    >
                      {arr.route_name}
                    </button>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-200">
                          {arr.bus_id}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold border ${occ.bg}`}
                        >
                          {occ.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{arr.distance_km} km away</span>
                        <span>·</span>
                        <span>{arr.speed_kmh} km/h</span>
                      </div>
                    </div>
                  </div>

                  {/* ETA Countdown Badge & Track button */}
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-extrabold text-xs shadow-sm shadow-cyan-500/10">
                      {arr.eta_minutes}m
                    </span>
                    <button
                      onClick={() => onSelectBusId(arr.bus_id)}
                      className="text-[10px] text-slate-400 group-hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Track</span>
                      <Bus size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
