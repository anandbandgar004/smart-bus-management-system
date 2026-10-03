import { useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useFleetStore } from "../../store/fleetStore";
import { delayLabel, delayColor } from "../../types/bus";
import { Link } from "react-router-dom";
import { Search, LayoutDashboard, MapPin, Gauge, Clock } from "lucide-react";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function colorFromId(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h},70%,60%)`;
}

function MapFly({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.flyTo([lat, lng], 15, { duration: 1.2 });
  return null;
}

export default function CommuterDashboard() {
  useWebSocket();
  const buses = useFleetStore((s) => s.buses);
  const [query, setQuery] = useState("");
  const [busId, setBusId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const id = query.trim().toUpperCase();
      if (buses[id]) {
        setBusId(id);
        setNotFound(false);
      } else {
        setBusId(null);
        setNotFound(true);
      }
    },
    [query, buses]
  );

  const bus = busId ? buses[busId] : null;
  const allBusList = Object.values(buses).slice(0, 8); // show preview on map

  return (
    <div className="relative h-full w-full bg-[#080d18] font-sans overflow-hidden">

      {/* Full-screen dark map */}
      <MapContainer
        center={[28.62, 77.22]}
        zoom={12}
        className="absolute inset-0 z-0 w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url={TILE_URL}
          attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />

        {/* Fly to selected bus */}
        {bus && <MapFly lat={bus.lat} lng={bus.lng} />}

        {/* Selected bus — large pulsing marker */}
        {bus && (
          <Marker
            position={[bus.lat, bus.lng]}
            icon={L.divIcon({
              html: `
                <div style="position:relative;width:34px;height:34px;">
                  <div style="position:absolute;inset:0;border-radius:50%;
                              background:${colorFromId(bus.route_id)};
                              opacity:0.25;animation:pulse-ring 2s infinite;"></div>
                  <div style="position:relative;z-index:1;width:34px;height:34px;
                              border-radius:50%;background:${colorFromId(bus.route_id)};
                              box-shadow:0 0 16px ${colorFromId(bus.route_id)};
                              display:flex;align-items:center;justify-content:center;
                              font-size:16px;">🚍</div>
                </div>`,
              className: "",
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            })}
          >
            <Tooltip permanent direction="top" offset={[0, -18]}>
              <strong style={{ color: colorFromId(bus.route_id) }}>{bus.id}</strong>
              <br />{delayLabel(bus.delay_min)}
            </Tooltip>
          </Marker>
        )}

        {/* Background buses (lighter) */}
        {!bus && allBusList.map((b) => (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={L.divIcon({
              html: `<div style="width:18px;height:18px;border-radius:50%;
                       background:${colorFromId(b.route_id)};opacity:0.5;
                       display:flex;align-items:center;justify-content:center;
                       font-size:10px;">🚍</div>`,
              className: "",
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            })}
          >
            <Tooltip>
              <strong>{b.id}</strong> · Route {b.route_id}<br />
              {b.speed_kmh} km/h · {delayLabel(b.delay_min)}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating search card (top-left) */}
      <div className="absolute top-4 left-4 z-10 w-80">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/60
                        rounded-2xl p-5 shadow-2xl shadow-black/60">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-indigo-500/20 border border-indigo-500/30
                            rounded-xl flex items-center justify-center">
              <span className="text-lg">🚍</span>
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">BusAI Navigator</h1>
              <p className="text-xs text-slate-500">Real-time bus tracker</p>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="bus-search-input"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
                placeholder="Bus ID (e.g. DL1PD5041)"
                className="w-full bg-slate-800 border border-slate-600/50 rounded-lg
                           pl-8 pr-3 py-2 text-sm text-white placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                           focus:border-indigo-500/50 transition-all"
              />
            </div>
            <button
              id="bus-search-btn"
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-lg
                         text-white text-sm transition-colors"
            >
              <Search size={14} />
            </button>
          </form>

          {notFound && (
            <p className="text-xs text-red-400 mb-3 flex items-center gap-1">
              <span>⚠</span> Bus not found in live feed
            </p>
          )}

          {/* Bus info card */}
          {bus && (
            <div className="border-t border-slate-700/50 pt-4 space-y-3">
              {/* Bus ID + Route */}
              <div className="flex justify-between items-start">
                <span className="font-bold text-white text-sm">{bus.id}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: colorFromId(bus.route_id) + "22",
                    color: colorFromId(bus.route_id),
                    border: `1px solid ${colorFromId(bus.route_id)}44`,
                  }}
                >
                  Route {bus.route_id}
                </span>
              </div>

              {/* Delay status */}
              <p className={`text-xl font-bold ${delayColor(bus.delay_min)}`}>
                {delayLabel(bus.delay_min)}
              </p>

              {/* Detail rows */}
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Gauge size={12} className="text-slate-500" />
                  <span>Speed: <span className="text-white">{bus.speed_kmh} km/h</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-slate-500" />
                  <span>
                    <span className="text-white">{bus.lat.toFixed(4)}</span>
                    {", "}
                    <span className="text-white">{bus.lng.toFixed(4)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-slate-500" />
                  <span>Updated: <span className="text-white">
                    {new Date(bus.timestamp).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fleet count pill */}
        <div className="mt-2 text-center">
          <span className="text-xs text-slate-600 bg-slate-900/60 backdrop-blur
                           px-3 py-1 rounded-full border border-slate-800">
            {Object.keys(buses).length} buses in live feed
          </span>
        </div>
      </div>

      {/* Operator link (bottom-right) */}
      <div className="absolute bottom-6 right-6 z-10">
        <Link
          to="/operator"
          className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl
                     bg-slate-900/90 backdrop-blur-xl border border-slate-700/60
                     text-slate-400 hover:text-white hover:border-slate-500
                     shadow-xl transition-all"
        >
          <LayoutDashboard size={13} />
          Operator Dashboard
        </Link>
      </div>
    </div>
  );
}
