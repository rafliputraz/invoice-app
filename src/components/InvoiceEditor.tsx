"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { InvoiceData } from "@/lib/types";
import { defaultInvoice } from "@/lib/defaults";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";

export default function InvoiceEditor({
  invoiceId,
  initialData,
  autoPrint,
}: {
  invoiceId?: number;
  initialData?: InvoiceData;
  autoPrint?: boolean;
}) {
  const router = useRouter();
  const [data, setDataState] = useState<InvoiceData>(
    () => initialData ?? defaultInvoice()
  );
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const isNew = invoiceId === undefined;

  const setData = useCallback(
    (updater: (prev: InvoiceData) => InvoiceData) => setDataState(updater),
    []
  );

  // For new invoices, keep the auto number preview in sync with the date.
  useEffect(() => {
    if (!isNew || !data.invoiceDate) return;
    const ctrl = new AbortController();
    fetch(`/api/invoices/next-number?date=${data.invoiceDate}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((res: { invoiceNo: string }) =>
        setDataState((prev) => ({ ...prev, invoiceNo: res.invoiceNo }))
      )
      .catch(() => {});
    return () => ctrl.abort();
  }, [isNew, data.invoiceDate]);

  // Quick-print entry from the list: open the dialog once the preview painted.
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoPrint]);

  const save = async () => {
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch(
        isNew ? "/api/invoices" : `/api/invoices/${invoiceId}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const saved: { id: number; invoiceNo: string } = await res.json();
      setDataState((prev) => ({ ...prev, invoiceNo: saved.invoiceNo }));
      setSavedMsg(`Saved as ${saved.invoiceNo}`);
      if (isNew) router.replace(`/invoices/${saved.id}`);
    } catch (err) {
      setSavedMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="print-root min-h-screen bg-gray-100">
      {/* Toolbar */}
      <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 shadow-sm">
        <Link
          href="/"
          className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          ← Invoices
        </Link>
        <h1 className="text-sm font-semibold text-gray-800">
          {isNew ? "New Invoice" : `Invoice ${data.invoiceNo}`}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {savedMsg && (
            <span className="text-xs text-gray-500">{savedMsg}</span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Print / PDF
          </button>
        </div>
      </header>

      {/* Split screen: form left, live preview right */}
      <div className="flex h-[calc(100vh-49px)]">
        <div className="no-print w-[530px] shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4">
          <InvoiceForm data={data} setData={setData} />
        </div>
        <div className="print-area flex-1 overflow-auto p-6">
          <InvoicePreview data={data} />
        </div>
      </div>
    </div>
  );
}
