"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fmtIdr, fmtUsd, fmtDate, cleanName } from "@/lib/format";
import type { CustomerMaster } from "@/lib/types";
import AppShell from "@/components/AppShell";
import Dialog from "@/components/Dialog";
import Avatar from "@/components/Avatar";
import CountUp from "@/components/CountUp";
import useReveal from "@/components/useReveal";
import {
  IconDownload,
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconChevronRight,
  IconCompany,
  IconAlert,
  IconCheck,
} from "@/components/Icons";

interface CustomerRow {
  customerName: string;
  invoiceCount: number;
  /** Rupiah sums. USD-only invoices are summed separately — never added in. */
  totalIdr: number;
  outstandingIdr: number;
  overdueIdr: number;
  totalUsd: number;
  outstandingUsd: number;
  overdueUsd: number;
  lastInvoiceDate: string;
}

/** Rupiah leads; any USD is a separate line, because the two are never one. */
function Amount({
  idr,
  usd,
  tone,
  size = "13.5px",
}: {
  idr: number;
  usd: number;
  tone?: "short" | "overdue" | "paid";
  size?: string;
}) {
  if (!idr && !usd) return <span className="text-[13px] text-ink-3">—</span>;
  const cls =
    tone === "overdue"
      ? "text-overdue"
      : tone === "short"
        ? "text-short"
        : tone === "paid"
          ? "text-paid"
          : "text-ink";
  return (
    <span className="block">
      {idr > 0 && (
        <span className={`fig block ${cls}`} style={{ fontSize: size }}>
          Rp {fmtIdr(idr)}
        </span>
      )}
      {usd > 0 && (
        <span className={`fig block ${cls}`} style={{ fontSize: size }}>
          $ {fmtUsd(usd)}
        </span>
      )}
    </span>
  );
}

