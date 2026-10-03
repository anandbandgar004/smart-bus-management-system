import { create } from "zustand";
import type { Incident } from "../types/incident";

interface IncidentState {
  incidents: Incident[];
  unreadCount: number;
  setIncidents: (items: Incident[]) => void;
  markAllRead: () => void;
}

export const useIncidentStore = create<IncidentState>((set) => ({
  incidents: [],
  unreadCount: 0,
  setIncidents: (items) =>
    set((s) => ({
      incidents: items,
      unreadCount:
        s.unreadCount +
        items.filter((i) => i.severity === "high" || i.severity === "critical")
          .length,
    })),
  markAllRead: () => set({ unreadCount: 0 }),
}));
