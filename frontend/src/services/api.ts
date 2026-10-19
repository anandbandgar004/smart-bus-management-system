import axios from "axios";
import { useAuthStore } from "../store/authStore";
import type { LoginResponse, RegisterResponse, AuthUser } from "../types/auth";

export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to inject JWT Bearer token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401s and token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/accounts/refresh/`, {
            refresh: refreshToken,
          });
          const newAccess = res.data.access;
          useAuthStore.getState().updateUser({}); // trigger state
          // Update store token
          const user = useAuthStore.getState().user;
          if (user) {
            useAuthStore.getState().login(
              { access: newAccess, refresh: refreshToken },
              user
            );
          }
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth Endpoints ───────────────────────────────────────────────

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/accounts/login/", {
    username,
    password,
  });
  return res.data;
}

export async function registerApi(payload: {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: "commuter" | "operator";
  operator_passcode?: string;
  phone_number?: string;
}): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>("/accounts/register/", payload);
  return res.data;
}

export async function fetchMeApi(): Promise<AuthUser> {
  const res = await api.get<AuthUser>("/accounts/me/");
  return res.data;
}

export async function toggleFavoriteApi(routeId: string) {
  const res = await api.post<{
    action: string;
    route_id: string;
    favorite_routes: string[];
  }>("/accounts/favorites/toggle/", { route_id: routeId });
  return res.data;
}

export async function logoutApi() {
  const refresh = useAuthStore.getState().refreshToken;
  try {
    if (refresh) {
      await api.post("/accounts/logout/", { refresh });
    }
  } catch {
    // ignore
  } finally {
    useAuthStore.getState().logout();
  }
}

// ── Transit Network Endpoints ─────────────────────────────────────
import type {
  TransitSearchResponse,
  RoutePathResponse,
  StopArrivalsResponse,
  TransitStop,
} from "../types/transit";

export async function searchTransitApi(query: string): Promise<TransitSearchResponse> {
  const res = await api.get<TransitSearchResponse>("/transit/routes/search/", {
    params: { q: query },
  });
  return res.data;
}

export async function fetchRoutePathApi(routeId: string): Promise<RoutePathResponse> {
  const res = await api.get<RoutePathResponse>(`/transit/routes/${routeId}/path/`);
  return res.data;
}

export async function fetchNearbyStopsApi(
  lat: number,
  lng: number,
  radiusM: number = 1500
): Promise<{ stops: TransitStop[]; user_lat: number; user_lng: number }> {
  const res = await api.get<{ stops: TransitStop[]; user_lat: number; user_lng: number }>(
    "/transit/stops/nearby/",
    { params: { lat, lng, radius_m: radiusM } }
  );
  return res.data;
}

export async function fetchStopArrivalsApi(stopId: string): Promise<StopArrivalsResponse> {
  const res = await api.get<StopArrivalsResponse>(`/transit/stops/${stopId}/arrivals/`);
  return res.data;
}

import type { JourneyPlanResponse } from "../types/transit";

export async function planJourneyApi(
  originId: string,
  destinationId: string
): Promise<JourneyPlanResponse> {
  const res = await api.get<JourneyPlanResponse>("/transit/stops/plan-journey/", {
    params: { origin_id: originId, destination_id: destinationId },
  });
  return res.data;
}

export async function fetchFavoritesApi(): Promise<{ favorite_routes: string[] }> {
  const res = await api.get<{ favorite_routes: string[] }>("/accounts/favorites/toggle/");
  return res.data;
}

export async function dispatchIncidentApi(
  incidentId: string,
  busId?: string
): Promise<{ message: string; incident: unknown; dispatched_bus: string | null }> {
  const res = await api.post<{
    message: string;
    incident: unknown;
    dispatched_bus: string | null;
  }>(`/intelligence/incidents/${incidentId}/dispatch/`, { bus_id: busId });
  return res.data;
}

export async function fetchRouteHistoryApi(routeId?: string, days: number = 7) {
  const res = await api.get("/analytics/metrics/route-history/", {
    params: { route_id: routeId, days },
  });
  return res.data;
}