/** One labelled line in the detail panel. */
function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <p className="text-[11.5px] font-semibold tracking-wide text-ink-3 uppercase">
        {label}
      </p>
      <div className="mt-1 text-[13.5px] text-ink">{children}</div>
    </div>
  );
}

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [master, setMaster] = useState<CustomerMaster[]>([]);
  const [search, setSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const loadMaster = () => {
    fetch("/api/customers/master")
      .then((r) => r.json())
      .then((data: CustomerMaster[]) => setMaster(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data: CustomerRow[]) => setRows(data))
      .finally(() => setLoading(false));
    loadMaster();
  }, []);

  // Add/edit dialog for the saved-customer records.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", address: "", taxId: "" });
  const [formMsg, setFormMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", address: "", taxId: "" });
    setFormMsg("");
    setFormOpen(true);
  };

  const editMaster = (c: CustomerMaster) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      address: c.addressLines.join("\n"),
      taxId: c.taxId,
    });
    setFormMsg("");
    setFormOpen(true);
  };

  const removeMaster = async (c: CustomerMaster) => {
    if (
      !confirm(
        `Remove "${c.name}" from saved customers? Existing invoices are not affected.`
      )
    )
      return;
    await fetch(`/api/customers/master/${c.id}`, { method: "DELETE" });
    loadMaster();
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormMsg("");
    const payload = {
      name: form.name,
      addressLines: form.address.split("\n"),
      taxId: form.taxId,
    };
    const res = await fetch(
      editingId === null
        ? "/api/customers/master"
        : `/api/customers/master/${editingId}`,
      {
        method: editingId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setFormMsg(body.error || "Could not save. Try again.");
      return;
    }
    setFormOpen(false);
    loadMaster();
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => r.customerName.toLowerCase().includes(q))
    : rows;

  const mq = masterSearch.trim().toLowerCase();
  const filteredMaster = mq
    ? master.filter((c) => c.name.toLowerCase().includes(mq))
    : master;

  const totals = useMemo(
    () => ({
      outstanding: rows.reduce((a, r) => a + r.outstandingIdr, 0),
      overdue: rows.reduce((a, r) => a + r.overdueIdr, 0),
      owing: rows.filter((r) => r.outstandingIdr > 0 || r.outstandingUsd > 0)
        .length,
      chasing: rows.filter((r) => r.overdueIdr > 0 || r.overdueUsd > 0).length,
    }),
    [rows]
  );

  // The selected relationship, plus its saved record if one exists.
  const selected = useMemo(
    () => filtered.find((r) => r.customerName === picked) ?? filtered[0] ?? null,
    [filtered, picked]
  );
  const selectedMaster = useMemo(
    () =>
      selected
        ? master.find(
            (m) =>
              m.name.trim().toLowerCase() ===
              selected.customerName.trim().toLowerCase()
          ) ?? null
        : null,
    [master, selected]
  );

  const root = useReveal<HTMLDivElement>(filtered.length);

  /** Share of a customer's billing that has already been collected. */
  const collectedPct = (r: CustomerRow) =>
    r.totalIdr > 0
      ? Math.max(0, Math.round(((r.totalIdr - r.outstandingIdr) / r.totalIdr) * 100))
      : 100;

  return (
    <AppShell
      active="customers"
      title="Customers"
      subtitle="What each customer owes, and the saved details that fill an invoice in."
    >
      <div ref={root}>
        {/* ── Position at a glance ─────────────────────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="anim-card card p-5">
            <span className="iconchip bg-soft text-ink-2">
              <IconCompany className="h-[18px] w-[18px]" />
            </span>
            <p className="fig mt-4 text-[20px] leading-tight">{rows.length}</p>
            <p className="mt-1 text-[13px] font-semibold text-ink">
              Customers billed
            </p>
            <p className="mt-0.5 text-[12px] text-ink-3">
              {master.length} saved for quick invoicing
            </p>
          </div>
          <div className="anim-card card p-5">
            <span className="iconchip bg-open-soft text-open">
              <IconCheck className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <p className="fig mt-4 text-[20px] leading-tight">
              <CountUp
                value={totals.outstanding}
                format={(n) => `Rp ${fmtIdr(n)}`}
              />
            </p>
            <p className="mt-1 text-[13px] font-semibold text-ink">
              Outstanding
            </p>
            <p className="mt-0.5 text-[12px] text-ink-3">
              across {totals.owing} customer{totals.owing === 1 ? "" : "s"}
            </p>
          </div>
          <div className="anim-card card p-5">
            <span className="iconchip bg-overdue-soft text-overdue">
              <IconAlert className="h-[18px] w-[18px]" />
            </span>
            <p
              className={`fig mt-4 text-[20px] leading-tight ${
                totals.overdue > 0 ? "text-overdue" : ""
              }`}
            >
              <CountUp
                value={totals.overdue}
                format={(n) => `Rp ${fmtIdr(n)}`}
              />
            </p>
            <p className="mt-1 text-[13px] font-semibold text-ink">Overdue</p>
            <p className="mt-0.5 text-[12px] text-ink-3">
              {totals.chasing > 0
                ? `${totals.chasing} to chase`
                : "Nobody is late"}
            </p>
          </div>
        </section>

        {/* ── The book, and one relationship in detail ─────────────────── */}
        <section className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="anim-card card overflow-hidden xl:col-span-2">
            <div className="flex flex-wrap items-center gap-3 p-5">
              <div className="mr-auto flex items-center gap-2.5">
                <h2 className="h-sec">Position by customer</h2>
                <span className="pill pill-neutral">
                  largest outstanding first
                </span>
              </div>
              <div className="relative w-full sm:w-52">
                <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <input
                  type="search"
                  placeholder="Search customer"
                  aria-label="Search customers"
                  className="field pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <a
                href="/api/invoices/export"
                title="Download a spreadsheet of every invoice"
                className="btn"
              >
                <IconDownload className="h-4 w-4" />
                Export
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="register">
                <thead>
                  <tr>
                    <th scope="col" className="pl-5">
                      Customer
                    </th>
                    <th scope="col" className="text-right">
                      Total
                    </th>
                    <th scope="col" className="text-right">
                      Outstanding
                    </th>
                    <th scope="col" className="text-right">
                      Overdue
                    </th>
                    <th scope="col" className="pr-5">
                      Collected
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="note py-14 text-center">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <p className="text-[15px] font-bold text-ink">
                          {rows.length === 0
                            ? "No customers on the register yet"
                            : "Nothing matches that search"}
                        </p>
                        <p className="note mt-1">
                          {rows.length === 0
                            ? "They appear here once their first invoice is issued."
                            : "Try a different name."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const pct = collectedPct(row);
                      const isOn =
                        selected?.customerName === row.customerName;
                      return (
                        <tr
                          key={row.customerName}
                          className="anim-row cursor-pointer"
                          data-selected={isOn}
                          onClick={() => setPicked(row.customerName)}
                        >
                          <td className="pl-5">
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={row.customerName || "?"}
                                size={36}
                              />
                              <div className="min-w-0">
                                <p className="max-w-[24ch] truncate text-[13.5px] font-bold text-ink">
                                  {cleanName(row.customerName) ||
                                    "(no name recorded)"}
                                </p>
                                <p className="text-[11.5px] text-ink-3">
                                  {row.invoiceCount} invoice
                                  {row.invoiceCount === 1 ? "" : "s"} · last{" "}
                                  {fmtDate(row.lastInvoiceDate)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="text-right">
                            <Amount idr={row.totalIdr} usd={row.totalUsd} />
                          </td>
                          <td className="text-right">
                            <Amount
                              idr={row.outstandingIdr}
                              usd={row.outstandingUsd}
                              tone="short"
                            />
                          </td>
                          <td className="text-right">
                            <Amount
                              idr={row.overdueIdr}
                              usd={row.overdueUsd}
                              tone="overdue"
                            />
                          </td>
                          <td className="pr-5">
                            <div className="flex items-center gap-2.5">
                              <div className="track w-20 shrink-0">
                                <span
                                  style={{
                                    width: `${pct}%`,
                                    background:
                                      pct === 100
                                        ? "var(--color-paid)"
                                        : row.overdueIdr > 0
                                          ? "var(--color-overdue)"
                                          : "var(--color-open)",
                                  }}
                                />
                              </div>
                              <span className="fig text-[12.5px] text-ink-2">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          <div className="anim-card card overflow-hidden">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                <span className="iconchip mb-3 h-12 w-12 bg-soft">
                  <IconCompany className="h-5 w-5 text-ink-3" />
                </span>
                <p className="text-[15px] font-bold text-ink">
                  No customer selected
                </p>
                <p className="note mt-1">
                  Pick a row to see everything on file for them.
                </p>
              </div>
            ) : (
              <>
                <div className="relative bg-gradient-to-br from-brand-soft to-open-soft px-5 pt-7 pb-5 text-center">
                  <Avatar
                    name={selected.customerName || "?"}
                    size={72}
                    className="mx-auto shadow-card"
                  />
                  <h3 className="mt-3.5 text-[15px] font-extrabold tracking-[-0.02em] text-ink">
                    {cleanName(selected.customerName) || "(no name recorded)"}
                  </h3>
                  <p className="mt-1 text-[12.5px] text-ink-2">
                    {selected.invoiceCount} invoice
                    {selected.invoiceCount === 1 ? "" : "s"} · since{" "}
                    {fmtDate(selected.lastInvoiceDate)}
                  </p>

                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Link
                      href={`/?q=${encodeURIComponent(selected.customerName)}`}
                      className="btn btn-primary btn-sm"
                    >
                      View invoices
                      <IconChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    {selectedMaster && (
                      <button
                        onClick={() => editMaster(selectedMaster)}
                        className="btn btn-sm"
                      >
                        <IconEdit className="h-3.5 w-3.5" />
                        Edit details
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4">
                  <h4 className="h-sec mb-1 text-[14px]">
                    Detailed information
                  </h4>
                  <Detail label="Total billed">
                    <Amount
                      idr={selected.totalIdr}
                      usd={selected.totalUsd}
                      size="14px"
                    />
                  </Detail>
                  <Detail label="Outstanding">
                    <Amount
                      idr={selected.outstandingIdr}
                      usd={selected.outstandingUsd}
                      tone="short"
                      size="14px"
                    />
                  </Detail>
                  <Detail label="Overdue">
                    <Amount
                      idr={selected.overdueIdr}
                      usd={selected.overdueUsd}
                      tone="overdue"
                      size="14px"
                    />
                  </Detail>
                  <Detail label="Tax ID (NPWP)">
                    {selectedMaster?.taxId ? (
                      <span className="fig text-[13px]">
                        {selectedMaster.taxId}
                      </span>
                    ) : (
                      <span className="text-ink-3">Not on file</span>
                    )}
                  </Detail>
                  <Detail label="Address">
                    {selectedMaster?.addressLines.filter(Boolean).length ? (
                      <span className="block leading-relaxed">
                        {selectedMaster.addressLines
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="text-ink-3">Not on file</span>
                    )}
                  </Detail>

                  {!selectedMaster && (
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setForm({
                          name: cleanName(selected.customerName),
                          address: "",
                          taxId: "",
                        });
                        setFormMsg("");
                        setFormOpen(true);
                      }}
                      className="btn mt-4 w-full"
                    >
                      <IconPlus className="h-4 w-4" />
                      Save their details
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Saved records ───────────────────────────────────────────── */}
        <section className="anim-card card mt-4 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-5">
            <div className="mr-auto">
              <div className="flex items-center gap-2.5">
                <h2 className="h-sec">Saved customer details</h2>
                <span className="pill pill-neutral">{master.length} saved</span>
              </div>
              <p className="note mt-1 max-w-[70ch]">
                Anything saved here appears in the &ldquo;Invoice to&rdquo;
                picker when you create an invoice, and fills the address and
                NPWP for you.
              </p>
            </div>
            <div className="relative w-full sm:w-52">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                type="search"
                placeholder="Search saved"
                aria-label="Search saved customers"
                className="field pl-9"
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
              />
            </div>
            <button onClick={openAdd} className="btn btn-primary">
              <IconPlus className="h-4 w-4" />
              Add customer
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="register">
              <thead>
                <tr>
                  <th scope="col" className="pl-5">
                    Name
                  </th>
                  <th scope="col">Tax ID (NPWP)</th>
                  <th scope="col">Address</th>
                  <th scope="col" className="pr-5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMaster.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-14 text-center">
                      <p className="text-[15px] font-bold text-ink">
                        {master.length === 0
                          ? "No saved customers yet"
                          : "Nothing matches that search"}
                      </p>
                      <p className="note mt-1">
                        {master.length === 0
                          ? "Save one and it fills the invoice form for you."
                          : "Try a different name."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMaster.map((c) => (
                    <tr key={c.id} className="anim-row">
                      <td className="pl-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} size={36} />
                          <p className="max-w-[26ch] truncate text-[13.5px] font-bold text-ink">
                            {cleanName(c.name)}
                          </p>
                        </div>
                      </td>
                      <td>
                        {c.taxId ? (
                          <span className="fig text-[13px]">{c.taxId}</span>
                        ) : (
                          <span className="text-[13px] text-ink-3">—</span>
                        )}
                      </td>
                      <td>
                        <p className="max-w-[42ch] truncate text-[13px] text-ink-2">
                          {c.addressLines.filter(Boolean).join(", ") ||
                            "No address recorded"}
                        </p>
                      </td>
                      <td className="pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => editMaster(c)}
                            title={`Edit ${c.name}`}
                            aria-label={`Edit ${c.name}`}
                            className="btn btn-quiet p-1.5"
                          >
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeMaster(c)}
                            title={`Remove ${c.name}`}
                            aria-label={`Remove ${c.name}`}
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
        </section>
      </div>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId === null ? "Add a customer" : "Edit customer"}
        note="These details fill the invoice form automatically."
        footer={
          <>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="customer-form"
              disabled={busy}
              className="btn btn-primary"
            >
              {busy ? "Saving…" : editingId === null ? "Add customer" : "Save"}
            </button>
          </>
        }
      >
        <form id="customer-form" onSubmit={submitForm} className="space-y-4">
          <label className="block">
            <span className="lbl lbl-strong mb-1.5 block">
              Name <span className="text-brand">*</span>
            </span>
            <input
              className="field"
              placeholder="PT. Example Indonesia"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label className="block">
            <span className="lbl lbl-strong mb-1.5 block">Tax ID (NPWP)</span>
            <input
              className="field"
              placeholder="00.000.000.0-000.000"
              value={form.taxId}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="lbl lbl-strong mb-1.5 flex items-baseline justify-between gap-2">
              Address
              <span className="font-normal text-ink-3">one line each</span>
            </span>
            <textarea
              rows={4}
              className="field resize-y"
              placeholder={"Street\nCity\nProvince"}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>

          {formMsg && (
            <p
              role="alert"
              className="rounded-xl bg-overdue-soft px-3.5 py-2.5 text-[13px] font-semibold text-overdue"
            >
              {formMsg}
            </p>
          )}
        </form>
      </Dialog>
    </AppShell>
  );
}
