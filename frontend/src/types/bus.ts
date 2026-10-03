export interface Bus {
  id: string;
  route_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  delay_min: number;
  timestamp: string;
}

export type BusMap = Record<string, Bus>;

export type DelayStatus = "on_time" | "early" | "minor_delay" | "major_delay";

export function getDelayStatus(d: number): DelayStatus {
  if (d < 0) return "early";
  if (d === 0) return "on_time";
  if (d < 5) return "minor_delay";
  return "major_delay";
}

export function delayLabel(d: number): string {
  if (d < 0) return `Early ${Math.abs(d)} min`;
  if (d === 0) return "On Time";
  return `Delayed ${d} min`;
}

export function delayColor(d: number): string {
  if (d < 0) return "text-sky-400";
  if (d === 0) return "text-emerald-400";
  if (d < 5) return "text-amber-400";
  return "text-rose-400";
}
