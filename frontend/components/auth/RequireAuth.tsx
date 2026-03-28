"use client";

import type { ReactNode } from "react";
import { useRequireAuth } from "@/lib/auth/hooks";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useRequireAuth();

  if (isLoading || !user) {
    return null;
  }

  return <>{children}</>;
}
