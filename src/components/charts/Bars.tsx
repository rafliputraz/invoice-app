"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export interface BarMonth {
  /** "2026-08" */
  ym: string;
  label: string;
  settled: number;
  open: number;
  overdue: number;
}

/**
 * Stacked bars: what was invoiced each month, split by where that money now
 * stands. Same three entities and the same three colours as the donut, one
 * granularity down — so a colour means one thing across the whole product.
 *
 * The stacks grow up from the baseline once, left to right, because that is
 * the direction the axis is read in. Hovering a month dims the others and
 * opens a breakdown.
 */
export default function Bars({
  months,
  format,
}: {
  months: BarMonth[];
  /** Formats a rupiah amount for the tooltip. */
  format: (n: number) => string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const totals = months.map((m) => m.settled + m.open + m.overdue);
  const max = Math.max(1, ...totals);

  const SERIES: {
    key: "settled" | "open" | "overdue";
    label: string;
    color: string;
  }[] = [
    { key: "settled", label: "Settled", color: "var(--color-paid)" },
    { key: "open", label: "Open", color: "var(--color-open)" },
    { key: "overdue", label: "Overdue", color: "var(--color-overdue)" },
  ];

  /* Runs exactly once, the first time there is anything to draw.
     The twelve columns exist from the first render, so this cannot key on
     their number — it would grow the bars while every one was still
     zero-height. But it must not re-run either: a re-run reverts the tween
     mid-flight and strands the bars at scaleY(0), which is precisely how this
     chart went blank once already. Hence the ref guard, plus clearProps so no
     inline transform outlives the animation. */
  const grown = useRef(false);
  const dataTotal = totals.reduce((a, b) => a + b, 0);

  useGSAP(
    () => {
      if (grown.current || dataTotal === 0) return;
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate) return;
        grown.current = true;
        gsap.from(".stack", {
          scaleY: 0,
          transformOrigin: "bottom center",
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.055,
          clearProps: "transform",
        });
        gsap.from(".month-label", {
          autoAlpha: 0,
          y: 6,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.045,
          delay: 0.15,
          clearProps: "opacity,visibility,transform",
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [dataTotal > 0] }
  );

  if (months.length === 0) {
    return (
      <p className="note py-10 text-center">
        Nothing invoiced yet — this chart fills in as invoices are issued.
      </p>
    );
  }

  return (
    <div ref={root}>
      <div className="flex items-end gap-1.5 sm:gap-2.5" style={{ height: 168 }}>
        {months.map((m, i) => {
          const total = totals[i];
          const on = hover === m.ym;
          return (
            <div
              key={m.ym}
              onMouseEnter={() => setHover(m.ym)}
              onMouseLeave={() => setHover((h) => (h === m.ym ? null : h))}
              className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              {on && total > 0 && (
                <div className="settle pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[210px] -translate-x-1/2 rounded-xl bg-ink px-3 py-2.5 text-left shadow-pop">
                  <p className="text-[11.5px] font-bold text-white">{m.label}</p>
                  <p className="fig mt-0.5 text-[12.5px] text-white">
                    {format(total)}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {SERIES.map((s) => (
                      <li
                        key={s.key}
                        className="flex items-center gap-2 text-[11.5px] text-white/70"
                      >
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: s.color }}
                        />
                        {s.label}
                        <span className="fig ml-auto pl-3 text-white">
                          {format(m[s.key])}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* The stack. A 2px gap between segments keeps adjacent fills
                  from reading as one block. */}
              <div
                className="stack flex w-full flex-col justify-end gap-0.5 transition-opacity duration-200"
                style={{
                  height: `${(total / max) * 100}%`,
                  opacity: hover && !on ? 0.45 : 1,
                }}
              >
                {[...SERIES].reverse().map((s, idx) => {
                  const v = m[s.key];
                  if (v <= 0) return null;
                  return (
                    <div
                      key={s.key}
                      style={{
                        height: `${(v / total) * 100}%`,
                        background: s.color,
                        minHeight: 3,
                        // Only the topmost segment rounds — the stack's data
                        // end, anchored to a flat baseline.
                        borderRadius: idx === 0 ? "5px 5px 0 0" : 0,
                      }}
                    />
                  );
                })}
              </div>
              {total === 0 && (
                <div className="stack h-[3px] w-full rounded-full bg-line" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 flex gap-1.5 sm:gap-2.5">
        {months.map((m) => (
          <span
            key={m.ym}
            className={`month-label min-w-0 flex-1 truncate text-center text-[11px] font-semibold transition-colors ${
              hover === m.ym ? "text-ink" : "text-ink-3"
            }`}
          >
            {m.label.slice(0, 3)}
          </span>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line pt-3.5">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-[12px] font-medium text-ink-2">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
