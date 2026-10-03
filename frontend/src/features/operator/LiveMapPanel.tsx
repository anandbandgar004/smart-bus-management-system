import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { Bus } from "../../types/bus";
import { delayLabel, delayColor } from "../../types/bus";
import { useFleetStore } from "../../store/fleetStore";
import { Filter, X } from "lucide-react";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function colorFromId(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 75%, 55%)`;
}

function makeBusIcon(bus: Bus, isSelected: boolean): L.DivIcon {
  const color = colorFromId(bus.route_id);
  const isStuck = bus.speed_kmh <= 1.0;
  const ringSize = isSelected ? 34 : 26;

  return L.divIcon({
    html: `
      <div style="position:relative; width:${ringSize}px; height:${ringSize}px; display:flex; align-items:center; justify-content:center;">
        ${
          isStuck
            ? `<div class="pulse-stuck" style="position:absolute; width:100%; height:100%; border-radius:50%; background:#ef4444;"></div>`
            : ""
        }
        <div style="
          width:${ringSize}px; 
          height:${ringSize}px; 
          border-radius:50%; 
          background:${isStuck ? "#dc2626" : color}; 
          box-shadow:0 0 ${isSelected ? "14px" : "8px"} ${isStuck ? "#ef4444" : color}; 
          border: 2px solid ${isSelected ? "#ffffff" : "rgba(255,255,255,0.7)"};
          display:flex; 
          align-items:center; 
          justify-content:center; 
          font-size:${isSelected ? "14px" : "11px"};
          cursor:pointer;
          transition: transform 0.2s ease;
        ">
          🚍
        </div>
      </div>
    `,
    className: "custom-bus-marker",
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
  });
}

function MapController({ selectedBus }: { selectedBus?: Bus }) {
  const map = useMap();

  useEffect(() => {
    if (selectedBus && selectedBus.lat && selectedBus.lng) {
      map.flyTo([selectedBus.lat, selectedBus.lng], 15, {
        duration: 1.2,
      });
    }
  }, [selectedBus, map]);

  return null;
}

function MapClickHandler() {
  const selectBus = useFleetStore((s) => s.selectBus);
  useMapEvents({
    click: () => selectBus(null),
  });
  return null;
}

interface Props {
  buses: Bus[];
}

export default function LiveMapPanel({ buses }: Props) {
  const selectedBusId = useFleetStore((s) => s.selectedBusId);
  const selectBus = useFleetStore((s) => s.selectBus);
  const selectedRouteFilter = useFleetStore((s) => s.selectedRouteFilter);
  const setSelectedRouteFilter = useFleetStore((s) => s.setSelectedRouteFilter);

  const selectedBus = buses.find((b) => b.id === selectedBusId);

  const availableRoutes = Array.from(new Set(buses.map((b) => b.route_id))).sort();

  const filteredBuses = selectedRouteFilter
    ? buses.filter((b) => b.route_id === selectedRouteFilter)
    : buses;

  return (
    <div className="relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col">
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={12}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url={TILE_URL}
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />

        <MapController selectedBus={selectedBus} />
        <MapClickHandler />

        {filteredBuses.map((bus) => {
          const isSelected = bus.id === selectedBusId;
          return (
            <Marker
              key={bus.id}
              position={[bus.lat, bus.lng]}
              icon={makeBusIcon(bus, isSelected)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  selectBus(isSelected ? null : bus.id);
                },
              }}
            >
              <Tooltip
                key={`${bus.id}-${isSelected}`}
                permanent={isSelected}
                direction="top"
                offset={[0, -12]}
              >
                <div className="font-sans">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-white text-xs">
                      {bus.id}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        backgroundColor: colorFromId(bus.route_id),
                        color: "#fff",
                      }}
                    >
                      Route {bus.route_id}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Speed: <b className="text-white">{bus.speed_kmh} km/h</b>
                  </div>
                  <div className={`text-[11px] font-medium ${delayColor(bus.delay_min)}`}>
                    {delayLabel(bus.delay_min)}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating control bar overlay */}
      <div className="absolute top-4 right-4 z-[500] flex items-center gap-2">
        {/* Route Filter Dropdown */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 flex items-center gap-2 shadow-xl">
          <Filter size={13} className="text-indigo-400" />
          <select
            value={selectedRouteFilter || ""}
            onChange={(e) => setSelectedRouteFilter(e.target.value || null)}
            className="bg-transparent text-xs text-white outline-none cursor-pointer pr-1"
          >
            <option value="" className="bg-slate-900 text-slate-300">All Routes</option>
            {availableRoutes.map((r) => (
              <option key={r} value={r} className="bg-slate-900 text-white">
                Route {r}
              </option>
            ))}
          </select>
          {selectedRouteFilter && (
            <button
              onClick={() => setSelectedRouteFilter(null)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Clear Route Filter"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl px-3 py-1.5 text-xs text-slate-300 flex items-center gap-3 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Moving</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Stationary</span>
          </div>
          <div className="text-slate-400 pl-2 border-l border-slate-700">
            <span className="text-white font-semibold">{filteredBuses.length}</span> buses
          </div>
        </div>
      </div>
    </div>
  );
}
