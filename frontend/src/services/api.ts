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
