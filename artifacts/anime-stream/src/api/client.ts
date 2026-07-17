const API_URL = import.meta.env.VITE_API_SERVER_URL || "http://localhost:8080/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  return localStorage.getItem("interpret_token");
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem("interpret_token", token);
  } else {
    localStorage.removeItem("interpret_token");
  }
}

export function clearAuth(): void {
  localStorage.removeItem("interpret_token");
  localStorage.removeItem("interpret_user");
}

// Clear stale test-token from localStorage on app load
const existing = localStorage.getItem("interpret_token");
if (existing === "test-token" || (existing && existing.split(".").length !== 3)) {
  clearAuth();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login";
    throw new ApiError(401, "Session expired — redirecting to login");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(res.status, body.error || "Request failed");
  }

  return res.json();
}
