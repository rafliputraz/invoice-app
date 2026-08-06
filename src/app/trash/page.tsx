"use client";

import { useEffect, useState } from "react";
import { fmtIdr, fmtDate, cleanName } from "@/lib/format";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Marking from "@/components/Marking";
import useReveal from "@/components/useReveal";
import { IconRestore, IconTrash, IconSearch } from "@/components/Icons";

interface TrashRow {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  totalIdr: number;
  deletedAt: string;
}

/** "2026-07-19 13:31:09" → "Jul 19, 2026 · 13:31" */
function stamp(s: string): string {
  const [d, t] = (s || "").split(" ");
  return d ? `${fmtDate(d)}${t ? ` · ${t.slice(0, 5)}` : ""}` : s;
}

export default function TrashPage() {
  const [rows, setRows] = useState<TrashRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [purging, setPurging] = useState(false);

  const load = () => {
    fetch("/api/invoices/trash")
      .then(async (r) => {
        if (!r.ok) throw new Error("Only admins can view the trash");
        setRows((await r.json()) as TrashRow[]);
        setSelected(new Set()); // clear selection — row ids may have changed
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const restore = async (row: TrashRow) => {
    const res = await fetch(`/api/invoices/${row.id}/restore`, {
      method: "POST",
    });
    if (!res.ok) {
      setError(`Could not restore ${row.invoiceNo}.`);
      return;
    }
    load();
  };

  const purgeOne = (id: number) =>
    fetch(`/api/invoices/${id}?permanent=1`, { method: "DELETE" });

  const purge = async (row: TrashRow) => {
    if (
      !confirm(
        `Permanently delete invoice ${row.invoiceNo}? This cannot be undone.`
      )
    )
      return;
    const res = await purgeOne(row.id);
    if (!res.ok) {
      setError(`Could not delete ${row.invoiceNo}.`);
      return;
    }
    load();
  };

  const purgeSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Permanently delete ${ids.length} selected invoice(s)? This cannot be undone.`
      )
    )
      return;
    setPurging(true);
    try {
      const results = await Promise.all(ids.map(purgeOne));
      if (results.some((r) => !r.ok)) {
        setError("Some invoices could not be deleted.");
      }
    } finally {
      setPurging(false);
      load();
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.invoiceNo.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q)
      )
    : rows;

  const allSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const root = useReveal<HTMLDivElement>(filtered.length);

  return (
    <AppShell
      active="trash"
      title="Trash"
      subtitle="Invoices taken off the register. Restore them, or clear them permanently."
    >
      <div ref={root}>
        {error && (
          <p
            role="alert"
            className="anim-card mb-4 rounded-xl bg-overdue-soft px-4 py-3 text-[13px] font-semibold text-overdue"
          >
            {error}
          </p>
        )}

        <section className="anim-card card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-5">
            <div className="mr-auto flex items-center gap-2.5">
              <h2 className="h-sec">Deleted invoices</h2>
              <span className="pill pill-neutral">
                {rows.length} {rows.length === 1 ? "invoice" : "invoices"}
              </span>
            </div>
            <div className="relative w-full sm:w-60">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                type="search"
                placeholder="Search number or customer"
                aria-label="Search the trash"
                className="field pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {selected.size > 0 && (
            <div className="mx-5 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-overdue-soft px-4 py-2.5">
              <span className="text-[13px] font-semibold text-overdue">
                {selected.size} selected — deleting these cannot be undone
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={purgeSelected}
                  disabled={purging}
                  className="btn btn-sm"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                  {purging ? "Deleting…" : "Delete permanently"}
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="btn btn-quiet btn-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="register">
              <thead>
                <tr>
                  <th scope="col" className="w-10 pl-5">
                    <input
                      type="checkbox"
                      className="check"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(
                          allSelected
                            ? new Set()
                            : new Set(filtered.map((r) => r.id))
                        )
                      }
                      aria-label="Select all"
                    />
                  </th>
                  <th scope="col">Invoice</th>
                  <th scope="col">Customer</th>
                  <th scope="col" className="text-right">
                    Amount
                  </th>
                  <th scope="col">Deleted</th>
                  <th scope="col" className="pr-5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="note py-14 text-center">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <span className="iconchip mx-auto mb-3 flex h-12 w-12 bg-soft">
                        <IconTrash className="h-5 w-5 text-ink-3" />
                      </span>
                      <p className="text-[15px] font-bold text-ink">
                        {rows.length === 0
                          ? "The trash is empty"
                          : "Nothing matches that search"}
                      </p>
                      <p className="note mt-1">
                        {rows.length === 0
                          ? "Deleted invoices wait here until an admin clears them."
                          : "Try a different number or customer."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="anim-row"
                      data-selected={selected.has(row.id)}
                    >
                      <td className="pl-5">
                        <input
                          type="checkbox"
                          className="check"
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                          aria-label={`Select ${row.invoiceNo}`}
                        />
                      </td>
                      <td>
                        <Marking no={row.invoiceNo} />
                        <p className="mt-0.5 text-[11.5px] text-ink-3">
                          {fmtDate(row.invoiceDate)}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={row.customerName || "?"}
                            size={32}
                            className="opacity-70"
                          />
                          <p className="max-w-[24ch] truncate text-[13.5px] font-semibold text-ink">
                            {cleanName(row.customerName) || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="fig text-right text-[13.5px]">
                        Rp {fmtIdr(row.totalIdr)}
                      </td>
                      <td className="text-[12.5px] text-ink-2">
                        {stamp(row.deletedAt)}
                      </td>
                      <td className="pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => restore(row)}
                            title={`Restore ${row.invoiceNo}`}
                            className="btn btn-sm"
                          >
                            <IconRestore className="h-3.5 w-3.5" />
                            Restore
                          </button>
                          <button
                            onClick={() => purge(row)}
                            title={`Delete ${row.invoiceNo} permanently`}
                            aria-label={`Delete ${row.invoiceNo} permanently`}
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

          <p className="note border-t border-line px-5 py-4 text-[12.5px]">
            Restoring puts an invoice back on the register with its original
            number. Deleting permanently cannot be undone.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
