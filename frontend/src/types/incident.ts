export type IncidentType = "stuck_bus" | "headway_risk" | "coverage_gap";
export type Severity = "low" | "medium" | "high" | "critical";

export interface Incident {
  id?: string;
  type: IncidentType;
  severity: Severity;
  title: string;
  description: string;
  solution?: string;
  status?: string;
  recommended_bus_id?: string;
  route_id?: string;
}

export interface AISuggestionsPayload {
  items: Incident[];
}
