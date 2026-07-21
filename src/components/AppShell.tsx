"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HelpGuide from "./HelpGuide";
import ChangePassword from "./ChangePassword";
import IdleLogout from "./IdleLogout";
import NewInvoiceButton from "./NewInvoiceButton";
import Image from "next/image";

interface Me {
  username: string;
  name: string;
  role: string;
}

export type NavKey = "invoices" | "customers" | "users" | "trash";

function NavIcon({ path }: { path: string }) {
  return (
    <svg
      className="mr-3 h-5 w-5 opacity-70"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d={path}
      />
    </svg>
  );
}

const ICONS: Record<NavKey, string> = {
  invoices:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  customers:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  users:
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  trash:
    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
};

export default function AppShell({
  active,
  title,
  subtitle,
  invoiceCount,
  bellDot,
  onBellClick,
  children,
}: {
  active: NavKey;
  title: string;
  subtitle?: string;
  /** Badge on the Invoices nav item (homepage passes the live count). */
  invoiceCount?: number;
  /** Show a red dot on the bell; clicking calls onBellClick. */
  bellDot?: boolean;
  onBellClick?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u: Me | null) => setMe(u))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const displayName = me?.name || me?.username || "…";
  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const item = (
    key: NavKey,
    href: string,
    label: string,
    extra?: React.ReactNode,
    dataTour?: string
  ) =>
    active === key ? (
      <div className="relative" key={key}>
        <div className="absolute inset-y-1 left-0 w-1 rounded-r-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
        <Link
          href={href}
          data-tour={dataTour}
          className="ml-1 flex items-center rounded-lg bg-slate-800/80 px-3 py-2.5 text-sm font-semibold text-white"
        >
          <span className="text-blue-400">
            <NavIcon path={ICONS[key]} />
          </span>
          {label}
          {extra}
        </Link>
      </div>
    ) : (
      <Link
        key={key}
        href={href}
        data-tour={dataTour}
        className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
      >
        <NavIcon path={ICONS[key]} />
        {label}
        {extra}
      </Link>
    );

  const countBadge =
    invoiceCount !== undefined ? (
      <span className="ml-auto rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
        {invoiceCount}
      </span>
    ) : undefined;

  const sidebar = (
    <>
      {/* Logo */}
      <div className="mt-2 flex h-16 items-center px-6">
        <div className="mr-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-md ring-1 ring-white/20">
          <Image
            src="/logo-sfl.png"
            alt="Salam Fortuna Logistik"
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-base leading-tight font-bold tracking-tight text-white">
            Salam Fortuna Logistik
          </span>
          <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
            App
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <nav className="space-y-1">
          {item("invoices", "/", "Invoices", countBadge)}
          {item("customers", "/customers", "Customers", undefined, "customers")}
        </nav>

        <div className="mt-10 mb-3 px-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          Lainnya
        </div>
        <nav className="space-y-1">
          {me?.role === "admin" && item("users", "/users", "Users")}
          {me?.role === "admin" && item("trash", "/trash", "Trash")}
          <HelpGuide variant="sidebar" />
        </nav>
      </div>

      {/* Profile */}
      <div className="m-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-slate-200">
              {initials}
            </div>
            <div className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold text-white">
              {displayName}
            </span>
            <span className="truncate text-[11px] text-slate-400">
              {me?.role === "admin" ? "Administrator" : "Member"}
            </span>
          </div>
          <ChangePassword />
          <button
            onClick={logout}
            title="Logout"
            className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="app-font flex h-screen overflow-hidden bg-slate-50 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      <IdleLogout />
      {/* Desktop sidebar */}
      <aside className="relative z-20 hidden h-full w-[260px] shrink-0 flex-col bg-slate-950 text-slate-300 md:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawer(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] flex-col bg-slate-950 text-slate-300 shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="relative flex h-screen flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawer(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              title="Menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <nav className="flex text-sm font-medium text-slate-500">
              <span className="hidden sm:inline">Home</span>
              <svg
                className="mx-1 hidden h-4 w-4 self-center text-slate-300 sm:block"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="font-semibold text-slate-900">{title}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {onBellClick && (
              <button
                onClick={onBellClick}
                title="Lihat invoice overdue"
                className="relative rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {bellDot && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
                )}
              </button>
            )}
            <NewInvoiceButton />
          </div>
        </header>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
              )}
            </div>
            {children}
            <div className="h-12" />
          </div>
        </div>
      </main>
    </div>
  );
}
