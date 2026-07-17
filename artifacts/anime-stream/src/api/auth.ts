import { apiRequest, setToken } from "./client";
import type { AuthResponse, User } from "../types";

export async function register(username: string, email: string, password: string): Promise<{ token: string; user: User }> {
  const data = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  setToken(data.token);
  localStorage.setItem("interpret_user", JSON.stringify(data.user));
  return data;
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const data = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  localStorage.setItem("interpret_user", JSON.stringify(data.user));
  return data;
}

export function logout(): void {
  localStorage.removeItem("interpret_token");
  localStorage.removeItem("interpret_user");
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem("interpret_user");
  return raw ? JSON.parse(raw) : null;
}
