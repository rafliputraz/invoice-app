"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { IconClose } from "./Icons";

gsap.registerPlugin(useGSAP);

/**
 * The one dialog in the app. Every modal surface goes through here so the
 * world stays consistent: a card lifted off the page over a soft scrim, a
 * ruled head, escape to close, and focus moved into the panel on open.
 *
 * It enters in two beats — the scrim washes in, the card rises just behind it
 * — so the page reads as being covered rather than the card appearing out of
 * nowhere. Held still under prefers-reduced-motion.
 */
export default function Dialog({
  open,
  onClose,
  title,
  /** Small secondary line under the title. */
  note,
  width = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  note?: string;
  width?: "sm" | "md" | "lg";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the panel so keyboard users land inside the dialog.
    const t = window.setTimeout(() => {
      const target = panel.current?.querySelector<HTMLElement>(
        "input:not([type=hidden]), select, textarea, button"
      );
      target?.focus();
    }, 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  useGSAP(
    () => {
      if (!open) return;
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate) return;
        gsap
          .timeline()
          .from(".scrim", { autoAlpha: 0, duration: 0.2, ease: "none" })
          .from(
            ".dialog-panel",
            { y: 22, scale: 0.97, autoAlpha: 0, duration: 0.34, ease: "power3.out" },
            0.04
          )
          .from(
            ".dialog-body > *",
            {
              y: 8,
              autoAlpha: 0,
              duration: 0.3,
              ease: "power2.out",
              stagger: 0.035,
            },
            0.16
          );
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [open] }
  );

  if (!open || !mounted) return null;

  const maxW =
    width === "sm" ? "max-w-sm" : width === "lg" ? "max-w-2xl" : "max-w-md";

  return createPortal(
    <div
      ref={root}
      className="app-font fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 py-[8vh]"
    >
      <div
        className="scrim fixed inset-0 bg-ink/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`dialog-panel relative w-full ${maxW} card shadow-pop`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
              {title}
            </h2>
            {note && (
              <p className="mt-0.5 truncate text-[12.5px] text-ink-2">{note}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-quiet -mt-1 -mr-1.5 shrink-0 p-1.5"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="dialog-body px-5 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-line bg-soft px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
