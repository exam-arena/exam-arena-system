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
import { loginApi, registerApi, getMeApi } from "../api/auth/api";
import { getToken, setToken, removeToken } from "./token";
import { ApiError } from "../api/shared/errors";


export interface AuthContextValue {
  user: UserData | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    getMeApi()
      .then((userData) => {
        if (!cancelled) setUser(userData);
      })
      .catch(() => {
        removeToken();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await loginApi(identifier, password);
      setToken(data.token);
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

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export { ApiError };
