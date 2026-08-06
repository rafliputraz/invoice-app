"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * The product's one page entrance, so every screen arrives the same way:
 * anything marked `.anim-card` rises in reading order, then anything marked
 * `.anim-row` follows in a tighter stagger.
 *
 * Two rules make it smooth, both learned the hard way:
 *
 *  1. **The card entrance runs once and can never be interrupted.** It lives in
 *     its own effect with no dependencies. An earlier version keyed it to the
 *     row count with `revertOnUpdate`, so the fetch resolving mid-entrance
 *     reverted the tween and replayed it — the page visibly stuttered, then
 *     settled on the second try.
 *  2. **Rows animate once, the first time they exist**, because they arrive
 *     after a fetch. Filtering or searching afterwards must not replay them:
 *     re-animating a list on every keystroke is noise, not feedback.
 *
 * Pass the current row count so the hook knows when rows have arrived.
 * Held completely still under prefers-reduced-motion.
 */
export default function useReveal<T extends HTMLElement>(rowCount = 0) {
  const scope = useRef<T>(null);
  const rowsDone = useRef(false);

  // Cards — once, on mount, uninterruptible.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate) return;
        gsap.from(".anim-card", {
          y: 18,
          autoAlpha: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.07,
        });
      });
      return () => mm.revert();
    },
    { scope }
  );

  // Rows — once, as soon as there are any.
  useGSAP(
    () => {
      if (rowsDone.current || rowCount === 0) return;
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate) return;
        const rows = gsap.utils.toArray<HTMLElement>(".anim-row");
        if (rows.length === 0) return;
        rowsDone.current = true;
        gsap.from(rows, {
          y: 10,
          autoAlpha: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.025,
          // The cards are still settling; slot the rows in behind them.
          delay: 0.1,
        });
      });
      return () => mm.revert();
    },
    { scope, dependencies: [rowCount > 0] }
  );

  return scope;
}
