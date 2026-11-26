"use client";
import { create } from "zustand";

interface SessionState {
  expiresAt: number;
  lastPingAt: number;
  setExpiresAt: (ts: number) => void;
  markPinged: () => void;
}

/** Client mirror of the server-side sliding session window. */
export const useSessionStore = create<SessionState>((set) => ({
  expiresAt: 0,
  lastPingAt: 0,
  setExpiresAt: (expiresAt) => set({ expiresAt }),
  markPinged: () => set({ lastPingAt: Date.now() }),
}));
