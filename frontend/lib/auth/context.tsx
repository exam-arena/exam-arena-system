"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserData, RegisterRequest } from "../api/auth/types";
import { loginApi, registerApi, getMeApi, logoutApi } from "../api/auth/api";
import { ApiError } from "../api/shared/errors";


export interface AuthContextValue {
  user: UserData | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserData | null>;
  updateUser: (userData: UserData) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      try {
        const userData = await getMeApi();
        if (!cancelled) setUser(userData);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await loginApi(identifier, password);
      setUser(data.user);
    },
    []
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      await registerApi(data);
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getMeApi();
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const updateUser = useCallback((userData: UserData) => {
    setUser(userData);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, register, logout, refreshUser, updateUser }),
    [user, isLoading, login, register, logout, refreshUser, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export { ApiError };
