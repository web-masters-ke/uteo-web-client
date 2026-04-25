"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { apiPatch } from "@/lib/api";
import type { CallSession } from "@/lib/types";

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (
      domain: string,
      options: Record<string, unknown>,
    ) => {
      addEventListener: (event: string, handler: (data?: unknown) => void) => void;
      executeCommand: (command: string, ...args: unknown[]) => void;
      dispose: () => void;
    };
  }
}

export interface CallContextValue {
  activeCall: CallSession | null;
  participants: number;
  callTimer: number;
  setActiveCall: React.Dispatch<React.SetStateAction<CallSession | null>>;
  initJitsi: (roomName: string, token: string, password?: string) => void;
  endCall: () => Promise<void>;
  startTimer: () => void;
}

const CallCtx = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallCtx);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
}

const JAAS_APP_ID = "vpaas-magic-cookie-315e6ce2ff244da49ecbd19f303846d7";

export function CallProvider({ children }: { children: ReactNode }) {
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [participants, setParticipants] = useState(0);
  const [callTimer, setCallTimer] = useState(0);

  const activeCallRef = useRef<CallSession | null>(null);
  const callStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endingRef = useRef(false);

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  const startTimer = useCallback(() => {
    callStartRef.current = Date.now();
    setCallTimer(0);
    timerRef.current = setInterval(
      () => setCallTimer(Math.floor((Date.now() - callStartRef.current) / 1000)),
      1000,
    );
  }, []);

  const stopTimer = (): number => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    return Math.floor((Date.now() - callStartRef.current) / 1000);
  };

  const endCall = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    const target = activeCallRef.current;
    const durationSec = stopTimer();

    setActiveCall(null);
    setParticipants(0);
    setCallTimer(0);
    if (target) {
      try {
        await apiPatch(`/communication/calls/${target.id}`, { status: "COMPLETED", durationSec });
      } catch {
        // Communication module not available — call ended locally only
      }
    }
    endingRef.current = false;
  }, []);

  const meetingWindowRef = useRef<Window | null>(null);

  const initJitsi = useCallback((roomName: string, token: string, _password?: string) => {
    // Close any existing meeting window
    if (meetingWindowRef.current && !meetingWindowRef.current.closed) {
      meetingWindowRef.current.focus();
      return;
    }

    // Build the direct meeting URL with JWT token
    const meetingUrl = `https://8x8.vc/${JAAS_APP_ID}/${roomName}?jwt=${token}`;

    // Open in a popup window -- full WebRTC support, no iframe issues
    const w = 900;
    const h = 700;
    const left = Math.round((screen.width - w) / 2);
    const top = Math.round((screen.height - h) / 2);
    const popup = window.open(
      meetingUrl,
      "uteo-interview",
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
    );

    meetingWindowRef.current = popup;
    setParticipants(1);

    // Poll to detect when the popup is closed (user ends call)
    const pollId = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(pollId);
        meetingWindowRef.current = null;
        endCall();
      }
    }, 1000);
  }, [endCall]);

  return (
    <CallCtx.Provider value={{ activeCall, participants, callTimer, setActiveCall, initJitsi, endCall, startTimer }}>
      {children}
    </CallCtx.Provider>
  );
}
