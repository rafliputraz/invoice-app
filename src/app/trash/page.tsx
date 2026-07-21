"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtIdr, fmtDate } from "@/lib/format";
import AppShell from "@/components/AppShell";

interface TrashRow {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  totalIdr: number;
  deletedAt: string;
}

export default function TrashPage() {
  const [rows, setRows] = useState<TrashRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/invoices/trash")
      .then(async (r) => {
        if (!r.ok) throw new Error("Only admins can view the trash");
        setRows((await r.json()) as TrashRow[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const restore = async (row: TrashRow) => {
    const res = await fetch(`/api/invoices/${row.id}/restore`, {
      method: "POST",
    });
    if (!res.ok) {
      setError("Failed to restore invoice");
      return;
    }
    load();
  };

  const purge = async (row: TrashRow) => {
    if (
      !confirm(
        `Hapus permanen invoice ${row.invoiceNo}? Tidak bisa dikembalikan.`
      )
    )
      return;
    const res = await fetch(`/api/invoices/${row.id}?permanent=1`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Failed to delete invoice");
      return;
    }
    load();
  };

  return (
    <AppShell
      active="trash"
      title="Trash"
      subtitle="Invoice terhapus — bisa dipulihkan atau dihapus permanen."
    >
      <div className="mx-auto max-w-4xl">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Invoice No</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 text-right font-medium">
                  Total (IDR)
                </th>
                <th className="px-4 py-2 font-medium">Deleted at</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    {error ? "—" : "Trash kosong."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-2">
                      <Link
                        href={`/invoices/${row.id}`}
                        className="font-bold text-blue-600 hover:underline"
                      >
                        {row.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{fmtDate(row.invoiceDate)}</td>
                    <td className="px-4 py-2">{row.customerName}</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      Rp {fmtIdr(row.totalIdr)}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {row.deletedAt}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => restore(row)}
                        className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => purge(row)}
                        className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                      >
                        Hapus permanen
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
