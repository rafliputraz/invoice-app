"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * The sign-in screen's backdrop: a freight forwarder's world, moving slowly.
 *
 * Three trade routes arc between ports. Each carries a travelling highlight —
 * a short bright dash walking the path — which is a shipment under way. Port
 * nodes breathe, a container stack settles on the quay, and a ship crosses the
 * frame once every fifty seconds.
 *
 * Everything is deliberately slow and low-contrast: this sits behind a form
 * someone types a password into, so it must never pull the eye. Under
 * prefers-reduced-motion the scene renders in full but holds completely still.
 */
export default function ShippingBackdrop() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        { animate: "(prefers-reduced-motion: no-preference)" },
        (ctx) => {
          if (!ctx.conditions?.animate) return;

          // Trade routes: a short dash walks each path, end to end, forever.
          // The dash is the shipment; the faint line under it is the route.
          gsap.utils.toArray<SVGPathElement>(".route-run").forEach((path, i) => {
            const len = path.getTotalLength();
            const dash = 90;
            gsap.set(path, {
              strokeDasharray: `${dash} ${len}`,
              strokeDashoffset: 0,
            });
            gsap.to(path, {
              strokeDashoffset: -(len + dash),
              duration: 11 + i * 3.5,
              ease: "none",
              repeat: -1,
              delay: i * 2.2,
            });
          });

          // Ports breathe.
          gsap.to(".port-ring", {
            scale: 1.9,
            opacity: 0,
            transformOrigin: "center",
            duration: 3.2,
            ease: "power2.out",
            repeat: -1,
            stagger: { each: 1.1, from: "random" },
          });

          // The quay: stacked boxes settle and lift, barely.
          gsap.to(".box", {
            y: -7,
            duration: 3.4,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            stagger: { each: 0.28, from: "edges" },
          });

          // One crossing, very slow.
          gsap.fromTo(
            ".ship",
            { x: -320 },
            { x: 1780, duration: 58, ease: "none", repeat: -1 }
          );

          // Ambient wash drifting behind everything.
          gsap.to(".wash-a", {
            xPercent: 12,
            yPercent: -8,
            scale: 1.12,
            duration: 26,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
          gsap.to(".wash-b", {
            xPercent: -10,
            yPercent: 9,
            scale: 1.08,
            duration: 32,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
        }
      );

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div
      ref={root}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Ambient wash */}
      <div className="wash-a absolute -top-[22%] -left-[12%] h-[70vh] w-[70vh] rounded-full bg-brand/[0.07] blur-3xl" />
      <div className="wash-b absolute -right-[16%] -bottom-[26%] h-[80vh] w-[80vh] rounded-full bg-[#2563eb]/[0.06] blur-3xl" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="runGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d6291e" stopOpacity="0" />
            <stop offset="50%" stopColor="#d6291e" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#d6291e" stopOpacity="0" />
          </linearGradient>
          <pattern
            id="dots"
            width="34"
            height="34"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.5" cy="1.5" r="1.5" fill="#0f172a" opacity="0.05" />
          </pattern>
        </defs>

        <rect width="1440" height="900" fill="url(#dots)" />

        {/* Three routes. The faint arc is the lane; the bright dash on top of
            it is a shipment currently moving along it. */}
        {[
          "M -60 250 C 300 90, 640 150, 900 250 S 1300 420, 1520 330",
          "M -60 520 C 260 620, 520 430, 840 470 S 1240 620, 1520 540",
          "M -60 720 C 340 800, 700 690, 1010 730 S 1320 800, 1520 740",
        ].map((d, i) => (
          <g key={i}>
            <path
              d={d}
              stroke="#0f172a"
              strokeOpacity="0.09"
              strokeWidth="1.5"
              strokeDasharray="7 9"
              strokeLinecap="round"
            />
            <path
              className="route-run"
              d={d}
              stroke="url(#runGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* Ports */}
        {[
          [900, 250],
          [840, 470],
          [1010, 730],
          [300, 168],
          [420, 566],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle
              className="port-ring"
              cx={cx}
              cy={cy}
              r="9"
              stroke="#d6291e"
              strokeOpacity="0.5"
              strokeWidth="1.5"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
            <circle cx={cx} cy={cy} r="3.5" fill="#d6291e" fillOpacity="0.45" />
          </g>
        ))}

        {/* The quay: a stack of containers, seen end-on. */}
        <g opacity="0.13">
          {[
            [120, 690],
            [176, 690],
            [232, 690],
            [148, 646],
            [204, 646],
            [176, 602],
          ].map(([x, y], i) => (
            <rect
              key={i}
              className="box"
              x={x}
              y={y}
              width="50"
              height="38"
              rx="4"
              fill={i % 3 === 0 ? "#d6291e" : i % 3 === 1 ? "#0f172a" : "#2563eb"}
            />
          ))}
          <rect x="96" y="732" width="184" height="6" rx="3" fill="#0f172a" />
        </g>

        {/* A container ship, crossing once a minute. */}
        <g className="ship" opacity="0.1">
          <path
            d="M 0 806 L 232 806 L 208 842 L 22 842 Z"
            fill="#0f172a"
          />
          <rect x="30" y="778" width="42" height="26" rx="3" fill="#d6291e" />
          <rect x="78" y="778" width="42" height="26" rx="3" fill="#0f172a" />
          <rect x="126" y="778" width="42" height="26" rx="3" fill="#2563eb" />
          <rect x="52" y="752" width="42" height="24" rx="3" fill="#0f172a" />
          <rect x="100" y="752" width="42" height="24" rx="3" fill="#d6291e" />
          <rect x="182" y="758" width="30" height="46" rx="4" fill="#0f172a" />
        </g>
      </svg>

      {/* The scene fades into the page rather than stopping at an edge. */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
    </div>
  );
}
