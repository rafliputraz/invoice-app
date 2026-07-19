"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InvoiceListItem, InvoiceStatus } from "@/lib/types";
import { fmtIdr, fmtDate } from "@/lib/format";
import HelpGuide from "@/components/HelpGuide";

interface Me {
  username: string;
  name: string;
  role: string;
}

type SortKey = "invoiceNo" | "invoiceDate" | "customerName" | "totalIdr" | "dueDate";
type StatusFilter = "all" | "unpaid" | "overdue" | "paid";

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

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "amber" | "red";
}) {
  const valueCls =
    tone === "red"
      ? "text-red-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-gray-800";
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold ${valueCls}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function DueBadge({ inv }: { inv: InvoiceListItem }) {
  if (!inv.dueDate || inv.status === "paid") return null;
  const days = daysUntil(inv.dueDate);
  let cls: string;
  let text: string;
  if (days < 0) {
    cls = "bg-red-100 text-red-700";
    text = `telat ${-days} hr`;
  } else if (days <= 7) {
    cls = "bg-amber-100 text-amber-700";
    text = days === 0 ? "hari ini" : `${days} hr lagi`;
  } else {
    cls = "bg-gray-100 text-gray-500";
    text = `sisa ${days} hr`;
  }
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {text}
    </span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all"); // "all" | "YYYY-MM"
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null); // null = API order
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [me, setMe] = useState<Me | null>(null);

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

  const load = () => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((rows: InvoiceListItem[]) => setInvoices(rows))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (id: number, invoiceNo: string) => {
    if (!confirm(`Delete invoice ${invoiceNo}?`)) return;
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    load();
  };

  // Which row's status popover is open.
  const [statusMenuId, setStatusMenuId] = useState<number | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);

  const setStatus = async (inv: InvoiceListItem, next: InvoiceStatus) => {
    setStatusMenuId(null);
    if (inv.status === next) return;
    // Optimistic update; rolled back if the request fails.
    setSavingStatusId(inv.id);
    setInvoices((prev) =>
      prev.map((it) => (it.id === inv.id ? { ...it, status: next } : it))
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
        prev.map((it) =>
          it.id === inv.id ? { ...it, status: inv.status } : it
        )
      );
    } finally {
      setSavingStatusId(null);
    }
  };

  const months = useMemo(
    () =>
      [...new Set(invoices.map((inv) => inv.invoiceDate.slice(0, 7)))].sort(
        (a, b) => b.localeCompare(a)
      ),
    [invoices]
  );

  const stats = useMemo(() => {
    const ym = localYm(new Date());
    const thisMonth = invoices.filter((inv) => inv.invoiceDate.startsWith(ym));
    const unpaid = invoices.filter((inv) => inv.status === "unpaid");
    const overdue = invoices.filter(isOverdue);
    const sum = (list: InvoiceListItem[]) =>
      list.reduce((acc, inv) => acc + inv.totalIdr, 0);
    return {
      monthCount: thisMonth.length,
      monthTotal: sum(thisMonth),
      outstanding: sum(unpaid),
      overdueCount: overdue.length,
      overdueTotal: sum(overdue),
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
      list = list.filter((inv) =>
        statusFilter === "overdue" ? isOverdue(inv) : inv.status === statusFilter
      );
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

  const SortableTh = ({
    label,
    k,
    right,
  }: {
    label: string;
    k: SortKey;
    right?: boolean;
  }) => (
    <th className={`px-4 py-2 font-medium ${right ? "text-right" : ""}`}>
      <button
        onClick={() => toggleSort(k)}
        className="cursor-pointer hover:text-gray-700"
      >
        {label}
        {sortKey === k && (sortDir === "asc" ? " ▲" : " ▼")}
      </button>
    </th>
  );

  const monthLabel = (ym: string) =>
    new Date(ym + "-01T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

  const selectCls =
    "rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">SFL Invoices</h1>
            <p className="text-xs text-gray-500">
              PT. Salam Fortuna Logistik
            </p>
          </div>
          <div className="flex items-center gap-3">
            {me && (
              <span className="text-xs text-gray-500">
                Logged in as <b>{me.name || me.username}</b>
              </span>
            )}
            <HelpGuide />
            {me?.role === "admin" && (
              <Link
                href="/users"
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Users
              </Link>
            )}
            <Link
              href="/invoices/new"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + New Invoice
            </Link>
            <button
              onClick={logout}
              className="rounded px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Invoices This Month"
            value={String(stats.monthCount)}
          />
          <StatCard label="Total This Month" value={fmtIdr(stats.monthTotal)} />
          <StatCard
            label="Outstanding (Unpaid)"
            value={fmtIdr(stats.outstanding)}
            tone="amber"
          />
          <StatCard
            label="Overdue"
            value={fmtIdr(stats.overdueTotal)}
            sub={
              stats.overdueCount > 0
                ? `${stats.overdueCount} invoice perlu ditagih`
                : "tidak ada yang telat"
            }
            tone="red"
          />
        </div>

        <div className="mb-4 flex gap-2">
          <input
            className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Search by invoice no or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={selectCls}
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
          <select
            className={selectCls}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All status</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <SortableTh label="Invoice No" k="invoiceNo" />
                <SortableTh label="Date" k="invoiceDate" />
                <SortableTh label="Customer" k="customerName" />
                <th className="px-4 py-2 font-medium">By</th>
                <SortableTh label="Total (IDR)" k="totalIdr" right />
                <SortableTh label="Due" k="dueDate" />
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    {invoices.length === 0
                      ? "No invoices yet — create your first one."
                      : "No matches."}
                  </td>
                </tr>
              ) : (
                sorted.map((inv) => (
                  <tr
                    key={inv.id}
                    className={
                      isOverdue(inv)
                        ? "bg-red-50/40 hover:bg-red-50/70"
                        : "hover:bg-blue-50/40"
                    }
                  >
                    <td className="px-4 py-2 font-mono">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{fmtDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-2">{inv.customerName}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {inv.createdBy || "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {fmtIdr(inv.totalIdr)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {inv.dueDate ? (
                        <>
                          {fmtDate(inv.dueDate)}
                          <DueBadge inv={inv} />
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="relative px-4 py-2">
                      <button
                        onClick={() =>
                          setStatusMenuId((cur) =>
                            cur === inv.id ? null : inv.id
                          )
                        }
                        disabled={savingStatusId === inv.id}
                        title="Change payment status"
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                          inv.status === "paid"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            inv.status === "paid"
                              ? "bg-green-500"
                              : "bg-amber-500"
                          }`}
                        />
                        {savingStatusId === inv.id
                          ? "Saving…"
                          : inv.status === "paid"
                            ? "Paid"
                            : "Unpaid"}
                        <svg
                          className="h-3 w-3 opacity-60"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      {statusMenuId === inv.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setStatusMenuId(null)}
                          />
                          <div className="absolute left-2 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            {(
                              [
                                ["paid", "Paid", "bg-green-500", "Pembayaran diterima"],
                                ["unpaid", "Unpaid", "bg-amber-500", "Belum dibayar"],
                              ] as const
                            ).map(([value, label, dot, desc]) => (
                              <button
                                key={value}
                                onClick={() => setStatus(inv, value)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50"
                              >
                                <span
                                  className={`h-2 w-2 shrink-0 rounded-full ${dot}`}
                                />
                                <span className="flex-1">
                                  <span className="block font-medium text-gray-700">
                                    {label}
                                  </span>
                                  <span className="block text-gray-400">
                                    {desc}
                                  </span>
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
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <Link
                        href={`/invoices/${inv.id}?print=1`}
                        className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Print
                      </Link>
                      <button
                        onClick={() => remove(inv.id, inv.invoiceNo)}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
