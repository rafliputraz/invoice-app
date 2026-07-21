"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtIdr, fmtDate } from "@/lib/format";
import type { CustomerMaster } from "@/lib/types";
import AppShell from "@/components/AppShell";

interface CustomerRow {
  customerName: string;
  invoiceCount: number;
  totalIdr: number;
  outstandingIdr: number;
  overdueIdr: number;
  lastInvoiceDate: string;
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

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";

export default function CustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [master, setMaster] = useState<CustomerMaster[]>([]);
  const [masterSearch, setMasterSearch] = useState("");

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

  // Add/edit form for the master list.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", address: "", taxId: "" });
  const [formMsg, setFormMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", address: "", taxId: "" });
    setFormMsg("");
  };

  const editMaster = (c: CustomerMaster) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      address: c.addressLines.join("\n"),
      taxId: c.taxId,
    });
    setFormMsg("");
  };

  const removeMaster = async (c: CustomerMaster) => {
    if (
      !confirm(
        `Hapus "${c.name}" dari daftar customer tersimpan? (Invoice lama tidak terpengaruh)`
      )
    )
      return;
    await fetch(`/api/customers/master/${c.id}`, { method: "DELETE" });
    if (editingId === c.id) resetForm();
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
      setFormMsg(body.error || "Gagal menyimpan");
      return;
    }
    resetForm();
    loadMaster();
  };

  const mq = masterSearch.trim().toLowerCase();
  const filteredMaster = mq
    ? master.filter((c) => c.name.toLowerCase().includes(mq))
    : master;

  return (
    <AppShell
      active="customers"
      title="Customer Management"
      subtitle="Rekap tagihan per customer dan master data untuk isi otomatis invoice."
    >
      {/* SECTION 1: Financial overview per customer */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Financial Overview
              </h3>
              <p className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
                Urut dari outstanding terbesar
              </p>
            </div>
          </div>
          <a
            href="/api/invoices/export"
            title="Download rekap semua invoice (CSV)"
            className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
          >
            Export Report
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="px-6 py-4 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Customer
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Invoices
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Total (IDR)
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Outstanding
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Overdue
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Last Invoice
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
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    Belum ada invoice.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.customerName}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {row.customerName ? (
                          <>
                            <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {initialsOf(row.customerName)}
                            </div>
                            <Link
                              href={`/?q=${encodeURIComponent(row.customerName)}`}
                              className="text-sm font-bold text-blue-600 transition-colors hover:text-blue-800"
                            >
                              {row.customerName}
                            </Link>
                          </>
                        ) : (
                          <>
                            <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-xs font-bold text-slate-400">
                              ?
                            </div>
                            <span className="text-sm font-medium text-slate-400 italic">
                              (tanpa nama)
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-700">
                        {row.invoiceCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {fmtIdr(row.totalIdr)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.outstandingIdr > 0 ? (
                        <span className="inline-flex items-center rounded border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-sm font-bold text-amber-600">
                          {fmtIdr(row.outstandingIdr)}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.overdueIdr > 0 ? (
                        <span className="inline-flex items-center rounded border border-rose-100 bg-rose-50 px-2.5 py-0.5 text-sm font-bold text-rose-600">
                          {fmtIdr(row.overdueIdr)}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-500">
                        {fmtDate(row.lastInvoiceDate)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Master data */}
      <div className="mt-12">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Customer Master Data
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Data di sini muncul sebagai pilihan dropdown “Invoice to” saat
            membuat invoice.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form card */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
                {editingId === null ? (
                  <>
                    <svg
                      className="h-4 w-4 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Tambah Customer Baru
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit Customer
                  </>
                )}
              </h4>

              <form onSubmit={submitForm} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Nama Customer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputCls}
                    placeholder="Masukkan nama PT/Perusahaan"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Tax ID (NPWP)
                  </label>
                  <input
                    className={`${inputCls} font-mono`}
                    placeholder="000000 000 0000 000"
                    value={form.taxId}
                    onChange={(e) =>
                      setForm({ ...form, taxId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                    Alamat Lengkap
                    <span className="text-[10px] font-normal text-slate-400">
                      Satu baris per baris alamat
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    className={`${inputCls} resize-y`}
                    placeholder="Jalan, Kota, Provinsi…"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    {editingId === null ? "Simpan Data" : "Simpan Perubahan"}
                  </button>
                  {editingId !== null && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Batal
                    </button>
                  )}
                </div>
                {formMsg && (
                  <p className="text-xs text-rose-500">{formMsg}</p>
                )}
              </form>
            </div>
          </div>

          {/* Saved list card */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <h4 className="text-sm font-bold text-slate-800">
                  Tersimpan ({master.length})
                </h4>
                <div className="relative w-48">
                  <svg
                    className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Cari nama…"
                    className="w-full rounded border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-900 transition-colors outline-none focus:border-blue-500 focus:bg-white"
                    value={masterSearch}
                    onChange={(e) => setMasterSearch(e.target.value)}
                  />
                </div>
              </div>

              <ul className="divide-y divide-slate-100">
                {filteredMaster.length === 0 ? (
                  <li className="p-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <svg
                        className="h-6 w-6 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                      {master.length === 0
                        ? "Belum ada customer tersimpan"
                        : "Tidak ada yang cocok"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {master.length === 0
                        ? "Tambahkan customer baru melalui form di sebelah kiri."
                        : "Coba kata kunci lain."}
                    </p>
                  </li>
                ) : (
                  filteredMaster.map((c) => (
                    <li
                      key={c.id}
                      className="group flex items-start gap-4 p-5 transition-colors hover:bg-slate-50"
                    >
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
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
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <h5 className="mb-1 text-sm font-bold text-slate-900">
                              {c.name}
                            </h5>
                            <p className="mb-2 text-xs leading-relaxed text-slate-500">
                              {c.addressLines.filter(Boolean).join(", ") || "—"}
                            </p>
                            {c.taxId && (
                              <div className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-0.5">
                                <span className="mr-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                  NPWP
                                </span>
                                <span className="font-mono text-xs text-slate-700">
                                  {c.taxId}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => editMaster(c)}
                              className="rounded px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeMaster(c)}
                              className="rounded px-2 py-1 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
