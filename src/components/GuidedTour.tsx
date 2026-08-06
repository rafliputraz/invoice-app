"use client";

import { useEffect, useRef, useState } from "react";

// Per-user key: each account sees the tour once, even when several people
// share the same browser/device.
const tourKeyFor = (userKey: string) => `sfl_tour_done:${userKey}`;
/** Fired (window event) to replay the tour, e.g. from the help popup. */
export const TOUR_EVENT = "sfl:start-tour";

interface TourStep {
  target: string; // CSS selector of the highlighted element
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    target: '[data-tour="stats"]',
    title: "Where the money stands",
    body: "Four figures covering every invoice, whatever the filters below are set to: what is still outstanding, what has been billed in total, what is past its due date, and what has actually reached the bank. Outstanding sits on the red card with a bar showing how much you have collected so far.",
  },
  {
    target: '[data-tour="filters"]',
    title: "Finding an invoice",
    body: "Search by number or customer, then narrow with the status buttons, the month dropdown or the sort. Export downloads a spreadsheet matching whatever filters are on.",
  },
  {
    target: '[data-tour="table"]',
    title: "The invoice table",
    body: "Click an invoice number to open and edit it, the printer to print it straight away, or the status pill to record a payment. Tick the boxes on the left to move several to the trash at once.",
  },
  {
    target: '[data-tour="customers"]',
    title: "Customers",
    body: "What each customer owes, largest outstanding first, with a bar showing how much of their billing has been collected. Click one to see everything on file for them — and save their address and NPWP so the invoice form fills itself in.",
  },
  {
    target: '[data-tour="new-invoice"]',
    title: "New invoice",
    body: "Start here. The number fills in automatically, saved customers fill their own details, and the payment term decides when the invoice starts counting down towards its due date.",
  },
  {
    target: '[data-tour="help"]',
    title: "Still unclear?",
    body: "The guide walks through every part of the app step by step. It is always in the sidebar, bottom left.",
  },
];

export default function GuidedTour() {
  const [step, setStep] = useState<number | null>(null); // null = tour inactive
  const [rect, setRect] = useState<DOMRect | null>(null);
  // localStorage key for the current user; set once we know who's logged in.
  const storageKey = useRef<string | null>(null);

  // Auto-start the first time THIS user opens the app, and allow replay.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u: { id?: number; username?: string } | null) => {
        if (cancelled) return;
        // Key by user id (fall back to username) so each account is tracked
        // separately; if we can't identify the user, don't auto-start.
        const key = u?.id ?? u?.username;
        if (key === undefined || key === null) return;
        storageKey.current = tourKeyFor(String(key));
        if (!localStorage.getItem(storageKey.current)) {
          t = setTimeout(() => setStep(0), 900); // let the page settle first
        }
      })
      .catch(() => {});

    const onReplay = () => setStep(0);
    window.addEventListener(TOUR_EVENT, onReplay);
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
      window.removeEventListener(TOUR_EVENT, onReplay);
    };
  }, []);

  // Measure the current step's target; skip steps whose target is missing.
  useEffect(() => {
    if (step === null) return;
    const el = document.querySelector(STEPS[step].target);
    // Skip steps whose target is missing or hidden (e.g. sidebar on mobile).
    const r = el?.getBoundingClientRect();
    if (!el || !r || (r.width === 0 && r.height === 0)) {
      setStep((s) =>
        s !== null && s + 1 < STEPS.length ? s + 1 : null
      );
      return;
    }
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const t = setTimeout(measure, 350); // re-measure after smooth scroll
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  const finish = () => {
    if (storageKey.current) localStorage.setItem(storageKey.current, "1");
    setStep(null);
    setRect(null);
  };

  if (step === null || !rect) return null;

  const pad = 6;
  const spot = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };

  // Keep the tooltip fully on-screen even when the target is taller than the
  // viewport (e.g. a long invoice table): anchor to the visible slice of the
  // target and clamp into the viewport so it never scrolls off-screen.
  const vpH = window.innerHeight;
  const gap = 12;
  const tipH = 250; // generous height estimate used only for clamping
  const tooltipW = 320;
  const visTop = Math.max(spot.top, 8);
  const visBottom = Math.min(spot.top + spot.height, vpH - 8);
  let tooltipTop: number;
  if (visBottom + gap + tipH <= vpH - 8) {
    tooltipTop = visBottom + gap; // below the visible part of the target
  } else if (visTop - gap - tipH >= 8) {
    tooltipTop = visTop - gap - tipH; // above it
  } else {
    tooltipTop = vpH - tipH - 12; // target fills the screen → pin near bottom
  }
  tooltipTop = Math.max(8, Math.min(tooltipTop, vpH - tipH - 8));
  const tooltipLeft = Math.min(
    Math.max(spot.left, 16),
    Math.max(16, window.innerWidth - tooltipW - 16)
  );

  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {/* Spotlight: transparent hole + huge shadow darkens everything else. */}
      <div
        className="absolute rounded-xs outline-2 outline-white transition-all duration-300"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
        }}
      />
      <div
        className="app-font panel absolute w-80 shadow-pop transition-all duration-300"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="panel-head flex items-baseline justify-between gap-2 px-3.5 py-2">
          <h3 className="lbl lbl-strong">{STEPS[step].title}</h3>
          <span className="lbl tabular-nums">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <p className="px-3.5 py-3 text-xs leading-relaxed text-ink-2">
          {STEPS[step].body}
        </p>
        <div className="flex items-center justify-between gap-2 border-t border-line bg-soft px-3.5 py-2.5">
          <button onClick={finish} className="btn btn-quiet btn-sm">
            Skip
          </button>
          <div className="flex gap-1.5">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="btn btn-sm"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStep(step + 1))}
              className="btn btn-primary btn-sm"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
