export type UserRole = "commuter" | "operator" | "admin";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  phone_number?: string;
  favorite_routes?: string[];
  is_verified_operator?: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface RegisterResponse {
  message: string;
  access: string;
  refresh: string;
  user: AuthUser;
}
