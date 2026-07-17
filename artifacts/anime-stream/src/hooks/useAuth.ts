import { useState, useEffect, useCallback } from "react";
import type { User } from "../types";
import * as authApi from "../api/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => authApi.getStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = authApi.getStoredUser();
    if (stored) {
      setUser(stored);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authApi.register(username, email, password);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  return { user, loading, login, register, logout, isAuthenticated: !!user };
}
