import { create } from "zustand";
import type { AuthUser, AuthTokens } from "../types/auth";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (tokens: AuthTokens, user: AuthUser) => void;
  logout: () => void;
  updateUser: (fields: Partial<AuthUser>) => void;
  toggleFavorite: (routeId: string) => void;
}

const STORAGE_KEY_TOKEN = "busai_access_token";
const STORAGE_KEY_REFRESH = "busai_refresh_token";
const STORAGE_KEY_USER = "busai_auth_user";

function loadInitialState() {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH);
    const userStr = localStorage.getItem(STORAGE_KEY_USER);
    if (token && userStr) {
      const user = JSON.parse(userStr) as AuthUser;
      return { token, refreshToken, user, isAuthenticated: true };
    }
  } catch {
    // Ignore parse error
  }
  return { token: null, refreshToken: null, user: null, isAuthenticated: false };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitialState(),

  login: (tokens, user) => {
    localStorage.setItem(STORAGE_KEY_TOKEN, tokens.access);
    localStorage.setItem(STORAGE_KEY_REFRESH, tokens.refresh);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    set({
      token: tokens.access,
      refreshToken: tokens.refresh,
      user,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH);
    localStorage.removeItem(STORAGE_KEY_USER);
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  updateUser: (fields) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...fields };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      return { user: updated };
    });
  },

  toggleFavorite: (routeId) => {
    set((state) => {
      if (!state.user) return state;
      const current = state.user.favorite_routes || [];
      const updatedRoutes = current.includes(routeId)
        ? current.filter((r) => r !== routeId)
        : [...current, routeId];
      const updatedUser = { ...state.user, favorite_routes: updatedRoutes };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));
