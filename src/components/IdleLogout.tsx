"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Log the user out after this much inactivity; warn shortly before.
const IDLE_LIMIT = 10 * 60 * 1000; // 10 minutes
const WARN_BEFORE = 60 * 1000; // show the countdown for the final 60s

/**
 * Auto-logout on inactivity. Mount once on authenticated pages. Any mouse /
 * keyboard / scroll / touch activity resets the timer. A warning modal counts
 * down for the last minute; if it hits zero, the session is cleared.
 */
export default function IdleLogout() {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const loggingOut = useRef(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const logout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — redirect below still clears the client
    }
    router.replace("/login");
    router.refresh();
  }, [router]);

  useEffect(() => {
    const bump = () => {
      lastActivity.current = Date.now();
    };
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ] as const;
    events.forEach((e) =>
      window.addEventListener(e, bump, { passive: true })
    );

    const tick = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      if (elapsed >= IDLE_LIMIT) {
        setRemaining(null);
        logout();
      } else if (elapsed >= IDLE_LIMIT - WARN_BEFORE) {
        setRemaining(Math.ceil((IDLE_LIMIT - elapsed) / 1000));
      } else {
        setRemaining((r) => (r === null ? r : null));
      }
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(tick);
    };
  }, [logout]);

  const stay = () => {
    lastActivity.current = Date.now();
    setRemaining(null);
  };

  if (remaining === null) return null;

  return (
    <div className="app-font fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col items-center px-6 pt-6 pb-2 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Anda masih di sana?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Karena tidak ada aktivitas, Anda akan otomatis keluar dalam
          </p>
          <div className="mt-3 font-mono text-3xl font-extrabold text-amber-600">
            {remaining}
            <span className="ml-1 text-base font-bold text-slate-400">
              detik
            </span>
          </div>
        </div>
        <div className="flex gap-2 p-6">
          <button
            onClick={logout}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Keluar sekarang
          </button>
          <button
            onClick={stay}
            autoFocus
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-blue-700"
          >
            Tetap login
          </button>
        </div>
      </div>
    </div>
  );
}
