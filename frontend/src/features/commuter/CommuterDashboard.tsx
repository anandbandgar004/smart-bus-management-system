import { useState, useCallback, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useFleetStore } from "../../store/fleetStore";
import { delayLabel, delayColor } from "../../types/bus";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Gauge,
  Clock,
  LocateFixed,
  Compass,
  Navigation,
  X,
} from "lucide-react";
import TransitSearchBar from "./TransitSearchBar";
import StopDetailsDrawer from "./StopDetailsDrawer";
import { JourneyPlannerDrawer } from "./JourneyPlannerDrawer";
import { fetchRoutePathApi } from "../../services/api";
import type { RoutePathResponse, TransitStop } from "../../types/transit";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function colorFromId(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h},75%,60%)`;
}

// Controller to fly or fit bounds
function MapController({
  focusTarget,
  routePolyline,
}: {
  focusTarget: { lat: number; lng: number; zoom?: number } | null;
  routePolyline: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (focusTarget) {
      map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom || 15, {
        duration: 1.2,
      });
    }
  }, [focusTarget, map]);

  useEffect(() => {
    if (routePolyline && routePolyline.length > 0) {
      const bounds = L.latLngBounds(routePolyline.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [60, 60], duration: 1.2 });
    }
  }, [routePolyline, map]);

  return null;
}

export default function CommuterDashboard() {
  useWebSocket();
  const buses = useFleetStore((s) => s.buses);

  const [activeBusId, setActiveBusId] = useState<string | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RoutePathResponse | null>(null);
  const [selectedStop, setSelectedStop] = useState<TransitStop | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [isJourneyPlannerOpen, setIsJourneyPlannerOpen] = useState(false);

  // Load Route details when activeRouteId changes
  useEffect(() => {
    if (!activeRouteId) {
      setRouteData(null);
      return;
    }

    let isMounted = true;
    fetchRoutePathApi(activeRouteId)
      .then((data) => {
        if (isMounted) setRouteData(data);
      })
      .catch((err) => {
        console.error("Failed to load route path:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeRouteId]);

  // Handlers from Search Bar
  const handleSelectRoute = useCallback((routeId: string) => {
    setActiveRouteId(routeId);
    setActiveBusId(null);
    setSelectedStop(null);
  }, []);

  const handleSelectStop = useCallback((stop: TransitStop) => {
    setSelectedStop(stop);
    setActiveBusId(null);
    setFocusTarget({ lat: stop.lat, lng: stop.lng, zoom: 16 });
  }, []);

  const handleSelectBusId = useCallback(
    (busId: string) => {
      const b = buses[busId];
      setActiveBusId(busId);
      setSelectedStop(null);
      if (b) {
        setFocusTarget({ lat: b.lat, lng: b.lng, zoom: 16 });
      }
    },
    [buses]
  );

  const handleClearActiveRoute = useCallback(() => {
    setActiveRouteId(null);
    setRouteData(null);
    setSelectedStop(null);
  }, []);

  // Browser Geolocation
  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setFocusTarget({ lat: loc.lat, lng: loc.lng, zoom: 15 });
        },
        (err) => {
          console.warn("Geolocation denied or unavailable:", err.message);
          // Fallback to central Delhi
          setFocusTarget({ lat: 28.62, lng: 77.22, zoom: 14 });
        }
      );
    }
  };

  const selectedBus = activeBusId ? buses[activeBusId] : null;

  // Buses to render: if a route is active, render buses on this route; otherwise show top active buses
  const displayedBuses = activeRouteId
    ? Object.values(buses).filter((b) => b.route_id === activeRouteId)
    : Object.values(buses).slice(0, 30);

  return (
    <div className="relative h-full w-full bg-[#080d18] font-sans overflow-hidden">
      {/* Full-screen Dark Map */}
      <MapContainer
        center={[28.62, 77.22]}
        zoom={12}
        className="absolute inset-0 z-0 w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url={TILE_URL}
          attribution='© <a href="https://carto.com/">CARTO</a> | <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {/* Map Controller for dynamic zoom and fly-to */}
        <MapController
          focusTarget={focusTarget}
          routePolyline={routeData ? routeData.polyline : null}
        />

        {/* User GPS Pin (if located) */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              html: `
                <div style="position:relative;width:24px;height:24px;">
                  <div style="position:absolute;inset:0;border-radius:50%;background:#38bdf8;opacity:0.3;animation:pulse-ring 2s infinite;"></div>
                  <div style="position:relative;z-index:2;width:16px;height:16px;margin:4px;border-radius:50%;background:#0284c7;border:2px solid #ffffff;box-shadow:0 0 10px #38bdf8;"></div>
                </div>`,
              className: "",
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Tooltip permanent direction="top" offset={[0, -12]}>
              <strong>You are here</strong>
            </Tooltip>
          </Marker>
        )}

        {/* Route Polyline (if route active) */}
        {routeData && routeData.polyline.length > 0 && (
          <>
            {/* Outer Glow Line */}
            <Polyline
              positions={routeData.polyline}
              pathOptions={{
                color: routeData.color || "#38bdf8",
                weight: 8,
                opacity: 0.35,
              }}
            />
            {/* Inner Core Line */}
            <Polyline
              positions={routeData.polyline}
              pathOptions={{
                color: routeData.color || "#38bdf8",
                weight: 4,
                opacity: 0.95,
              }}
            />
          </>
        )}

        {/* Route Stop Markers */}
        {routeData &&
          routeData.stops.map((stop) => {
            const isSelected = selectedStop?.id === stop.id;
            return (
              <Marker
                key={stop.id}
                position={[stop.lat, stop.lng]}
                eventHandlers={{
                  click: () => {
                    setSelectedStop(stop);
                    setFocusTarget({ lat: stop.lat, lng: stop.lng, zoom: 16 });
                  },
                }}
                icon={L.divIcon({
                  html: `
                    <div style="width:26px;height:26px;border-radius:50%;background:#090d16;border:2.5px solid ${
                      isSelected ? "#38bdf8" : routeData.color
                    };display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${
                    isSelected ? "#38bdf8" : "rgba(0,0,0,0.8)"
                  };cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                      <div style="width:7px;height:7px;border-radius:50%;background:${
                        isSelected ? "#ffffff" : routeData.color
                      };"></div>
                    </div>`,
                  className: "",
                  iconSize: [26, 26],
                  iconAnchor: [13, 13],
                })}
              >
                <Tooltip direction="top" offset={[0, -14]}>
                  <strong className="text-slate-100">{stop.name}</strong>
                  <br />
                  <span className="text-xs text-slate-400">Stop #{stop.sequence}</span>
                </Tooltip>
              </Marker>
            );
          })}

        {/* Selected Bus (Pulsing Spotlight Marker) */}
        {selectedBus && (
          <Marker
            position={[selectedBus.lat, selectedBus.lng]}
            icon={L.divIcon({
              html: `
                <div style="position:relative;width:38px;height:38px;">
                  <div style="position:absolute;inset:0;border-radius:50%;
                              background:${colorFromId(selectedBus.route_id)};
                              opacity:0.35;animation:pulse-ring 2s infinite;"></div>
                  <div style="position:relative;z-index:2;width:38px;height:38px;
                              border-radius:50%;background:${colorFromId(
                                selectedBus.route_id
                              )};
                              box-shadow:0 0 20px ${colorFromId(selectedBus.route_id)};
                              display:flex;align-items:center;justify-content:center;
                              font-size:18px;">🚍</div>
                </div>`,
              className: "",
              iconSize: [38, 38],
              iconAnchor: [19, 19],
            })}
          >
            <Tooltip permanent direction="top" offset={[0, -20]}>
              <strong style={{ color: colorFromId(selectedBus.route_id) }}>
                {selectedBus.id}
              </strong>
              <br />
              {delayLabel(selectedBus.delay_min)}
            </Tooltip>
          </Marker>
        )}

        {/* Other Active Buses */}
        {displayedBuses
          .filter((b) => b.id !== activeBusId)
          .map((b) => (
            <Marker
              key={b.id}
              position={[b.lat, b.lng]}
              eventHandlers={{
                click: () => {
                  setActiveBusId(b.id);
                  setFocusTarget({ lat: b.lat, lng: b.lng, zoom: 16 });
                },
              }}
              icon={L.divIcon({
                html: `
                  <div style="width:22px;height:22px;border-radius:50%;
                              background:${colorFromId(b.route_id)};opacity:0.85;
                              display:flex;align-items:center;justify-content:center;
                              font-size:12px;box-shadow:0 0 8px rgba(0,0,0,0.6);
                              cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">🚍</div>`,
                className: "",
                iconSize: [22, 22],
                iconAnchor: [11, 11],
              })}
            >
              <Tooltip>
                <strong>{b.id}</strong> · Route {b.route_id}
                <br />
                {b.speed_kmh} km/h · {delayLabel(b.delay_min)}
              </Tooltip>
            </Marker>
          ))}
      </MapContainer>

      {/* Floating Omnibox Search (Top-Left) */}
      <div className="absolute top-4 left-4 z-20 w-[92vw] sm:w-[460px]">
        <TransitSearchBar
          onSelectRoute={handleSelectRoute}
          onSelectStop={handleSelectStop}
          onSelectBusId={handleSelectBusId}
          activeRouteId={activeRouteId}
          onClearActiveRoute={handleClearActiveRoute}
          onOpenJourneyPlanner={() => setIsJourneyPlannerOpen(true)}
        />

        {/* Fleet Count & Active Status Badge */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-300 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {activeRouteId
                ? `${displayedBuses.length} buses on Route ${activeRouteId}`
                : `${Object.keys(buses).length} active buses in Delhi network`}
            </span>
          </span>

          {activeRouteId && (
            <button
              onClick={handleClearActiveRoute}
              className="text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Reset Map</span>
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Selected Bus Telemetry Card (Shown when a bus is spotlighted) */}
      {selectedBus && (
        <div className="absolute bottom-6 left-4 right-4 sm:left-4 sm:right-auto sm:w-80 z-20 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/70 rounded-3xl p-4 shadow-2xl shadow-black/90 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base">
                  {selectedBus.id}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-lg font-bold"
                  style={{
                    backgroundColor: colorFromId(selectedBus.route_id) + "25",
                    color: colorFromId(selectedBus.route_id),
                    border: `1px solid ${colorFromId(selectedBus.route_id)}50`,
                  }}
                >
                  Route {selectedBus.route_id}
                </span>
              </div>
              <p className={`text-base font-bold mt-1 ${delayColor(selectedBus.delay_min)}`}>
                {delayLabel(selectedBus.delay_min)}
              </p>
            </div>

            <button
              onClick={() => setActiveBusId(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Gauge size={13} className="text-cyan-400" /> Current Speed:
              </span>
              <span className="font-bold text-white font-mono">
                {selectedBus.speed_kmh} km/h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <MapPin size={13} className="text-cyan-400" /> Coordinates:
              </span>
              <span className="font-mono text-slate-200 text-[11px]">
                {selectedBus.lat.toFixed(4)}, {selectedBus.lng.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock size={13} className="text-cyan-400" /> Telemetry Ping:
              </span>
              <span className="text-slate-300 text-[11px]">
                {new Date(selectedBus.timestamp).toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stop Details & Live Arrivals Drawer */}
      <StopDetailsDrawer
        stop={selectedStop}
        onClose={() => setSelectedStop(null)}
        onSelectBusId={handleSelectBusId}
        onSelectRoute={handleSelectRoute}
      />

      {/* Journey Planner Drawer */}
      <JourneyPlannerDrawer
        isOpen={isJourneyPlannerOpen}
        onClose={() => setIsJourneyPlannerOpen(false)}
        onSelectRouteOnMap={handleSelectRoute}
        initialOriginStop={selectedStop}
      />

      {/* Map Control Utilities (Right Side) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Trip Planner Button */}
        <button
          onClick={() => setIsJourneyPlannerOpen(true)}
          title="Open Journey Planner"
          className="w-10 h-10 rounded-2xl bg-blue-600/90 hover:bg-blue-500 backdrop-blur-xl border border-blue-400/50 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 transition-all cursor-pointer group"
        >
          <Navigation size={18} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Locate Me Button */}
        <button
          onClick={handleLocateMe}
          title="Locate Me (Delhi GPS)"
          className="w-10 h-10 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex items-center justify-center shadow-xl shadow-black/60 transition-all cursor-pointer group"
        >
          <LocateFixed size={18} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Reset View Button */}
        <button
          onClick={() => setFocusTarget({ lat: 28.62, lng: 77.22, zoom: 12 })}
          title="Center Delhi NCR"
          className="w-10 h-10 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/70 hover:border-cyan-500/60 text-slate-300 hover:text-cyan-300 flex items-center justify-center shadow-xl shadow-black/60 transition-all cursor-pointer group"
        >
          <Compass size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Bottom Navigation Link to Operator Console */}
      <div className="absolute bottom-6 right-6 z-10 hidden sm:block">
        <Link
          to="/operator"
          className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 text-slate-300 hover:text-white hover:border-cyan-500/50 shadow-xl transition-all font-semibold"
        >
          <LayoutDashboard size={14} className="text-cyan-400" />
          <span>Operator Console</span>
        </Link>
      </div>
    </div>
  );
}
