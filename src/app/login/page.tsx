"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
        throw new Error(body.error || "Login failed");
      }
      const next = searchParams.get("next") || "/";
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  };

  const inputCls =
    "block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 text-sm font-medium text-slate-900 placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Brand */}
      <div className="mb-10 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-sfl.png" alt="Salam Fortuna Logistik" className="h-11 w-auto" />
        <div className="flex flex-col">
          <span className="text-2xl leading-none font-extrabold tracking-tight text-slate-900">
            SFL System
          </span>
          <span className="mt-0.5 text-[10px] font-bold tracking-widest text-blue-600 uppercase">
            Logistics
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="text-sm font-medium text-slate-500">
          Masuk untuk mengelola invoice PT. Salam Fortuna Logistik.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Username */}
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">
            Username
          </label>
          <div className="group/input relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <svg
                className="h-5 w-5 text-slate-400 transition-colors group-focus-within/input:text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <input
              className={`${inputCls} pr-4`}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-700">
            Password
          </label>
          <div className="group/input relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <svg
                className="h-5 w-5 text-slate-400 transition-colors group-focus-within/input:text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              className={`${inputCls} pr-11 tracking-wider`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? "Sembunyikan password" : "Lihat password"}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-colors hover:text-slate-600"
            >
              {showPassword ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="group mt-2 flex w-full transform items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-bold text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign In"}
          {!busy && (
            <svg
              className="h-4 w-4 opacity-70 transition-all group-hover:translate-x-1 group-hover:opacity-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          )}
        </button>
      </form>

      <div className="mt-12 text-center">
        <p className="text-xs font-medium text-slate-500">
          © {new Date().getFullYear()} PT. Salam Fortuna Logistik.
          <br />
          All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="app-font flex h-screen overflow-hidden bg-white text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Left: form */}
      <div className="relative z-10 flex h-full w-full flex-col justify-center bg-white px-8 shadow-[20px_0_40px_rgba(0,0,0,0.05)] sm:px-16 lg:w-[45%] lg:px-24 xl:w-[40%]">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>

      {/* Right: static dark graphic panel */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-[#0b1120] lg:flex">
        <div className="pattern-grid absolute inset-0 opacity-60" />

        {/* Soft gradient blobs */}
        <div className="absolute -top-20 left-[10%] h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-[5%] bottom-[5%] h-[28rem] w-[28rem] rounded-full bg-blue-700/10 blur-3xl" />

        {/* Content box */}
        <div className="relative z-10 max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-sm">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <svg
              className="h-6 w-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className="mb-4 text-3xl leading-tight font-bold text-white">
            Streamline Your
            <br />
            Logistics Operations.
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-slate-300">
            Kelola invoicing, data customer, dan tagihan dalam satu platform
            terpadu yang aman untuk PT. Salam Fortuna Logistik.
          </p>

          <div className="inline-flex items-center gap-3 rounded-full border border-white/5 bg-black/20 px-4 py-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold tracking-wide text-slate-300">
              SYSTEM OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
