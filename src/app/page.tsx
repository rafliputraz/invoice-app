"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { InvoiceListItem, InvoiceStatus } from "@/lib/types";
import { fmtIdr, fmtDate, fmtUsd, cleanName } from "@/lib/format";
import AppShell from "@/components/AppShell";
import GuidedTour from "@/components/GuidedTour";
import Dialog from "@/components/Dialog";
import Marking from "@/components/Marking";
import CountUp from "@/components/CountUp";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Donut from "@/components/charts/Donut";
import Bars, { type BarMonth } from "@/components/charts/Bars";
import {
  IconDownload,
  IconPrint,
  IconSearch,
  IconTrash,
  IconEdit,
  IconChevronRight,
  IconCheck,
  IconAlert,
} from "@/components/Icons";

gsap.registerPlugin(useGSAP);

type SortKey = "recent" | "oldest" | "largest" | "due" | "customer";
type StatusFilter = "all" | "unpaid" | "overdue" | "partial" | "paid";

const PAGE_SIZE = 12;

/** Calendar days from today (local) until dueDate; negative = overdue. */
function daysUntil(dueDate: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueDate + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function isOverdue(inv: InvoiceListItem): boolean {
  return (
    inv.status === "unpaid" && inv.dueDate != null && daysUntil(inv.dueDate) < 0
  );
}

/** Marked paid but the recorded cash received is below the net receivable. */
function isPartial(inv: InvoiceListItem): boolean {
  return (
    inv.status === "paid" &&
    inv.amountPaid != null &&
    inv.amountPaid < inv.netReceivedIdr
  );
}

/** Cash actually received on a paid invoice (falls back to net when unrecorded). */
function receivedOf(inv: InvoiceListItem): number {
  return inv.amountPaid != null ? inv.amountPaid : inv.netReceivedIdr;
}

/** Format an amount with the invoice's currency prefix ($ for USD-only, else Rp). */
function money(inv: InvoiceListItem, n: number): string {
  return inv.usdOnly ? `$ ${fmtUsd(n)}` : `Rp ${fmtIdr(n)}`;
}

/** Outstanding cash on a partially-paid invoice (0 otherwise). */
function shortfallOf(inv: InvoiceListItem): number {
  return isPartial(inv) ? inv.netReceivedIdr - (inv.amountPaid ?? 0) : 0;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** The invoice's state as a pill. Colour never travels without its word. */
function StatusPill({ inv }: { inv: InvoiceListItem }) {
  if (isOverdue(inv)) {
    const d = inv.dueDate ? -daysUntil(inv.dueDate) : 0;
    return <span className="pill pill-overdue">Late {d}d</span>;
  }
  if (isPartial(inv)) return <span className="pill pill-short">Short</span>;
  if (inv.status === "paid") return <span className="pill pill-paid">Paid</span>;
  if (!inv.dueDate) return <span className="pill pill-neutral">No term</span>;
  const days = daysUntil(inv.dueDate);
  if (days <= 7)
    return (
      <span className="pill pill-open">
        {days === 0 ? "Due today" : `${days}d left`}
      </span>
    );
  return <span className="pill pill-neutral">{days}d left</span>;
}

/** A dashboard metric: icon tile, figure, label, and a plain sub-line. */
function Stat({
  icon,
  tint,
  amount,
  format,
  label,
  note,
  valueTone,
}: {
  icon: React.ReactNode;
  tint: string;
  amount: number;
  format: (n: number) => string;
  label: string;
  note?: string;
  valueTone?: string;
}) {
  return (
    <div className="anim-card card p-5">
      <span className={`iconchip ${tint}`}>{icon}</span>
      <p
        className={`fig mt-4 text-[20px] leading-tight md:text-[22px] ${valueTone ?? ""}`}
      >
        <CountUp value={amount} format={format} />
      </p>
      <p className="mt-1 text-[13px] font-semibold text-ink">{label}</p>
      {note && <p className="mt-0.5 text-[12px] text-ink-3">{note}</p>}
    </div>
  );
}

/**
 * Modal shown when marking an invoice "paid": records payment date, the cash
 * actually received (supports partial payment), and the bukti-potong number.
 */
function PaymentDialog({
  inv,
  onClose,
  onSubmit,
  onRevert,
}: {
  inv: InvoiceListItem;
  onClose: () => void;
  onSubmit: (p: {
    paidAt: string;
    amountPaid: number;
    bupotNo: string;
    withholdingEnabled: boolean;
    withholdingRate: number;
  }) => void;
  /** Offered only when the invoice already carries a payment record. */
  onRevert: () => void;
}) {
  const [paidAt, setPaidAt] = useState(inv.paidAt ?? todayLocal());
  // PPh is decided here, at payment time — not in the invoice editor. Defaults
  // to on when a cut was already recorded (editing an existing payment).
  const [pphEnabled, setPphEnabled] = useState(inv.withholdingIdr > 0);
  const [pphPct, setPphPct] = useState<string>(
    String((inv.withholdingRate || 0.02) * 100)
  );
  const rate = (Number(pphPct) || 0) / 100;
  const bukpot =
    !inv.usdOnly && pphEnabled ? Math.round(inv.subtotalIdr * rate) : 0;
  const net = inv.totalIdr - bukpot; // the amount expected in the bank
  const [amountPaid, setAmountPaid] = useState<string>(
    String(inv.amountPaid ?? net)
  );
  const [bupotNo, setBupotNo] = useState(inv.bupotNo ?? "");

  const paid = Number(amountPaid) || 0;
  const shortBy = net - paid;

  // Changing the PPh setting changes the net, so re-anchor the paid amount.
  const applyPph = (enabled: boolean, pct: string) => {
    setPphEnabled(enabled);
    setPphPct(pct);
    const r = (Number(pct) || 0) / 100;
    const cut = !inv.usdOnly && enabled ? Math.round(inv.subtotalIdr * r) : 0;
    setAmountPaid(String(inv.totalIdr - cut));
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Record payment — ${inv.invoiceNo}`}
      note={cleanName(inv.customerName)}
      footer={
        <>
          {inv.status === "paid" && (
            <button
              type="button"
              onClick={onRevert}
              className="btn btn-quiet mr-auto"
            >
              Mark unpaid
            </button>
          )}
          <button type="button" onClick={onClose} className="btn">
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onSubmit({
                paidAt,
                amountPaid: paid,
                bupotNo: pphEnabled ? bupotNo : "",
                withholdingEnabled: pphEnabled && !inv.usdOnly,
                withholdingRate: rate,
              })
            }
            className="btn btn-cleared"
          >
            Save payment
          </button>
        </>
      }
    >
      {/* What the bank should show */}
      <dl className="well divide-y divide-line px-1 text-[13px]">
        <div className="flex justify-between px-3 py-2">
          <dt className="text-ink-2">
            {inv.usdOnly ? "Invoice total" : "Invoice total (incl. VAT)"}
          </dt>
          <dd className="fig">{money(inv, inv.totalIdr)}</dd>
        </div>
        {!inv.usdOnly && pphEnabled && (
          <div className="flex justify-between px-3 py-2">
            <dt className="text-ink-2">PPh withheld by customer</dt>
            <dd className="fig">− {money(inv, bukpot)}</dd>
          </div>
        )}
        <div className="flex justify-between px-3 py-2.5">
          <dt className="font-semibold text-ink">Expected in the bank</dt>
          <dd className="fig text-paid">{money(inv, net)}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-4">
        {!inv.usdOnly && (
          <div className="rounded-xl border border-line-2 p-3.5">
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                className="check"
                checked={pphEnabled}
                onChange={(e) => applyPph(e.target.checked, pphPct)}
              />
              <span className="text-[13px] font-semibold text-ink">
                Customer withholds PPh
              </span>
            </label>
            {pphEnabled && (
              <label className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
                <span className="lbl">Rate</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={pphPct}
                  onChange={(e) => applyPph(true, e.target.value)}
                  className="field field-num w-20 px-2 py-1 text-[13px]"
                />
                <span>%</span>
                <span className="note">of DPP = − {money(inv, bukpot)}</span>
              </label>
            )}
          </div>
        )}

        <label className="block">
          <span className="lbl lbl-strong mb-1.5 block">Payment date</span>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="field"
          />
        </label>

        <label className="block">
          <span className="lbl lbl-strong mb-1.5 block">Amount received</span>
          <input
            type="number"
            min="0"
            step="any"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="field field-num"
          />
          <span
            className={`mt-2 inline-flex text-[12.5px] font-semibold ${
              shortBy > 0
                ? "text-short"
                : shortBy < 0
                  ? "text-overdue"
                  : "text-paid"
            }`}
          >
            {shortBy > 0
              ? `Short by ${money(inv, shortBy)}`
              : shortBy < 0
                ? `Overpaid by ${money(inv, -shortBy)}`
                : "Settled in full"}
          </span>
        </label>

        {!inv.usdOnly && pphEnabled && (
          <label className="block">
            <span className="lbl lbl-strong mb-1.5 block">
              Bukti potong no.{" "}
              <span className="font-normal text-ink-3">optional</span>
            </span>
            <input
              type="text"
              value={bupotNo}
              onChange={(e) => setBupotNo(e.target.value)}
              placeholder="e.g. 0001/BP/2026"
              className="field"
            />
          </label>
        )}
      </div>
    </Dialog>
  );
}

function HomeInner() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const load = () => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((rows: InvoiceListItem[]) => setInvoices(rows))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id: number, invoiceNo: string) => {
    if (!confirm(`Move invoice ${invoiceNo} to trash?`)) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  };

  const [savingId, setSavingId] = useState<number | null>(null);
  const [payFor, setPayFor] = useState<InvoiceListItem | null>(null);
  const [stampId, setStampId] = useState<number | null>(null);
  const restamp = (id: number) => {
    setStampId(id);
    window.setTimeout(() => setStampId((cur) => (cur === id ? null : cur)), 700);
  };

  const setStatus = async (inv: InvoiceListItem, next: InvoiceStatus) => {
    if (next === "paid") {
      setPayFor(inv);
      return;
    }
    if (inv.status === next) return;
    setPayFor(null);
    // Reverting to unpaid clears the whole payment record, including the PPh
    // cut (which belongs to the payment, not the invoice).
    setSavingId(inv.id);
    setInvoices((prev) =>
      prev.map((it) =>
        it.id === inv.id
          ? {
              ...it,
              status: next,
              paidAt: null,
              amountPaid: null,
              bupotNo: null,
              withholdingIdr: 0,
              netReceivedIdr: it.totalIdr,
            }
          : it
      )
    );
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
    } catch {
      setInvoices((prev) =>
        prev.map((it) => (it.id === inv.id ? { ...it, status: inv.status } : it))
      );
    } finally {
      setSavingId(null);
      restamp(inv.id);
    }
  };

  const submitPayment = async (
    inv: InvoiceListItem,
    payload: {
      paidAt: string;
      amountPaid: number;
      bupotNo: string;
      withholdingEnabled: boolean;
      withholdingRate: number;
    }
  ) => {
    setPayFor(null);
    setSavingId(inv.id);
    // Mirror the server: the PPh cut is recomputed from the dialog's setting.
    const withholdingIdr = payload.withholdingEnabled
      ? Math.round(inv.subtotalIdr * payload.withholdingRate)
      : 0;
    setInvoices((prev) =>
      prev.map((it) =>
        it.id === inv.id
          ? {
              ...it,
              status: "paid",
              paidAt: payload.paidAt || null,
              amountPaid: payload.amountPaid,
              bupotNo: payload.bupotNo || null,
              withholdingIdr,
              withholdingRate: payload.withholdingRate,
              netReceivedIdr: it.totalIdr - withholdingIdr,
            }
          : it
      )
    );
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", ...payload }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
    } catch {
      setInvoices((prev) => prev.map((it) => (it.id === inv.id ? inv : it)));
    } finally {
      setSavingId(null);
      restamp(inv.id);
    }
  };

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (monthFilter !== "all") params.set("month", monthFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const qs = params.toString();
    return "/api/invoices/export" + (qs ? `?${qs}` : "");
  }, [monthFilter, statusFilter]);

  const months = useMemo(
    () =>
      [...new Set(invoices.map((inv) => inv.invoiceDate.slice(0, 7)))].sort(
        (a, b) => b.localeCompare(a)
      ),
    [invoices]
  );

  const stats = useMemo(() => {
    // Every figure here is rupiah; USD-only invoices are counted but their
    // money is reported apart, because the two can never be one number.
    const idrOnly = invoices.filter((inv) => !inv.usdOnly);
    const unpaid = idrOnly.filter((inv) => inv.status === "unpaid");
    const paid = idrOnly.filter((inv) => inv.status === "paid");
    const overdue = idrOnly.filter(isOverdue);
    const openNotLate = unpaid.filter((inv) => !isOverdue(inv));
    const sum = (list: InvoiceListItem[]) =>
      list.reduce((acc, inv) => acc + inv.totalIdr, 0);
    const usdTotal = invoices
      .filter((inv) => inv.usdOnly)
      .reduce((acc, inv) => acc + inv.totalIdr, 0);

    return {
      // The three slices partition `billed` exactly: no invoice is in two of
      // them and none is in none, so the donut can be read as proportions.
      billed: sum(idrOnly),
      settled: sum(paid),
      settledCount: paid.length,
      open: sum(openNotLate),
      openCount: invoices.filter(
        (i) => i.status === "unpaid" && !isOverdue(i)
      ).length,
      overdue: sum(overdue),
      overdueCount: invoices.filter(isOverdue).length,
      outstanding: sum(unpaid),
      outstandingCount: invoices.filter((i) => i.status === "unpaid").length,
      banked: paid.reduce((acc, inv) => acc + receivedOf(inv), 0),
      expected: paid.reduce((acc, inv) => acc + inv.netReceivedIdr, 0),
      short: paid.reduce((acc, inv) => acc + shortfallOf(inv), 0),
      shortCount: invoices.filter(isPartial).length,
      usdTotal,
    };
  }, [invoices]);

  /** Trailing 12 months, oldest first — the bar chart's spine. */
  const barMonths: BarMonth[] = useMemo(() => {
    const now = new Date();
    const keys: { ym: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push({
        ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-GB", { month: "long" }),
      });
    }
    return keys.map(({ ym, label }) => {
      const inMonth = invoices.filter(
        (inv) => !inv.usdOnly && inv.invoiceDate.startsWith(ym)
      );
      const add = (list: InvoiceListItem[]) =>
        list.reduce((acc, inv) => acc + inv.totalIdr, 0);
      return {
        ym,
        label,
        settled: add(inMonth.filter((i) => i.status === "paid")),
        overdue: add(inMonth.filter(isOverdue)),
        open: add(
          inMonth.filter((i) => i.status === "unpaid" && !isOverdue(i))
        ),
      };
    });
  }, [invoices]);

  const q = search.trim().toLowerCase();
  const rows = useMemo(() => {
    let list = invoices;
    if (q) {
      list = list.filter(
        (inv) =>
          inv.invoiceNo.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q)
      );
    }
    if (monthFilter !== "all") {
      list = list.filter((inv) => inv.invoiceDate.startsWith(monthFilter));
    }
    if (statusFilter !== "all") {
      list = list.filter((inv) => {
        if (statusFilter === "overdue") return isOverdue(inv);
        if (statusFilter === "partial") return isPartial(inv);
        if (statusFilter === "paid")
          return inv.status === "paid" && !isPartial(inv);
        return inv.status === statusFilter; // unpaid
      });
    }
    const by: Record<
      SortKey,
      (a: InvoiceListItem, b: InvoiceListItem) => number
    > = {
      recent: (a, b) =>
        b.invoiceDate.localeCompare(a.invoiceDate) || b.seq - a.seq,
      oldest: (a, b) =>
        a.invoiceDate.localeCompare(b.invoiceDate) || a.seq - b.seq,
      largest: (a, b) => b.totalIdr - a.totalIdr,
      // Undated invoices have no deadline to sort by, so they sink rather than
      // pretending to be either the most or least urgent.
      due: (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
      customer: (a, b) => a.customerName.localeCompare(b.customerName),
    };
    return [...list].sort(by[sortKey]);
  }, [invoices, q, monthFilter, statusFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paged = rows.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  useEffect(() => setPage(1), [q, monthFilter, statusFilter, sortKey]);

  const toggleCheck = (id: number) =>
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const pageAllChecked =
    paged.length > 0 && paged.every((r) => checked.has(r.id));

  const bulkTrash = async () => {
    if (checked.size === 0) return;
    if (!confirm(`Move ${checked.size} invoice(s) to trash?`)) return;
    await Promise.all(
      [...checked].map((id) => fetch(`/api/invoices/${id}`, { method: "DELETE" }))
    );
    setChecked(new Set());
    load();
  };

  const FILTERS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: invoices.length },
    {
      key: "unpaid",
      label: "Unpaid",
      count: invoices.filter((i) => i.status === "unpaid").length,
    },
    { key: "overdue", label: "Overdue", count: stats.overdueCount },
    { key: "partial", label: "Short", count: stats.shortCount },
    {
      key: "paid",
      label: "Paid",
      count: invoices.filter((i) => i.status === "paid" && !isPartial(i)).length,
    },
  ];

  const collectedPct =
    stats.billed > 0 ? Math.round((stats.settled / stats.billed) * 100) : 0;

  /* One entrance, once: the cards rise in reading order and the collected bar
     fills to its real share. Everything holds still afterwards — this is a
     screen people work in, not a screen they watch. */
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate) return;
        gsap.from(".anim-card", {
          y: 18,
          autoAlpha: 0,
          duration: 0.65,
          ease: "power3.out",
          stagger: 0.07,
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  const filled = useRef(false);
  useGSAP(
    () => {
      if (filled.current || collectedPct === 0) return;
      const mm = gsap.matchMedia();
      mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        if (!ctx.conditions?.animate) return;
        filled.current = true;
        gsap.from(".collected-fill", {
          scaleX: 0,
          duration: 1.1,
          ease: "power3.out",
          delay: 0.35,
        });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [collectedPct > 0] }
  );

  return (
    <AppShell
      active="invoices"
      title="Dashboard"
      subtitle="Where the money stands across every invoice SFL has issued."
      overdueDot={stats.overdueCount > 0}
      onOverdueClick={() => setStatusFilter("overdue")}
    >
      <div ref={root}>
      {payFor && (
        <PaymentDialog
          inv={payFor}
          onClose={() => setPayFor(null)}
          onSubmit={(p) => submitPayment(payFor, p)}
          onRevert={() => setStatus(payFor, "unpaid")}
        />
      )}

      {/* ── Row 1: the headline, then three supporting figures ───────────── */}
      <section
        data-tour="stats"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="anim-card card-brand relative overflow-hidden p-5 sm:col-span-2 xl:col-span-1">
          <p className="text-[13px] font-semibold text-white/80">Outstanding</p>
          <p className="fig mt-3 text-[28px] leading-none text-white">
            <CountUp
              value={stats.outstanding}
              format={(n) => `Rp ${fmtIdr(n)}`}
            />
          </p>
          <p className="mt-2 text-[12.5px] text-white/75">
            {stats.outstandingCount} invoice
            {stats.outstandingCount === 1 ? "" : "s"} awaiting payment
          </p>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-medium text-white/80">
                Collected
              </span>
              <span className="fig text-[12px] text-white">
                {collectedPct}%
              </span>
            </div>
            <div className="track mt-1.5 bg-white/25">
              <span
                className="collected-fill"
                style={{
                  width: "100%",
                  background: "#fff",
                  transform: `scaleX(${collectedPct / 100})`,
                  transformOrigin: "left center",
                }}
              />
            </div>
          </div>
        </div>

        <Stat
          icon={<IconEdit className="h-[18px] w-[18px]" />}
          tint="bg-soft text-ink-2"
          amount={stats.billed}
          format={(n) => `Rp ${fmtIdr(n)}`}
          label="Total billed"
          note={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}${
            stats.usdTotal > 0 ? ` · $${fmtUsd(stats.usdTotal)} counted apart` : ""
          }`}
        />
        <Stat
          icon={<IconAlert className="h-[18px] w-[18px]" />}
          tint="bg-overdue-soft text-overdue"
          amount={stats.overdue}
          format={(n) => `Rp ${fmtIdr(n)}`}
          label="Overdue"
          valueTone={stats.overdue > 0 ? "text-overdue" : undefined}
          note={
            stats.overdueCount > 0
              ? `${stats.overdueCount} past the due date`
              : "Nothing late"
          }
        />
        <Stat
          icon={<IconCheck className="h-[18px] w-[18px]" strokeWidth={2} />}
          tint="bg-paid-soft text-paid"
          amount={stats.banked}
          format={(n) => `Rp ${fmtIdr(n)}`}
          label="Banked"
          note={
            stats.short > 0
              ? `Rp ${fmtIdr(stats.short)} never arrived on ${stats.shortCount}`
              : stats.settledCount > 0
                ? `${stats.settledCount} settled in full`
                : "Nothing received yet"
          }
        />
      </section>

      {/* ── Row 2: the same split, over time and in total ─────────────────── */}
      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="anim-card card p-5 xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="h-sec">Invoiced by month</h2>
            <p className="text-[12.5px] text-ink-3">
              Last 12 months, rupiah, split by where the money now stands
            </p>
          </div>
          <Bars months={barMonths} format={(n) => `Rp ${fmtIdr(n)}`} />
        </div>

        <div className="anim-card card p-5">
          <h2 className="h-sec mb-5">Where it stands</h2>
          <Donut
            centerLabel="billed"
            centerValue={`Rp ${fmtIdr(stats.billed)}`}
            slices={[
              {
                label: "Settled",
                value: stats.settled,
                color: "var(--color-paid)",
                note: `${stats.settledCount} invoice${stats.settledCount === 1 ? "" : "s"}`,
              },
              {
                label: "Open",
                value: stats.open,
                color: "var(--color-open)",
                note: `${stats.openCount} not yet due`,
              },
              {
                label: "Overdue",
                value: stats.overdue,
                color: "var(--color-overdue)",
                note: `${stats.overdueCount} past the due date`,
              },
            ]}
          />
        </div>
      </section>

      {/* ── Row 3: the register ───────────────────────────────────────────── */}
      <section className="anim-card card mt-4 overflow-hidden">
        <div
          data-tour="filters"
          className="flex flex-wrap items-center gap-3 p-5"
        >
          <h2 className="h-sec mr-auto">Invoices</h2>
          <div className="relative w-full sm:w-64">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              placeholder="Search number or customer"
              aria-label="Search invoices"
              className="field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="field w-auto"
            aria-label="Filter by month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="all">All months</option>
            {months.map((ym) => (
              <option key={ym} value={ym}>
                {new Date(ym + "-01T00:00:00").toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
          <select
            className="field w-auto"
            aria-label="Sort by"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="largest">Largest amount</option>
            <option value="due">Due soonest</option>
            <option value="customer">Customer A–Z</option>
          </select>
          <a href={exportUrl} title="Download the filtered rows" className="btn">
            <IconDownload className="h-4 w-4" />
            Export
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-5 pb-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              aria-pressed={statusFilter === f.key}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                statusFilter === f.key
                  ? "bg-brand text-white"
                  : "bg-soft text-ink-2 hover:text-ink"
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-70">{f.count}</span>
            </button>
          ))}
        </div>

        {checked.size > 0 && (
          <div className="mx-5 mb-4 flex items-center justify-between gap-3 rounded-xl bg-brand-soft px-4 py-2.5">
            <span className="text-[13px] font-semibold text-brand">
              {checked.size} selected
            </span>
            <div className="flex items-center gap-2">
              <button onClick={bulkTrash} className="btn btn-sm">
                <IconTrash className="h-3.5 w-3.5" />
                Move to trash
              </button>
              <button
                onClick={() => setChecked(new Set())}
                className="btn btn-quiet btn-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div data-tour="table" className="overflow-x-auto">
          <table className="register">
            <thead>
              <tr>
                <th scope="col" className="w-10 pl-5">
                  <input
                    type="checkbox"
                    className="check"
                    checked={pageAllChecked}
                    onChange={() =>
                      setChecked((prev) => {
                        const n = new Set(prev);
                        if (pageAllChecked) paged.forEach((r) => n.delete(r.id));
                        else paged.forEach((r) => n.add(r.id));
                        return n;
                      })
                    }
                    aria-label="Select all rows on this page"
                  />
                </th>
                <th scope="col">Invoice</th>
                <th scope="col">Customer</th>
                <th scope="col" className="text-right">
                  Amount
                </th>
                <th scope="col">Due</th>
                <th scope="col">Status</th>
                <th scope="col" className="pr-5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="note py-14 text-center">
                    Loading invoices…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <p className="text-[15px] font-bold text-ink">
                      {invoices.length === 0
                        ? "No invoices yet"
                        : "Nothing matches these filters"}
                    </p>
                    <p className="note mt-1">
                      {invoices.length === 0
                        ? "Create the first one to start the register."
                        : "Clear the search or pick a different month."}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((inv) => (
                  <tr key={inv.id} data-selected={checked.has(inv.id)}>
                    <td className="pl-5">
                      <input
                        type="checkbox"
                        className="check"
                        checked={checked.has(inv.id)}
                        onChange={() => toggleCheck(inv.id)}
                        aria-label={`Select ${inv.invoiceNo}`}
                      />
                    </td>
                    <td>
                      <Marking
                        no={inv.invoiceNo}
                        href={`/invoices/${inv.id}`}
                      />
                      <p className="mt-0.5 text-[11.5px] text-ink-3">
                        {fmtDate(inv.invoiceDate)}
                      </p>
                    </td>
                    <td>
                      <p className="max-w-[26ch] truncate text-[13.5px] font-semibold text-ink">
                        {cleanName(inv.customerName) || "—"}
                      </p>
                      {inv.createdBy && (
                        <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
                          by {inv.createdBy}
                        </p>
                      )}
                    </td>
                    <td className="text-right">
                      <span className="fig text-[13.5px]">
                        {money(inv, inv.totalIdr)}
                      </span>
                      {isPartial(inv) && (
                        <p className="mt-0.5 text-[11.5px] font-semibold text-short">
                          short {money(inv, shortfallOf(inv))}
                        </p>
                      )}
                      {inv.status === "paid" && !isPartial(inv) && (
                        <p className="mt-0.5 text-[11.5px] text-ink-3">
                          banked {money(inv, receivedOf(inv))}
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="text-[12.5px] text-ink-2">
                        {inv.dueDate ? fmtDate(inv.dueDate) : "—"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setPayFor(inv)}
                        disabled={savingId === inv.id}
                        title="Record or edit the payment"
                        className={`inline-block ${
                          stampId === inv.id ? "just-paid" : ""
                        } transition-opacity hover:opacity-75 disabled:opacity-50`}
                      >
                        <StatusPill inv={inv} />
                      </button>
                    </td>
                    <td className="pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/invoices/${inv.id}?print=1`}
                          title={`Print ${inv.invoiceNo}`}
                          className="btn btn-quiet p-1.5"
                        >
                          <IconPrint className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/invoices/${inv.id}`}
                          title={`Edit ${inv.invoiceNo}`}
                          className="btn btn-quiet p-1.5"
                        >
                          <IconEdit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => remove(inv.id, inv.invoiceNo)}
                          title={`Move ${inv.invoiceNo} to trash`}
                          className="btn btn-quiet p-1.5 hover:text-overdue"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-[12.5px] text-ink-2">
            Showing{" "}
            <span className="fig">
              {rows.length === 0 ? 0 : (curPage - 1) * PAGE_SIZE + 1}–
              {Math.min(curPage * PAGE_SIZE, rows.length)}
            </span>{" "}
            of <span className="fig">{rows.length}</span>
          </p>
          {totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center gap-2">
              <button
                onClick={() => setPage(curPage - 1)}
                disabled={curPage === 1}
                className="btn btn-sm"
              >
                <IconChevronRight className="h-3.5 w-3.5 rotate-180" />
                Previous
              </button>
              <span className="text-[12.5px] font-semibold text-ink-2">
                {curPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(curPage + 1)}
                disabled={curPage === totalPages}
                className="btn btn-sm"
              >
                Next
                <IconChevronRight className="h-3.5 w-3.5" />
              </button>
            </nav>
          )}
        </div>
      </section>
      </div>
    </AppShell>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
      <GuidedTour />
    </Suspense>
  );
}
