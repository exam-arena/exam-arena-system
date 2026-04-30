"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthContext, type AuthContextValue } from "./context";


export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

export function useUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}
