import { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Bus,
  MapPin,
  Route as RouteIcon,
  Loader2,
  ArrowRight,
  Star,
  Navigation,
} from "lucide-react";
import { searchTransitApi, toggleFavoriteApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import type { TransitRouteSummary, TransitStop } from "../../types/transit";

interface TransitSearchBarProps {
  onSelectRoute: (routeId: string) => void;
  onSelectStop: (stop: TransitStop) => void;
  onSelectBusId: (busId: string) => void;
  activeRouteId: string | null;
  onClearActiveRoute: () => void;
  onOpenJourneyPlanner?: () => void;
}

const POPULAR_ROUTES = [
  { id: "DL-534", name: "534", label: "Anand Vihar ↔ Mehrauli", color: "#3B82F6" },
  { id: "DL-TMS", name: "TMS", label: "Ring Road Mudrika", color: "#A855F7" },
  { id: "DL-729", name: "729", label: "Mori Gate ↔ Kapashera", color: "#10B981" },
  { id: "DL-RL77", name: "RL77", label: "NDLS ↔ Dwarka Sec 10", color: "#F43F5E" },
  { id: "DL-GL23", name: "GL23", label: "Kashmere Gate ↔ Nehru Pl", color: "#06B6D4" },
  { id: "DL-427", name: "427", label: "Nizamuddin ↔ Badarpur", color: "#F59E0B" },
];

export default function TransitSearchBar({
  onSelectRoute,
  onSelectStop,
  onSelectBusId,
  activeRouteId,
  onClearActiveRoute,
  onOpenJourneyPlanner,
}: TransitSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<TransitRouteSummary[]>([]);
  const [stops, setStops] = useState<TransitStop[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((s) => s.user);
  const toggleFavoriteLocal = useAuthStore((s) => s.toggleFavorite);
  const favoriteRoutes = user?.favorite_routes || [];

  const handleToggleFavorite = async (routeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavoriteLocal(routeId);
    try {
      await toggleFavoriteApi(routeId);
    } catch {
      // Local optimistic state already applied
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setRoutes([]);
      setStops([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchTransitApi(trimmed);
        setRoutes(res.routes || []);
        setStops(res.stops || []);
      } catch (err) {
        console.error("Transit search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = query.trim().toUpperCase();
    if (!val) return;

    if (routes.length > 0) {
      onSelectRoute(routes[0].id);
      setIsOpen(false);
    } else if (stops.length > 0) {
      onSelectStop(stops[0]);
      setIsOpen(false);
    } else {
      onSelectBusId(val);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-lg space-y-2">
      {/* Search Bar + Action Button */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleManualSubmit} className="relative flex-1">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-cyan-400 pointer-events-none">
              {loading ? (
                <Loader2 size={16} className="animate-spin text-cyan-400" />
              ) : (
                <Search size={16} />
              )}
            </div>

            <input
              id="transit-omnibox-input"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search Route (534, TMS), Stop (AIIMS), or Bus..."
              className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 hover:border-slate-600 focus:border-cyan-500/80 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 shadow-2xl shadow-black/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setRoutes([]);
                  setStops([]);
                }}
                className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </form>

        {/* Journey Planner Trigger Button */}
        {onOpenJourneyPlanner && (
          <button
            type="button"
            onClick={onOpenJourneyPlanner}
            title="Plan Journey"
            className="px-3.5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 border border-blue-400/40 text-white shadow-xl shadow-blue-500/20 flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Navigation size={14} />
            <span className="hidden sm:inline">Plan Trip</span>
          </button>
        )}
      </div>

      {/* Starred Favorites Bar */}
      {favoriteRoutes.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none">
          <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 shrink-0">
            <Star size={11} className="fill-amber-400" /> Favorites:
          </span>
          {favoriteRoutes.map((rId) => (
            <button
              key={rId}
              type="button"
              onClick={() => onSelectRoute(rId)}
              className="px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-400/60 text-[11px] font-bold text-amber-300 flex items-center gap-1 shrink-0 transition-colors shadow-sm cursor-pointer"
            >
              <span>{rId}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active Route Filter Pill */}
      {activeRouteId && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-semibold text-cyan-200">
              Active Corridor: <span className="font-bold text-white">{activeRouteId}</span>
            </span>
          </div>
          <button
            onClick={onClearActiveRoute}
            className="text-[11px] text-cyan-300 hover:text-white flex items-center gap-1 font-medium bg-cyan-900/50 hover:bg-cyan-900 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
          >
            Clear <X size={11} />
          </button>
        </div>
      )}


      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl p-2.5 shadow-2xl shadow-black/90 z-50 max-h-[420px] overflow-y-auto divide-y divide-slate-800/60 text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Quick Popular Corridors (shown when query is empty) */}
          {!query.trim() && (
            <div className="p-2 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block px-1">
                Popular Delhi Transit Corridors
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {POPULAR_ROUTES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onSelectRoute(r.id);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 text-left transition-all cursor-pointer group"
                  >
                    <span
                      className="px-2 py-0.5 rounded-lg text-[11px] font-black tracking-tight shrink-0 shadow-sm"
                      style={{
                        backgroundColor: r.color + "25",
                        color: r.color,
                        border: `1px solid ${r.color}50`,
                      }}
                    >
                      {r.name}
                    </span>
                    <span className="text-[11px] text-slate-300 group-hover:text-white truncate font-medium">
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results: Routes */}
          {routes.length > 0 && (
            <div className="py-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block px-2.5 mb-1.5 flex items-center gap-1.5">
                <RouteIcon size={12} />
                <span>Bus Routes ({routes.length})</span>
              </span>
              <div className="space-y-1">
                {routes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onSelectRoute(r.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-black shadow-sm"
                        style={{
                          backgroundColor: r.color + "30",
                          color: r.color,
                          border: `1px solid ${r.color}60`,
                        }}
                      >
                        {r.short_name || r.id}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {r.long_name || `Route ${r.id}`}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {r.stop_count || 0} Stops · {r.active_buses_count || 0} active buses
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(r.id, e)}
                        title={favoriteRoutes.includes(r.id) ? "Remove Favorite" : "Save to Favorites"}
                        className="p-1 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        <Star
                          size={14}
                          className={favoriteRoutes.includes(r.id) ? "text-amber-400 fill-amber-400" : ""}
                        />
                      </button>
                      <ArrowRight size={13} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results: Stops */}
          {stops.length > 0 && (
            <div className="py-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block px-2.5 mb-1.5 flex items-center gap-1.5">
                <MapPin size={12} />
                <span>Bus Stops ({stops.length})</span>
              </span>
              <div className="space-y-1">
                {stops.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectStop(s);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                          {s.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {s.zone_id} · Serviced by:{" "}
                          <span className="text-slate-300">
                            {s.servicing_routes?.join(", ") || "Active Routes"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={13} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fallback to Bus ID Search */}
          {query.trim() && routes.length === 0 && stops.length === 0 && !loading && (
            <div className="p-3 text-center space-y-2">
              <p className="text-xs text-slate-400">
                No route or stop named "<span className="text-slate-200">{query}</span>" found.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSelectBusId(query.trim().toUpperCase());
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <Bus size={13} />
                <span>Track Bus ID "{query.trim().toUpperCase()}"</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
