"use client";

import { Suspense, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ShippingBackdrop from "@/components/ShippingBackdrop";
import { IconEye, IconEyeOff, IconLock } from "@/components/Icons";

gsap.registerPlugin(useGSAP);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "Sign in failed");
      }
      const next = searchParams.get("next") || "/";
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign in failed. Try again."
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="lbl lbl-strong mb-1.5 block">Username</span>
        <input
          className="field"
          placeholder="Your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </label>

      <label className="block">
        <span className="lbl lbl-strong mb-1.5 block">Password</span>
        <span className="relative block">
          <input
            type={showPassword ? "text" : "password"}
            className="field pr-11"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            title={showPassword ? "Hide password" : "Show password"}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-3 transition-colors hover:text-ink"
          >
            {showPassword ? (
              <IconEyeOff className="h-[18px] w-[18px]" />
            ) : (
              <IconEye className="h-[18px] w-[18px]" />
            )}
          </button>
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-overdue-soft px-3.5 py-2.5 text-[13px] font-semibold text-overdue"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary w-full py-3 text-[14px]"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const root = useRef<HTMLDivElement>(null);

  /* One quiet entrance: the brand, then the card, then the fine print. */
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate) return;
        gsap
          .timeline({ defaults: { ease: "power3.out", duration: 0.7 } })
          .from(".intro > *", { y: 18, autoAlpha: 0, stagger: 0.09 })
          .from(".signin", { y: 26, autoAlpha: 0, duration: 0.8 }, "-=0.5")
          .from(".fineprint", { autoAlpha: 0, duration: 0.6 }, "-=0.4");
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <div
      ref={root}
      className="app-font relative min-h-screen overflow-hidden bg-bg text-ink antialiased"
    >
      <ShippingBackdrop />

      <div className="relative mx-auto flex min-h-screen max-w-[1180px] flex-col justify-center gap-12 px-6 py-12 lg:flex-row lg:items-center lg:gap-20">
        {/* Who this belongs to */}
        <div className="intro min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-sfl.png"
              alt=""
              width={52}
              height={52}
              className="h-12 w-12 object-contain"
              priority
            />
            <div className="leading-tight">
              <p className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                SFL
              </p>
              <p className="text-[12.5px] font-medium text-ink-3">
                PT. Salam Fortuna Logistik
              </p>
            </div>
          </div>

          <h1 className="mt-9 max-w-[16ch] text-[34px] leading-[1.1] font-extrabold tracking-[-0.035em] text-ink md:text-[44px]">
            Every shipment,{" "}
            <span className="text-brand">invoiced properly.</span>
          </h1>

          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">
            The invoice register for sea freight — correctly numbered, correctly
            taxed, and tracked through to the cash that actually lands.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
            {[
              "Bill of lading to bank",
              "PPN & PPh handled",
              "Rupiah and USD kept apart",
            ].map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 text-[13px] font-semibold text-ink-2"
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-brand"
                />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Sign in */}
        <div className="signin w-full shrink-0 lg:w-[400px]">
          <div className="card p-7">
            <h2 className="text-[20px] font-extrabold tracking-[-0.025em] text-ink">
              Welcome back
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-2">
              Sign in to the invoice register.
            </p>

            <div className="mt-6">
              <Suspense
                fallback={<p className="note py-10 text-center">Loading…</p>}
              >
                <LoginForm />
              </Suspense>
            </div>

            <p className="mt-6 flex items-center justify-center gap-2 border-t border-line pt-4 text-[12px] text-ink-3">
              <IconLock className="h-3.5 w-3.5" />
              Sessions close after 15 minutes without activity.
            </p>
          </div>

          <p className="fineprint mt-5 text-center text-[11.5px] leading-relaxed text-ink-3">
            © {new Date().getFullYear()} PT. Salam Fortuna Logistik. Internal
            system — authorised users only.
          </p>
        </div>
      </div>
    </div>
  );
}
