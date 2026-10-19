export interface TransitStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zone_id: string;
  sequence?: number;
  distance_m?: number;
  walking_time_min?: number;
  servicing_routes?: string[];
}

export interface TransitRouteSummary {
  id: string;
  short_name: string;
  long_name: string;
  color: string;
  active_buses_count?: number;
  stop_count?: number;
}

export interface RoutePathResponse {
  id: string;
  short_name: string;
  long_name: string;
  color: string;
  stops: TransitStop[];
  polyline: [number, number][];
  active_buses: {
    id: string;
    lat: number;
    lng: number;
    speed_kmh: number;
    delay_min: number;
    last_telemetry_at: string;
  }[];
  total_buses: number;
}

export interface TransitSearchResponse {
  routes: TransitRouteSummary[];
  stops: TransitStop[];
}

export interface BusArrival {
  bus_id: string;
  route_id: string;
  route_name: string;
  route_color: string;
  eta_minutes: number;
  distance_km: number;
  speed_kmh: number;
  delay_min: number;
  occupancy: "low" | "medium" | "high";
}

export interface StopArrivalsResponse {
  stop_id: string;
  stop_name: string;
  lat: number;
  lng: number;
  zone_id: string;
  arrivals: BusArrival[];
}

export interface JourneyDirectRoute {
  route_id: string;
  route_name: string;
  route_long_name: string;
  route_color: string;
  origin_stop: { id: string; name: string; sequence: number };
  destination_stop: { id: string; name: string; sequence: number };
  stops_count: number;
  estimated_minutes: number;
  next_buses: { bus_id: string; eta_minutes: number; distance_km: number }[];
  has_direct_service: boolean;
}

export interface JourneyTransferOption {
  type: string;
  leg1: {
    route_id: string;
    from_stop: string;
    to_stop: string;
    stops_count: number;
  };
  leg2: {
    route_id: string;
    from_stop: string;
    to_stop: string;
    stops_count: number;
  };
  interchange_stop: string;
  total_stops: number;
  estimated_minutes: number;
}

export interface JourneyPlanResponse {
  origin: { id: string; name: string; lat: number | null; lng: number | null };
  destination: { id: string; name: string; lat: number | null; lng: number | null };
  direct_routes: JourneyDirectRoute[];
  transfer_options: JourneyTransferOption[];
  has_direct_service: boolean;
}

