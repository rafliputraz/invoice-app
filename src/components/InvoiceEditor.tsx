"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { InvoiceData } from "@/lib/types";
import { defaultInvoice } from "@/lib/defaults";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";
import IdleLogout from "./IdleLogout";

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
    <div className="print-root min-h-screen bg-slate-100">
      <IdleLogout />
      {/* Toolbar */}
      <header className="no-print app-font sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="group flex shrink-0 items-center text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"
          >
            <svg
              className="mr-1.5 h-4 w-4 transform transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Invoices
          </Link>
          <div className="h-5 w-px shrink-0 bg-slate-300" />
          <span className="truncate text-sm font-bold text-slate-900">
            {isNew ? "New Invoice" : `Invoice ${data.invoiceNo}`}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {savedMsg && (
            <span className="mr-1 hidden items-center gap-1 text-xs text-slate-400 sm:flex">
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {savedMsg}
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Print / PDF
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : isNew ? "Save" : "Save Changes"}
          </button>
        </div>
      </header>

      {/* Split screen: form left, live preview right */}
      <div className="flex h-[calc(100vh-56px)]">
        <aside className="no-print app-font z-10 flex w-full shrink-0 flex-col border-r border-slate-200 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] sm:w-[460px] lg:w-[540px]">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <h2 className="text-sm font-bold text-slate-800">
              Invoice Configuration
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Isi detail di bawah — preview di kanan mengikuti secara langsung.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4">
            <InvoiceForm data={data} setData={setData} />
            <div className="h-8" />
          </div>
        </aside>
        <div className="print-area hidden flex-1 overflow-auto bg-slate-200/60 p-4 sm:block sm:p-8 print:block print:bg-white">
          <div className="mx-auto w-fit pb-12 shadow-paper print:m-0 print:w-auto print:pb-0 print:shadow-none">
            <InvoicePreview data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
