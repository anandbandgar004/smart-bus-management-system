import { create } from "zustand";
import type { Incident } from "../types/incident";

export interface DispatchedIntervention {
  incidentId: string;
  busId?: string;
  title: string;
  timestamp: number;
}

interface IncidentState {
  incidents: Incident[];
  unreadCount: number;
  dispatches: DispatchedIntervention[];
  setIncidents: (items: Incident[]) => void;
  markAllRead: () => void;
  addDispatch: (item: { incidentId: string; busId?: string; title: string }) => void;
  updateIncidentStatus: (id: string, status: string) => void;
}

export const useIncidentStore = create<IncidentState>((set) => ({
  incidents: [],
  unreadCount: 0,
  dispatches: [],
  setIncidents: (items) =>
    set((s) => ({
      incidents: items,
      unreadCount:
        s.unreadCount +
        items.filter((i) => i.severity === "high" || i.severity === "critical")
          .length,
    })),
  markAllRead: () => set({ unreadCount: 0 }),
  addDispatch: (item) =>
    set((s) => ({
      dispatches: [
        ...s.dispatches,
        { ...item, timestamp: Date.now() },
      ],
    })),
  updateIncidentStatus: (id, status) =>
    set((s) => ({
      incidents: s.incidents.map((inc) =>
        inc.id === id ? { ...inc, status } : inc
      ),
    })),
}));

