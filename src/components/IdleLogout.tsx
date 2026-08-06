"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Log the user out after this much inactivity; warn shortly before.
const IDLE_LIMIT = 10 * 60 * 1000; // 10 minutes
const WARN_BEFORE = 60 * 1000; // show the countdown for the final 60s
const HEARTBEAT = 60 * 1000; // refresh the sliding session this often while active

/**
 * Auto-logout on inactivity. Mount once on authenticated pages. Any mouse /
 * keyboard / scroll / touch activity resets the timer. A warning modal counts
 * down for the last minute; if it hits zero, the session is cleared.
 */
export default function IdleLogout() {
  const router = useRouter();
  const lastActivity = useRef(Date.now());
  const lastHeartbeat = useRef(Date.now());
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
        // While genuinely active, refresh the sliding session cookie so it
        // doesn't expire mid-use. Stops once the warning is up (idle).
        if (Date.now() - lastHeartbeat.current >= HEARTBEAT) {
          lastHeartbeat.current = Date.now();
          fetch("/api/auth/me").catch(() => {});
        }
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
    <div
      role="alertdialog"
      aria-label="Session about to expire"
      className="app-font fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
    >
      <div className="panel settle w-full max-w-sm shadow-pop">
        <div className="panel-head px-4 py-2.5">
          <h2 className="lbl lbl-strong">Session about to expire</h2>
        </div>

        <div className="px-4 py-5 text-center">
          <p className="note text-[13px]">
            No activity for a while. You will be signed out in
          </p>
          <p className="fig mt-2 text-[44px] leading-none tracking-[-0.04em] text-overdue">
            {remaining}
            <span className="lbl ml-2 align-middle">seconds</span>
          </p>
        </div>

        <div className="flex gap-2 border-t border-line bg-soft px-4 py-3">
          <button onClick={logout} className="btn flex-1">
            Sign out now
          </button>
          <button onClick={stay} autoFocus className="btn btn-primary flex-1">
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
