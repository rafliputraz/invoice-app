"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * A figure that counts up to its value once, then holds.
 *
 * The formatted value is rendered on the server and on first paint, so the
 * number is correct before any JavaScript runs and correct again the instant
 * the tween ends — the animation is decoration over a value that is never
 * wrong. Under prefers-reduced-motion it simply appears.
 */
export default function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = useRef(format);
  fmt.current = format;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate || value === 0) {
          el.textContent = fmt.current(value);
          return;
        }
        const counter = { n: 0 };
        gsap.to(counter, {
          n: value,
          duration: 1.1,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = fmt.current(counter.n);
          },
          onComplete: () => {
            el.textContent = fmt.current(value);
          },
        });
      });
      return () => {
        mm.revert();
        // A tween killed part-way would otherwise leave a half-counted figure
        // on screen. A wrong number is never an acceptable animation artifact.
        if (el) el.textContent = fmt.current(value);
      };
    },
    { dependencies: [value] }
  );

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
