import { create } from "zustand";
import type { Bus, BusMap } from "../types/bus";

type ConnStatus = "connecting" | "connected" | "disconnected";

interface FleetState {
  buses: BusMap;
  selectedBusId: string | null;
  connectionStatus: ConnStatus;
  selectedRouteFilter: string | null;
  setFleet: (busList: Bus[]) => void;
  updateBus: (bus: Bus) => void;
  selectBus: (id: string | null) => void;
  setConnectionStatus: (s: ConnStatus) => void;
  setSelectedRouteFilter: (routeId: string | null) => void;
  getSelectedBus: () => Bus | undefined;
}

const MAX_FLEET_SIZE = 200;

export const useFleetStore = create<FleetState>((set, get) => ({
  buses: {},
  selectedBusId: null,
  connectionStatus: "connecting",
  selectedRouteFilter: null,

  setFleet: (busList) =>
    set(() => {
      const map: BusMap = {};
      const limit = busList.slice(0, MAX_FLEET_SIZE);
      for (const b of limit) {
        map[b.id] = b;
      }
      return { buses: map };
    }),

  updateBus: (bus) =>
    set((s) => {
      const next = { ...s.buses, [bus.id]: bus };
      const count = Object.keys(next).length;
      if (count > MAX_FLEET_SIZE) {
        const sorted = Object.values(next)
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, MAX_FLEET_SIZE);
        const pruned: BusMap = {};
        for (const item of sorted) {
          pruned[item.id] = item;
        }
        return { buses: pruned };
      }
      return { buses: next };
    }),
  selectBus: (id) => set({ selectedBusId: id }),
  setConnectionStatus: (s) => set({ connectionStatus: s }),
  setSelectedRouteFilter: (routeId) => set({ selectedRouteFilter: routeId }),
  getSelectedBus: () => {
    const { buses, selectedBusId } = get();
    return selectedBusId ? buses[selectedBusId] : undefined;
  },
}));
