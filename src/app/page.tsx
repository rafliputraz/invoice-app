"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { InvoiceListItem, InvoiceStatus } from "@/lib/types";
import { fmtIdr, fmtDate, fmtUsd } from "@/lib/format";
import AppShell from "@/components/AppShell";
import GuidedTour from "@/components/GuidedTour";

type SortKey = "invoiceNo" | "invoiceDate" | "customerName" | "totalIdr" | "dueDate";
type StatusFilter = "all" | "unpaid" | "overdue" | "partial" | "paid";

function localYm(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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

function initialsOf(name: string): string {
  return (
    name
      .replace(/^(PT|CV|UD|PD)\.?\s+/i, "")
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/** Today as a local yyyy-mm-dd string (for date <input> defaults). */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Modal shown when marking an invoice "paid": records payment date, the cash
 * actually received (supports partial payment), and the bukti-potong number.
 */
function PaymentDialog({
  inv,
  onClose,
  onSubmit,
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
  const kurang = net - paid;

  // Changing the PPh setting changes the net, so re-anchor the paid amount to it.
  const applyPph = (enabled: boolean, pct: string) => {
    setPphEnabled(enabled);
    setPphPct(pct);
    const r = (Number(pct) || 0) / 100;
    const cut = !inv.usdOnly && enabled ? Math.round(inv.subtotalIdr * r) : 0;
    setAmountPaid(String(inv.totalIdr - cut));
  };

  return createPortal(
    <div className="app-font fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">
          Tandai Dibayar — {inv.invoiceNo}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">{inv.customerName}</p>

        <dl className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
          <div className="flex justify-between">
            <dt className="text-slate-500">
              {inv.usdOnly ? "Total" : "Total (incl. PPN)"}
            </dt>
            <dd className="font-semibold text-slate-800">
              {money(inv, inv.totalIdr)}
            </dd>
          </div>
          {!inv.usdOnly && pphEnabled && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Potong PPh (BUPOT)</dt>
              <dd className="font-semibold text-slate-800">
                − {money(inv, bukpot)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-1">
            <dt className="text-slate-500">Diharapkan masuk</dt>
            <dd className="font-bold text-emerald-600">{money(inv, net)}</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-3">
          {!inv.usdOnly && (
            <div className="rounded-lg border border-slate-200 p-2.5 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pphEnabled}
                  onChange={(e) => applyPph(e.target.checked, pphPct)}
                />
                <span className="font-medium text-slate-700">
                  Kena PPh (dipotong customer)
                </span>
              </label>
              {pphEnabled && (
                <label className="mt-2 flex items-center gap-2 text-slate-600">
                  <span>Tarif</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={pphPct}
                    onChange={(e) => applyPph(true, e.target.value)}
                    className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-right"
                  />
                  <span>%</span>
                  <span className="text-slate-400">
                    dari DPP = − {money(inv, bukpot)}
                  </span>
                </label>
              )}
            </div>
          )}
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-600">
              Tanggal Bayar
            </span>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-slate-600">
              Jumlah Dibayar (uang masuk)
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm"
            />
            <span
              className={`mt-1 block ${
                kurang > 0
                  ? "text-amber-600"
                  : kurang < 0
                    ? "text-rose-600"
                    : "text-slate-400"
              }`}
            >
              {kurang > 0
                ? `Kurang bayar: ${money(inv, kurang)}`
                : kurang < 0
                  ? `Lebih bayar: ${money(inv, -kurang)}`
                  : "Lunas (sesuai net)"}
            </span>
          </label>
          {!inv.usdOnly && pphEnabled && (
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-slate-600">
                No. Bukti Potong{" "}
                <span className="font-normal text-slate-400">(opsional)</span>
              </span>
              <input
                type="text"
                value={bupotNo}
                onChange={(e) => setBupotNo(e.target.value)}
                placeholder="mis. 0001/BP/2026"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={() =>
              onSubmit({
                paidAt,
                amountPaid: paid,
                bupotNo: pphEnabled ? bupotNo : "",
                withholdingEnabled: pphEnabled && !inv.usdOnly,
                withholdingRate: rate,
              })
            }
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StatCard({
  label,
  value,
  sub,
  usd,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Secondary USD figure (shown separately since it can't be summed with IDR). */
  usd?: string;
  tone?: "amber" | "red" | "emerald";
  icon: string;
}) {
  const valueCls =
    tone === "red"
      ? "text-rose-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "emerald"
          ? "text-emerald-600"
          : "text-slate-900";
  const chipCls =
    tone === "red"
      ? "bg-rose-50 text-rose-600"
      : tone === "amber"
        ? "bg-amber-50 text-amber-600"
        : tone === "emerald"
          ? "bg-emerald-50 text-emerald-600"
          : "bg-slate-100 text-slate-600";
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
      <div className="relative z-10 mb-2 flex items-start justify-between">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
        <span className={`rounded-lg p-1.5 ${chipCls}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
          </svg>
        </span>
      </div>
      <div className="relative z-10">
        <h3 className={`text-2xl font-extrabold tracking-tight ${valueCls}`}>
          {value}
        </h3>
        {usd && (
          <p className="mt-0.5 text-sm font-bold text-slate-700">+ {usd}</p>
        )}
        {sub && (
          <p className="mt-1 text-xs font-medium text-slate-500">{sub}</p>
        )}
      </div>
      <svg
        className="absolute bottom-0 left-0 h-12 w-full text-slate-100"
        preserveAspectRatio="none"
        viewBox="0 0 100 20"
        fill="none"
        stroke="currentColor"
      >
        <path
          d="M0 20 Q 20 15, 30 18 T 60 10 T 100 5"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

function DueBadge({ inv }: { inv: InvoiceListItem }) {
  if (!inv.dueDate || inv.status === "paid") return null;
  const days = daysUntil(inv.dueDate);
  let cls: string;
  let text: string;
  if (days < 0) {
    cls = "bg-rose-50 text-rose-700 border border-rose-200";
    text = `telat ${-days} hr`;
  } else if (days <= 7) {
    cls = "bg-amber-50 text-amber-700 border border-amber-200";
    text = days === 0 ? "hari ini" : `${days} hr lagi`;
  } else {
    cls = "bg-slate-100 text-slate-500 border border-slate-200";
    text = `sisa ${days} hr`;
  }
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {text}
    </span>
  );
}

function HomeInner() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [monthFilter, setMonthFilter] = useState("all"); // "all" | "YYYY-MM"
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null); // null = API order
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = () => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((rows: InvoiceListItem[]) => setInvoices(rows))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id: number, invoiceNo: string) => {
    if (!confirm(`Pindahkan invoice ${invoiceNo} ke trash?`)) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  };

  // Which row's status popover is open + its fixed-position anchor. The
  // position is captured at click time so no ref is needed (StatusBadge is a
  // closure component that remounts on parent re-renders, which resets refs).
  const [statusMenu, setStatusMenu] = useState<{
    id: number;
    top: number;
    left: number;
  } | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);
  // Invoice awaiting the "mark as paid" payment dialog.
  const [payFor, setPayFor] = useState<InvoiceListItem | null>(null);

  const setStatus = async (inv: InvoiceListItem, next: InvoiceStatus) => {
    setStatusMenu(null);
    // Marking as paid captures a payment record first (date, amount, bupot no).
    // Always opens — clicking "Paid" on an already-paid row edits the record.
    if (next === "paid") {
      setPayFor(inv);
      return;
    }
    if (inv.status === next) return;
    // Reverting to unpaid is direct; it clears the whole payment record locally,
    // including the PPh cut (which now belongs to the payment).
    setSavingStatusId(inv.id);
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
      setSavingStatusId(null);
    }
  };

  // Submit the payment dialog: PATCH the invoice to paid with its payment record.
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
    setSavingStatusId(inv.id);
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
      // Roll the whole row back to its pre-dialog snapshot.
      setInvoices((prev) => prev.map((it) => (it.id === inv.id ? inv : it)));
    } finally {
      setSavingStatusId(null);
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
    const ym = localYm(new Date());
    // Stat cards are in IDR, so USD-only invoices are left out of the money sums.
    const idrOnly = invoices.filter((inv) => !inv.usdOnly);
    const thisMonth = idrOnly.filter((inv) => inv.invoiceDate.startsWith(ym));
    const unpaid = idrOnly.filter((inv) => inv.status === "unpaid");
    const paid = idrOnly.filter((inv) => inv.status === "paid");
    const overdue = idrOnly.filter(isOverdue);
    const sum = (list: InvoiceListItem[]) =>
      list.reduce((acc, inv) => acc + inv.totalIdr, 0);

    // USD-only invoices are summed separately (can't be added to rupiah). A
    // formatted "$X" string is returned only when there is something to show.
    const usdInv = invoices.filter((inv) => inv.usdOnly);
    const usdSum = (list: InvoiceListItem[], f: (i: InvoiceListItem) => number) => {
      const total = list.reduce((acc, inv) => acc + f(inv), 0);
      return total > 0 ? `$ ${fmtUsd(total)}` : undefined;
    };
    const inMonth = (inv: InvoiceListItem) => inv.invoiceDate.startsWith(ym);

    return {
      // Counts are over ALL invoices (currency-agnostic); only the money sums
      // are split by currency (IDR total + a separate USD figure).
      monthCount: invoices.filter(inMonth).length,
      monthTotal: sum(thisMonth),
      monthTotalUsd: usdSum(usdInv.filter(inMonth), (i) => i.totalIdr),
      outstanding: sum(unpaid),
      outstandingCount: invoices.filter((i) => i.status === "unpaid").length,
      outstandingUsd: usdSum(
        usdInv.filter((i) => i.status === "unpaid"),
        (i) => i.totalIdr
      ),
      overdueCount: invoices.filter(isOverdue).length,
      overdueTotal: sum(overdue),
      paidCount: invoices.filter((i) => i.status === "paid").length,
      partialCount: invoices.filter(isPartial).length,
      // Cash actually received on paid invoices (uses recorded amount for partials).
      totalReceived: paid.reduce((acc, inv) => acc + receivedOf(inv), 0),
      totalReceivedUsd: usdSum(
        usdInv.filter((i) => i.status === "paid"),
        receivedOf
      ),
    };
  }, [invoices]);

  const q = search.trim().toLowerCase();
  const sorted = useMemo(() => {
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
        // "paid" means fully paid; partial rows live under the Partial tab.
        if (statusFilter === "paid") return inv.status === "paid" && !isPartial(inv);
        return inv.status === statusFilter; // unpaid
      });
    }
    if (!sortKey) return list;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "invoiceNo":
          cmp = a.year - b.year || a.seq - b.seq;
          break;
        case "totalIdr":
          cmp = a.totalIdr - b.totalIdr;
          break;
        case "dueDate":
          // Rows without a due date always sink to the bottom.
          if (a.dueDate == null && b.dueDate == null) return 0;
          if (a.dueDate == null) return 1;
          if (b.dueDate == null) return -1;
          cmp = a.dueDate.localeCompare(b.dueDate);
          break;
        default:
          cmp = a[sortKey].localeCompare(b[sortKey]);
      }
      return cmp * dir;
    });
  }, [invoices, q, monthFilter, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Pagination (client-side). Filters/sort changes jump back to page 1.
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [q, monthFilter, statusFilter, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const paged = sorted.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  // Row selection for bulk actions (checkbox column).
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pageIds = paged.map((inv) => inv.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  const bulkTrash = async () => {
    if (!confirm(`Pindahkan ${selected.size} invoice ke trash?`)) return;
    await Promise.all(
      [...selected].map((id) => fetch(`/api/invoices/${id}`, { method: "DELETE" }))
    );
    setSelected(new Set());
    load();
  };

  const SortableTh = ({
    label,
    k,
    right,
  }: {
    label: string;
    k: SortKey;
    right?: boolean;
  }) => (
    <th
      className={`px-6 py-3 text-xs font-bold tracking-wider text-slate-500 uppercase ${
        right ? "text-right" : "text-left"
      }`}
    >
      <button
        onClick={() => toggleSort(k)}
        className={`group inline-flex cursor-pointer items-center gap-1 uppercase transition-colors hover:text-slate-800 ${
          sortKey === k ? "text-slate-800" : ""
        }`}
      >
        {label}
        {sortKey === k ? (
          <svg
            className={`h-3.5 w-3.5 text-blue-600 transition-transform ${
              sortDir === "asc" ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        ) : (
          <svg
            className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        )}
      </button>
    </th>
  );

  // Status badge + change-status popover; shared by the desktop table and
  // the mobile card list. The menu is portalled to <body> with a fixed
  // position — inside the table it would be clipped by the overflow-x-auto
  // scroll container (bottom rows made the menu unreachable).
  const StatusBadge = ({
    inv,
    align = "left",
  }: {
    inv: InvoiceListItem;
    align?: "left" | "right";
  }) => {
    const open = statusMenu?.id === inv.id;
    return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          if (open) {
            setStatusMenu(null);
            return;
          }
          const MENU_W = 176; // w-44
          const MENU_H = 96; // ~2 options
          const r = e.currentTarget.getBoundingClientRect();
          // Flip upward when the menu would fall off the bottom of the viewport.
          const top =
            r.bottom + 4 + MENU_H > window.innerHeight
              ? r.top - MENU_H - 4
              : r.bottom + 4;
          const left = align === "right" ? r.right - MENU_W : r.left;
          setStatusMenu({ id: inv.id, top, left });
        }}
        disabled={savingStatusId === inv.id}
        title="Change payment status"
        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-60 ${
          isPartial(inv)
            ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
            : inv.status === "paid"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
        }`}
      >
        <span
          className={`mr-2 h-1.5 w-1.5 rounded-full ${
            isPartial(inv)
              ? "bg-sky-500"
              : inv.status === "paid"
                ? "bg-emerald-500"
                : "bg-amber-500"
          }`}
        />
        {savingStatusId === inv.id
          ? "Saving…"
          : isPartial(inv)
            ? "Partial"
            : inv.status === "paid"
              ? "Paid"
              : "Unpaid"}
        <svg className="ml-1 h-3 w-3 opacity-50" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open &&
        statusMenu &&
        createPortal(
          <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setStatusMenu(null)}
          />
          <div
            className="app-font fixed z-50 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
            style={{ top: statusMenu.top, left: statusMenu.left }}
          >
            {(
              [
                ["paid", "Paid", "bg-emerald-500", "Pembayaran diterima"],
                ["unpaid", "Unpaid", "bg-amber-500", "Belum dibayar"],
              ] as const
            ).map(([value, label, dot, desc]) => (
              <button
                key={value}
                onClick={() => setStatus(inv, value)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                <span className="flex-1">
                  <span className="block font-medium text-slate-700">
                    {label}
                  </span>
                  <span className="block text-slate-400">{desc}</span>
                </span>
                {inv.status === value && (
                  <svg
                    className="h-3.5 w-3.5 text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.8a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
          </>,
          document.body
        )}
    </div>
    );
  };

  const monthLabel = (ym: string) =>
    new Date(ym + "-01T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

  const TABS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All Invoices" },
    { key: "unpaid", label: "Unpaid" },
    { key: "overdue", label: "Overdue" },
    { key: "partial", label: "Partial" },
    { key: "paid", label: "Paid" },
  ];

  return (
    <AppShell
      active="invoices"
      title="Invoice Overview"
      subtitle="Manage and track all billing for PT. Salam Fortuna Logistik."
      invoiceCount={invoices.length}
      bellDot={stats.overdueCount > 0}
      onBellClick={() => setStatusFilter("overdue")}
    >
      {payFor && (
        <PaymentDialog
          inv={payFor}
          onClose={() => setPayFor(null)}
          onSubmit={(p) => submitPayment(payFor, p)}
        />
      )}
      {/* Metric cards */}
      <div
        data-tour="stats"
        className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
      >
        <StatCard
          label="Invoices This Month"
          value={String(stats.monthCount)}
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
        <StatCard
          label="Total This Month"
          value={fmtIdr(stats.monthTotal)}
          usd={stats.monthTotalUsd}
          sub="nilai invoice bulan ini (IDR)"
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <StatCard
          label="Outstanding"
          value={fmtIdr(stats.outstanding)}
          usd={stats.outstandingUsd}
          sub={
            stats.outstandingCount > 0
              ? `${stats.outstandingCount} invoice belum dibayar`
              : "semua sudah dibayar"
          }
          tone="amber"
          icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z"
        />
        <StatCard
          label="Overdue"
          value={fmtIdr(stats.overdueTotal)}
          sub={
            stats.overdueCount > 0
              ? `${stats.overdueCount} invoice perlu ditagih`
              : "Tidak ada yang telat"
          }
          tone={stats.overdueCount > 0 ? "red" : undefined}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <StatCard
          label="Total Diterima"
          value={fmtIdr(stats.totalReceived)}
          usd={stats.totalReceivedUsd}
          sub={
            stats.paidCount > 0
              ? `${stats.paidCount} dibayar${
                  stats.partialCount > 0 ? ` · ${stats.partialCount} partial` : ""
                }`
              : "belum ada yang dibayar"
          }
          tone="emerald"
          icon="M5 13l4 4L19 7"
        />
      </div>

      {/* Table card */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-card">
        {/* Tabs */}
        <div className="mt-2 flex gap-6 overflow-x-auto border-b border-slate-200 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`shrink-0 border-b-2 px-1 py-3 text-sm transition-colors ${
                statusFilter === tab.key
                  ? "border-blue-500 font-bold text-blue-600"
                  : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              {tab.label}
              {tab.key === "all" && (
                <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {invoices.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div
          data-tour="filters"
          className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 px-6 py-4"
        >
          <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by customer, invoice no…"
              className="block w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm placeholder-slate-400 shadow-sm transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="all">All months</option>
              {months.map((ym) => (
                <option key={ym} value={ym}>
                  {monthLabel(ym)}
                </option>
              ))}
            </select>
            <a
              href={exportUrl}
              title="Download rekap CSV (mengikuti filter bulan & status)"
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <svg
                className="h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </a>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center justify-between border-y border-blue-100 bg-blue-50/70 px-6 py-2.5">
            <span className="text-sm font-semibold text-blue-700">
              {selected.size} invoice dipilih
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={bulkTrash}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 shadow-sm transition-colors hover:bg-rose-50"
              >
                Move to Trash
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        <div data-tour="table">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50">
                  <th className="w-12 py-3 pl-6">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <SortableTh label="Invoice Details" k="invoiceNo" />
                  <SortableTh label="Client" k="customerName" />
                  <SortableTh label="Amount" k="totalIdr" />
                  <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      {invoices.length === 0
                        ? "No invoices yet — create your first one."
                        : "No matches."}
                    </td>
                  </tr>
                ) : (
                  paged.map((inv) => (
                    <tr
                      key={inv.id}
                      className={`group transition-colors ${
                        selected.has(inv.id)
                          ? "bg-blue-50/60"
                          : isOverdue(inv)
                            ? "bg-rose-50/40 hover:bg-rose-50/70"
                            : "hover:bg-blue-50/30"
                      }`}
                    >
                      <td className="py-4 pl-6">
                        <input
                          type="checkbox"
                          checked={selected.has(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="text-sm font-bold text-blue-600 transition-colors hover:text-blue-800"
                          >
                            {inv.invoiceNo}
                          </Link>
                          <span className="mt-0.5 text-xs text-slate-500">
                            {fmtDate(inv.invoiceDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-gradient-to-tr from-indigo-100 to-blue-100 text-xs font-bold text-indigo-700 shadow-sm">
                            {initialsOf(inv.customerName)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">
                              {inv.customerName || "—"}
                            </span>
                            {inv.createdBy && (
                              <span className="text-[11px] text-slate-400">
                                By {inv.createdBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">
                            {money(inv, inv.totalIdr)}
                          </span>
                          {inv.status === "paid" &&
                            receivedOf(inv) < inv.totalIdr && (
                              <span className="text-xs font-semibold text-emerald-600">
                                Diterima {money(inv, receivedOf(inv))}
                              </span>
                            )}
                          {isPartial(inv) && (
                            <span className="text-xs font-semibold text-sky-600">
                              Kurang {money(inv, shortfallOf(inv))}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            Due: {inv.dueDate ? fmtDate(inv.dueDate) : "—"}
                            <DueBadge inv={inv} />
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge inv={inv} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <Link
                            href={`/invoices/${inv.id}?print=1`}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                          >
                            Print
                          </Link>
                          <button
                            onClick={() => remove(inv.id, inv.invoiceNo)}
                            title="Move to trash"
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
                Loading…
              </div>
            ) : sorted.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
                {invoices.length === 0
                  ? "No invoices yet — create your first one."
                  : "No matches."}
              </div>
            ) : (
              paged.map((inv) => (
                <div
                  key={inv.id}
                  className={`rounded-lg border p-4 shadow-sm ${
                    isOverdue(inv)
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sm font-bold text-blue-600 hover:underline"
                    >
                      {inv.invoiceNo}
                    </Link>
                    <StatusBadge inv={inv} align="right" />
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      {inv.customerName || "—"}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {fmtDate(inv.invoiceDate)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-base font-extrabold text-slate-900">
                        {money(inv, inv.totalIdr)}
                      </span>
                      {inv.status === "paid" &&
                        receivedOf(inv) < inv.totalIdr && (
                          <span className="text-xs font-semibold text-emerald-600">
                            Diterima {money(inv, receivedOf(inv))}
                          </span>
                        )}
                      {isPartial(inv) && (
                        <span className="text-xs font-semibold text-sky-600">
                          Kurang {money(inv, shortfallOf(inv))}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {inv.dueDate ? (
                        <>
                          Due {fmtDate(inv.dueDate)}
                          <DueBadge inv={inv} />
                        </>
                      ) : (
                        "Due —"
                      )}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end gap-1 border-t border-slate-100 pt-2">
                    <Link
                      href={`/invoices/${inv.id}?print=1`}
                      className="rounded px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Print
                    </Link>
                    <button
                      onClick={() => remove(inv.id, inv.invoiceNo)}
                      className="rounded px-2 py-1 text-xs font-bold text-rose-500 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer: range info + pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-200 bg-white px-6 py-4">
          <p className="text-sm font-medium text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-900">
              {sorted.length === 0 ? 0 : (curPage - 1) * PAGE_SIZE + 1}–
              {Math.min(curPage * PAGE_SIZE, sorted.length)}
            </span>{" "}
            of <span className="font-bold text-slate-900">{sorted.length}</span>{" "}
            invoices
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(curPage - 1)}
                disabled={curPage === 1}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ‹ Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 || p === totalPages || Math.abs(p - curPage) <= 1
                )
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e${i}`} className="px-1.5 text-xs text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[32px] rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                        p === curPage
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage(curPage + 1)}
                disabled={curPage === totalPages}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      </div>

      <GuidedTour />
    </AppShell>
  );
}

// useSearchParams requires a Suspense boundary for prerendering.
export default function HomePage() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}
