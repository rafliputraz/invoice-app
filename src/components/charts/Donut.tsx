"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * A donut over one total, split into slices that partition it exactly.
 *
 * Drawn with stroke-dasharray on concentric circles rather than arc paths, so
 * the 2px gap between segments is a real surface gap and the geometry cannot
 * drift. The centre carries the total, because a donut without its total makes
 * the reader guess at the scale.
 *
 * On mount the ring sweeps clockwise from twelve o'clock, one slice handing
 * off to the next — the same order the legend lists them in.
 */
export default function Donut({
  slices,
  centerLabel,
  centerValue,
  size = 168,
  thickness = 22,
}: {
  slices: { label: string; value: number; color: string; note?: string }[];
  centerLabel: string;
  centerValue: string;
  size?: number;
  thickness?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  // A 2px surface gap between segments — the same spacer the bars use.
  const gap = total > 0 ? 2 : 0;

  let running = 0;
  const drawn = slices.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const len = Math.max(0, frac * c - gap);
    const seg = { ...s, len, offset: running, frac };
    running += frac * c;
    return seg;
  });

  /* Once only. A re-run would revert the sweep mid-flight and leave slices,
     legend rows and the centre total stranded at their start values. */
  const swept = useRef(false);

  useGSAP(
    () => {
      if (swept.current || total === 0) return;
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate) return;
        swept.current = true;

        const tl = gsap.timeline();
        gsap.utils.toArray<SVGCircleElement>(".slice").forEach((el, i) => {
          const len = Number(el.dataset.len ?? 0);
          const off = Number(el.dataset.offset ?? 0);
          // Hidden until its turn, then unrolled to its true length.
          tl.fromTo(
            el,
            { strokeDasharray: `0 ${c}`, strokeDashoffset: -off },
            {
              strokeDasharray: `${len} ${c - len}`,
              duration: Math.max(0.3, (len / c) * 2.2),
              ease: "power2.inOut",
              clearProps: "strokeDasharray,strokeDashoffset",
            },
            i === 0 ? 0.1 : "-=0.08"
          );
        });

        tl.from(
          ".legend-row",
          {
            autoAlpha: 0,
            x: -8,
            duration: 0.45,
            ease: "power2.out",
            stagger: 0.08,
            clearProps: "opacity,visibility,transform",
          },
          0.2
        );
        tl.from(
          ".centre > *",
          {
            autoAlpha: 0,
            scale: 0.9,
            duration: 0.5,
            ease: "back.out(1.6)",
            clearProps: "opacity,visibility,transform",
          },
          0.45
        );
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [total > 0] }
  );

  const pct = (f: number) => `${(f * 100).toFixed(f >= 0.1 ? 0 : 1)}%`;

  return (
    <div ref={root} className="flex flex-wrap items-center gap-x-7 gap-y-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`${centerLabel} ${centerValue}. ${drawn
            .map((s) => `${s.label} ${pct(s.frac)}`)
            .join(", ")}.`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={thickness}
          />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {drawn.map(
              (s) =>
                s.value > 0 && (
                  <circle
                    key={s.label}
                    className="slice"
                    data-len={s.len}
                    data-offset={s.offset}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={thickness}
                    strokeLinecap="butt"
                    strokeDasharray={`${s.len} ${c - s.len}`}
                    strokeDashoffset={-s.offset}
                  />
                )
            )}
          </g>
        </svg>
        <div className="centre pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="fig text-[17px] leading-tight">{centerValue}</span>
          <span className="mt-0.5 text-[11px] font-medium text-ink-3">
            {centerLabel}
          </span>
        </div>
      </div>

      {/* The legend carries the words and the figures — colour is never the
          only thing distinguishing a slice. */}
      <ul className="min-w-[140px] flex-1 space-y-3">
        {drawn.map((s) => (
          <li key={s.label} className="legend-row flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-semibold text-ink-2">
                  {s.label}
                </span>
                <span className="fig text-[13px]">{pct(s.frac)}</span>
              </span>
              {s.note && (
                <span className="mt-0.5 block text-[11.5px] text-ink-3">
                  {s.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
