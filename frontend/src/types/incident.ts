export type IncidentType = "stuck_bus" | "headway_risk" | "coverage_gap";
export type Severity = "low" | "medium" | "high" | "critical";

export interface Incident {
  type: IncidentType;
  severity: Severity;
  title: string;
  description: string;
  solution?: string;
}

export interface AISuggestionsPayload {
  items: Incident[];
}
