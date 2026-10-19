import React, { useState, useEffect } from "react";
import {
  Navigation,
  X,
  ArrowRightLeft,
  Clock,
  MapPin,
  ChevronRight,
  Bus as BusIcon,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { searchTransitApi, planJourneyApi } from "../../services/api";
import type { TransitStop, JourneyPlanResponse, JourneyDirectRoute } from "../../types/transit";

interface JourneyPlannerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRouteOnMap: (routeId: string) => void;
  initialOriginStop?: TransitStop | null;
}

export const JourneyPlannerDrawer: React.FC<JourneyPlannerDrawerProps> = ({
  isOpen,
  onClose,
  onSelectRouteOnMap,
  initialOriginStop,
}) => {
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [originStop, setOriginStop] = useState<TransitStop | null>(initialOriginStop || null);
  const [destStop, setDestStop] = useState<TransitStop | null>(null);

  const [originSuggestions, setOriginSuggestions] = useState<TransitStop[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<TransitStop[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  const [journeyPlan, setJourneyPlan] = useState<JourneyPlanResponse | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOriginStop) {
      setOriginStop(initialOriginStop);
      setOriginQuery(initialOriginStop.name);
    }
  }, [initialOriginStop]);

  // Origin search debounce
  useEffect(() => {
    if (!originQuery.trim() || originStop?.name === originQuery) {
      setOriginSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const res = await searchTransitApi(originQuery);
        setOriginSuggestions(res.stops || []);
      } catch {
        setOriginSuggestions([]);
      } finally {
        setIsSearchingOrigin(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [originQuery, originStop]);

  // Destination search debounce
  useEffect(() => {
    if (!destQuery.trim() || destStop?.name === destQuery) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const res = await searchTransitApi(destQuery);
        setDestSuggestions(res.stops || []);
      } catch {
        setDestSuggestions([]);
      } finally {
        setIsSearchingDest(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [destQuery, destStop]);

  const handleSwap = () => {
    const tempStop = originStop;
    const tempQuery = originQuery;
    setOriginStop(destStop);
    setOriginQuery(destQuery);
    setDestStop(tempStop);
    setDestQuery(tempQuery);
    setJourneyPlan(null);
  };

  const handlePlanJourney = async () => {
    if (!originStop || !destStop) return;
    setIsPlanning(true);
    setPlanError(null);
    setJourneyPlan(null);

    try {
      const data = await planJourneyApi(originStop.id, destStop.id);
      setJourneyPlan(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to calculate journey route";
      setPlanError(msg);
    } finally {
      setIsPlanning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[1000] w-full sm:w-[480px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/60 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Journey Planner
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Delhi NCR
              </span>
            </h2>
            <p className="text-xs text-slate-400">Point-to-point transit routes & schedules</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Origin & Destination inputs */}
      <div className="p-5 border-b border-slate-800 space-y-3 bg-slate-900/50">
        {/* Origin */}
        <div className="relative">
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1 block">
            Origin Stop
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
            <input
              type="text"
              placeholder="Search departure stop (e.g., Anand Vihar, AIIMS)"
              value={originQuery}
              onChange={(e) => {
                setOriginQuery(e.target.value);
                if (originStop && originStop.name !== e.target.value) setOriginStop(null);
              }}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {isSearchingOrigin && (
              <Loader2 className="absolute right-3 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>

          {originSuggestions.length > 0 && !originStop && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto">
              {originSuggestions.map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setOriginStop(st);
                    setOriginQuery(st.name);
                    setOriginSuggestions([]);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800/70 flex items-center justify-between border-b border-slate-800/40 last:border-none"
                >
                  <span className="text-sm text-slate-200">{st.name}</span>
                  <span className="text-[10px] text-slate-500">{st.zone_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Swap button */}
        <div className="flex justify-center -my-1">
          <button
            onClick={handleSwap}
            className="p-1.5 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition-all transform hover:rotate-180 duration-200"
            title="Swap Origin and Destination"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination */}
        <div className="relative">
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1 block">
            Destination Stop
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 w-2.5 h-2.5 rounded-full bg-red-400 ring-4 ring-red-500/20" />
            <input
              type="text"
              placeholder="Search arrival stop (e.g., Saket, Lajpat Nagar)"
              value={destQuery}
              onChange={(e) => {
                setDestQuery(e.target.value);
                if (destStop && destStop.name !== e.target.value) setDestStop(null);
              }}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {isSearchingDest && (
              <Loader2 className="absolute right-3 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>

          {destSuggestions.length > 0 && !destStop && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto">
              {destSuggestions.map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setDestStop(st);
                    setDestQuery(st.name);
                    setDestSuggestions([]);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800/70 flex items-center justify-between border-b border-slate-800/40 last:border-none"
                >
                  <span className="text-sm text-slate-200">{st.name}</span>
                  <span className="text-[10px] text-slate-500">{st.zone_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Find Routes Button */}
        <button
          onClick={handlePlanJourney}
          disabled={!originStop || !destStop || isPlanning}
          className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
        >
          {isPlanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculating optimal route...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              Find Transit Routes
            </>
          )}
        </button>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {planError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Route calculation notice</p>
              <p className="text-xs text-red-300/80 mt-0.5">{planError}</p>
            </div>
          </div>
        )}

        {journeyPlan && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
              <span>Found options</span>
              <span>
                {journeyPlan.direct_routes.length > 0
                  ? `${journeyPlan.direct_routes.length} Direct Route(s)`
                  : `${journeyPlan.transfer_options.length} Transfer Route(s)`}
              </span>
            </div>

            {/* Direct Routes */}
            {journeyPlan.direct_routes.map((dr: JourneyDirectRoute) => (
              <div
                key={dr.route_id}
                className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-blue-500/40 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow"
                      style={{ backgroundColor: dr.route_color || "#3B82F6" }}
                    >
                      {dr.route_name}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
                      {dr.route_long_name}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Direct
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>~{dr.estimated_minutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{dr.stops_count} stops</span>
                  </div>
                </div>

                {dr.next_buses.length > 0 && (
                  <div className="text-xs space-y-1">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <BusIcon className="w-3 h-3 text-amber-400" />
                      <span>Next departures at {dr.origin_stop.name}:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dr.next_buses.map((b) => (
                        <span
                          key={b.bus_id}
                          className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-mono"
                        >
                          {b.bus_id}: in {b.eta_minutes}m ({b.distance_km}km)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    onSelectRouteOnMap(dr.route_id);
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-700/60 hover:bg-blue-600/80 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>View Route on Map</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Transfer options */}
            {journeyPlan.transfer_options.map((to, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">
                    1 Transfer via {to.interchange_stop}
                  </span>
                  <span className="text-xs text-slate-400">~{to.estimated_minutes} mins</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>
                    1. Board <strong className="text-blue-400">{to.leg1.route_id}</strong> from{" "}
                    {to.leg1.from_stop} to {to.leg1.to_stop} ({to.leg1.stops_count} stops)
                  </p>
                  <p>
                    2. Transfer at <strong>{to.interchange_stop}</strong> to{" "}
                    <strong className="text-indigo-400">{to.leg2.route_id}</strong> to reach{" "}
                    {to.leg2.to_stop} ({to.leg2.stops_count} stops)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!journeyPlan && !isPlanning && (
          <div className="py-12 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-center mx-auto text-slate-400">
              <Navigation className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-400">Plan your journey across Delhi</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Select origin and destination stops above to see direct routes, travel duration, and
              live bus arrivals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
