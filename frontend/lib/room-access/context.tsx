"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/hooks";

interface RoomAccessContextValue {
  getRoomAccess: (roomId: string, fallback: boolean) => boolean;
  grantRoomAccess: (roomId: string) => void;
  resetRoomAccess: () => void;
}

const RoomAccessContext = createContext<RoomAccessContextValue | null>(null);

function RoomAccessStateProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const value = useMemo<RoomAccessContextValue>(
    () => ({
      getRoomAccess: (roomId: string, fallback: boolean) =>
        overrides[roomId] ?? fallback,
      grantRoomAccess: (roomId: string) => {
        if (!roomId) {
          return;
        }
        setOverrides((current) => ({ ...current, [roomId]: true }));
      },
      resetRoomAccess: () => {
        setOverrides({});
      },
    }),
    [overrides]
  );

  return (
    <RoomAccessContext.Provider value={value}>
      {children}
    </RoomAccessContext.Provider>
  );
}

export function RoomAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userScope = user?.user_id ?? "guest";

  return (
    <RoomAccessStateProvider key={userScope}>{children}</RoomAccessStateProvider>
  );
}

export function useRoomAccess() {
  const context = useContext(RoomAccessContext);
  if (!context) {
    throw new Error("useRoomAccess must be used within <RoomAccessProvider>");
  }

  return context;
}
