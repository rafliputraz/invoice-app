"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { InvoiceData } from "@/lib/types";
import { defaultInvoice } from "@/lib/defaults";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";
import IdleLogout from "./IdleLogout";
import Marking from "./Marking";
import { IconDownload, IconPrint } from "./Icons";
import { downloadInvoicePdf, invoicePdfName } from "@/lib/pdf";

export default function InvoiceEditor({
  invoiceId,
  initialData,
  autoPrint,
  addendum = false,
}: {
  invoiceId?: number;
  initialData?: InvoiceData;
  autoPrint?: boolean;
  /** Addendum on an existing B/L: number is a read-only suffix, saved as manual. */
  addendum?: boolean;
}) {
  const router = useRouter();
  const [data, setDataState] = useState<InvoiceData>(
    () => initialData ?? defaultInvoice()
  );
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  // manualNo lets the user type an old/backlog number; addendum (a prop, set by
  // the New Invoice chooser) carries a read-only auto-suffixed number. Either
  // way the number is user-set/derived rather than auto-generated.
  const [manualNo, setManualNo] = useState(false);
  const [numberTaken, setNumberTaken] = useState(false);
  const isNew = invoiceId === undefined;

  const customNumber = manualNo || addendum;

  // Inline validation shown under the Invoice No field.
  const trimmedNo = data.invoiceNo.trim();
  const numberError = !customNumber
    ? ""
    : !trimmedNo
      ? "Invoice number cannot be empty"
      : numberTaken
        ? `Invoice number "${trimmedNo}" is already in use`
        : "";

  const download = async () => {
    const el = document.getElementById("invoice-print");
    if (!el) return;
    setDownloading(true);
    try {
      await downloadInvoicePdf(el, "Inv " + invoicePdfName(data.invoiceNo));
    } catch (err) {
      setSavedMsg(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const setData = useCallback(
    (updater: (prev: InvoiceData) => InvoiceData) => setDataState(updater),
    []
  );

  // For new invoices, keep the auto number preview in sync with the date.
  // Skipped in manual mode so we don't clobber a number the user typed.
  useEffect(() => {
    if (!isNew || customNumber || !data.invoiceDate) return;
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
  }, [isNew, customNumber, data.invoiceDate]);

  // Live duplicate check for the manual number, so the clash shows under the
  // field as the user types instead of only after a rejected save.
  useEffect(() => {
    if (!customNumber || !data.invoiceNo.trim()) {
      setNumberTaken(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      const params = new URLSearchParams({ no: data.invoiceNo.trim() });
      if (!isNew && invoiceId !== undefined) {
        params.set("excludeId", String(invoiceId));
      }
      fetch(`/api/invoices/check-number?${params}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((res: { taken: boolean }) => setNumberTaken(res.taken))
        .catch(() => {});
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [customNumber, data.invoiceNo, isNew, invoiceId]);

  // Quick-print entry from the list: open the dialog once the preview painted.
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoPrint]);

  const save = async () => {
    if (numberError) {
      setSavedMsg(numberError);
      return;
    }
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch(
        isNew ? "/api/invoices" : `/api/invoices/${invoiceId}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            customNumber ? { ...data, manualInvoiceNo: true } : data
          ),
        }
      );
      if (!res.ok) {
        const msg = await res
          .json()
          .then((b: { error?: string }) => b.error)
          .catch(() => null);
        throw new Error(msg || `Save failed (${res.status})`);
      }
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
    <div className="print-root app-font flex h-screen flex-col overflow-hidden bg-bg text-ink antialiased">
      <IdleLogout />
      {/* Toolbar */}
      <header className="no-print z-20 flex h-[64px] shrink-0 items-center justify-between gap-3 border-b border-line bg-card px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="btn btn-sm shrink-0">
            ← Dashboard
          </Link>
          <span aria-hidden className="h-5 w-px shrink-0 bg-line" />
          {isNew ? (
            <span className="text-[14px] font-bold text-ink">New invoice</span>
          ) : (
            <Marking no={data.invoiceNo} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {savedMsg && (
            <span
              role="status"
              className="pill pill-paid mr-1 hidden max-w-[30ch] truncate sm:inline-flex"
            >
              {savedMsg}
            </span>
          )}
          <button onClick={() => window.print()} className="btn btn-sm">
            <IconPrint className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={download}
            disabled={downloading}
            className="btn btn-sm"
          >
            <IconDownload className="h-4 w-4" />
            <span className="hidden sm:inline">
              {downloading ? "Preparing…" : "PDF"}
            </span>
          </button>
          <button
            onClick={save}
            disabled={saving || !!numberError}
            title={numberError || undefined}
            className="btn btn-primary btn-sm"
          >
            {saving ? "Saving…" : isNew ? "Save" : "Save changes"}
          </button>
        </div>
      </header>

      {/* The form on the left, the document it produces on the right. */}
      <div className="flex min-h-0 flex-1">
        <aside className="no-print app-font z-10 flex min-h-0 w-full shrink-0 flex-col border-r border-line bg-bg sm:w-[440px] lg:w-[520px]">
          <div className="shrink-0 border-b border-line bg-card px-4 py-2.5">
            <p className="text-[12.5px] text-ink-2">
              The document on the right redraws as you type.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <InvoiceForm
              data={data}
              setData={setData}
              manualNo={manualNo}
              setManualNo={setManualNo}
              isNew={isNew}
              numberError={numberError}
              addendum={addendum}
            />
            <div className="h-8" />
          </div>
        </aside>
        <div className="print-area hidden min-h-0 flex-1 overflow-auto bg-bg p-4 sm:block sm:p-8 print:block print:bg-white">
          <div className="mx-auto w-fit pb-12 shadow-pop print:m-0 print:w-auto print:pb-0 print:shadow-none">
            <InvoicePreview data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
