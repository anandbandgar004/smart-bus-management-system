import { useEffect, useRef, useCallback } from "react";
import { useFleetStore } from "../store/fleetStore";
import { useIncidentStore } from "../store/incidentStore";
import type { Bus } from "../types/bus";

function getWebSocketUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const apiBase = import.meta.env.VITE_API_BASE;
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${url.host}/ws/fleet/`;
    } catch {
      // fallback
    }
  }

  if (typeof window !== "undefined" && window.location) {
    const isHttps = window.location.protocol === "https:";
    if (isHttps) {
      return "wss://busai-backend.onrender.com/ws/fleet/";
    }
  }

  return "ws://localhost:8000/ws/fleet/";
}

const WS_URL = getWebSocketUrl();
const RECONNECT_DELAY = 3000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateBus = useFleetStore((s) => s.updateBus);
  const setFleet = useFleetStore((s) => s.setFleet);
  const setConnectionStatus = useFleetStore((s) => s.setConnectionStatus);
  const setIncidents = useIncidentStore((s) => s.setIncidents);

  const connect = useCallback(() => {
    setConnectionStatus("connecting");
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
        if (timerRef.current) clearTimeout(timerRef.current);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "fleet_snapshot" && Array.isArray(msg.buses)) {
            setFleet(msg.buses as Bus[]);
          } else if (msg.type === "bus_location_update" && msg.bus) {
            updateBus(msg.bus as Bus);
          } else if (msg.type === "ai_suggestions" && msg.data?.items) {
            setIncidents(msg.data.items);
          }
          // analytics_summary is handled by OperatorDashboard via store
        } catch {
          // ignore malformed message
        }
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
        timerRef.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setConnectionStatus("disconnected");
      timerRef.current = setTimeout(connect, RECONNECT_DELAY);
    }
  }, [updateBus, setFleet, setIncidents, setConnectionStatus]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [connect]);
}
