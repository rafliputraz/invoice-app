"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import HelpGuide from "./HelpGuide";
import ChangePassword from "./ChangePassword";
import IdleLogout from "./IdleLogout";
import NewInvoiceButton from "./NewInvoiceButton";
import {
  IconAlert,
  IconClose,
  IconCompany,
  IconLogout,
  IconMenu,
  IconRegister,
  IconTrash,
  IconUser,
} from "./Icons";

gsap.registerPlugin(useGSAP);

interface Me {
  username: string;
  name: string;
  role: string;
}

export type NavKey = "invoices" | "customers" | "users" | "trash";

export default function AppShell({
  active,
  title,
  subtitle,
  overdueDot,
  onOverdueClick,
  children,
}: {
  active: NavKey;
  title: string;
  subtitle?: string;
  /** Light the overdue bell; clicking calls onOverdueClick. */
  overdueDot?: boolean;
  onOverdueClick?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [drawer, setDrawer] = useState(false);

  /* The chrome arrives once, ahead of the page: the mark, then the nav down
     the rail, then the bar's controls. It never replays on navigation — the
     shell persists, only the page inside it changes. */
  const shell = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate) return;
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(".brand-mark", { x: -14, autoAlpha: 0, duration: 0.5 })
          .from(
            ".rail-nav > *",
            { x: -12, autoAlpha: 0, duration: 0.4, stagger: 0.055 },
            0.08
          )
          .from(".rail-help", { y: 14, autoAlpha: 0, duration: 0.45 }, 0.3)
          .from(
            ".bar-tools > *",
            { y: -10, autoAlpha: 0, duration: 0.4, stagger: 0.06 },
            0.12
          );
      });
      return () => mm.revert();
    },
    { scope: shell }
  );

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
    Icon: (p: { className?: string }) => React.ReactElement,
    tour?: string
  ) => (
    <Link
      key={key}
      href={href}
      data-tour={tour}
      aria-current={active === key ? "page" : undefined}
      onClick={() => setDrawer(false)}
      className="navitem"
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );

  const sidebar = (
    <>
      {/* The company mark is red on white — on a white sidebar it finally sits
          where it belongs, at full strength. */}
      <div className="brand-mark flex items-center gap-2.5 px-5 pt-5 pb-6">
        <Image
          src="/logo-sfl.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 object-contain"
          priority
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-ink">
            SFL
          </p>
          <p className="truncate text-[11px] font-medium text-ink-3">
            Salam Fortuna Logistik
          </p>
        </div>
        <button
          onClick={() => setDrawer(false)}
          aria-label="Close menu"
          className="btn btn-quiet ml-auto p-1.5 lg:hidden"
        >
          <IconClose className="h-5 w-5" />
        </button>
      </div>

      <nav className="rail-nav flex-1 space-y-1 overflow-y-auto px-3">
        {item("invoices", "/", "Dashboard", IconRegister)}
        {item("customers", "/customers", "Customers", IconCompany, "customers")}
        {me?.role === "admin" && item("users", "/users", "Users", IconUser)}
        {me?.role === "admin" && item("trash", "/trash", "Trash", IconTrash)}
      </nav>

      {/* Help, given a real home rather than a buried icon. */}
      <div className="rail-help p-3">
        <div className="rounded-xl bg-brand-soft p-4">
          <p className="text-[13px] font-bold text-brand">Need a hand?</p>
          <p className="mt-1 text-[12px] leading-snug text-ink-2">
            A step-by-step walkthrough of every part of the app.
          </p>
          <div className="mt-3">
            <HelpGuide variant="sidebar" />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div
      ref={shell}
      className="app-font flex min-h-screen bg-bg text-ink antialiased"
    >
      <IdleLogout />

      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-card lg:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawer(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[262px] flex-col bg-card shadow-pop">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex min-h-[68px] flex-wrap items-center gap-3 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur md:px-7">
          <button
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="btn btn-quiet -ml-1 p-2 lg:hidden"
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-extrabold tracking-[-0.025em] text-ink md:text-[21px]">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-[12.5px] text-ink-2">{subtitle}</p>
            )}
          </div>

          <div className="bar-tools flex shrink-0 items-center gap-2">
            {onOverdueClick && (
              <button
                onClick={onOverdueClick}
                title="Show overdue invoices"
                aria-label="Show overdue invoices"
                className="btn btn-quiet relative p-2"
              >
                <IconAlert className="h-[18px] w-[18px]" />
                {overdueDot && (
                  <span
                    aria-hidden
                    className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-overdue ring-2 ring-bg"
                  />
                )}
              </button>
            )}

            <div className="hidden items-center gap-2 rounded-full bg-card py-1 pr-3 pl-1 shadow-card sm:flex">
              <span
                aria-hidden
                className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white"
              >
                {initials}
              </span>
              <span className="max-w-[14ch] truncate text-[13px] font-semibold text-ink">
                {displayName}
              </span>
              <ChangePassword />
              <button
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="btn btn-quiet -mr-1.5 p-1.5"
              >
                <IconLogout className="h-4 w-4" />
              </button>
            </div>

            <NewInvoiceButton />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 md:px-7 md:py-6">
          {children}
          <div className="h-8" />
        </main>
      </div>
    </div>
  );
}
