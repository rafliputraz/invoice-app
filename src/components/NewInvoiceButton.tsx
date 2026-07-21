"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface InvoiceRow {
  id: number;
  invoiceNo: string;
  customerName: string;
  invoiceDate: string;
}

/**
 * "New Invoice" entry point. Instead of jumping straight into the editor it
 * asks the mode first: a fresh invoice, or an addendum on an existing B/L
 * (which needs a searchable parent picker since the list can get long).
 */
export default function NewInvoiceButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "pick">("choose");
  const [q, setQ] = useState("");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  // Portalling needs the DOM; only true after mount (avoids SSR mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = () => {
    setOpen(false);
    setStep("choose");
    setQ("");
  };

  // Load the parent list the first time the picker is shown.
  useEffect(() => {
    if (step !== "pick" || invoices.length) return;
    setLoading(true);
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((rows: InvoiceRow[]) => setInvoices(rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [step, invoices.length]);

  // Escape closes the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return invoices;
    return invoices.filter(
      (iv) =>
        iv.invoiceNo.toLowerCase().includes(needle) ||
        iv.customerName.toLowerCase().includes(needle)
    );
  }, [q, invoices]);

  const goFresh = () => {
    close();
    router.push("/invoices/new");
  };
  const goAddendum = (id: number) => {
    close();
    router.push(`/invoices/new?addendum=${id}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="new-invoice"
        className="flex transform items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        <span className="hidden sm:inline">New Invoice</span>
        <span className="sm:hidden">New</span>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="app-font fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 pt-24 backdrop-blur-sm"
            onClick={close}
          >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">
                {step === "choose" ? "Buat Invoice" : "Pilih Invoice B/L Induk"}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {step === "choose" ? (
              <div className="grid gap-3 p-5">
                <button
                  type="button"
                  onClick={goFresh}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
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
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900">
                      Invoice Baru
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Nomor otomatis urut berikutnya.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep("pick")}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
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
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m4 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900">
                      Tambahan B/L Existing
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Charge berbeda untuk B/L yang sama — nomor jadi 028A, 028B, …
                    </span>
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex max-h-[60vh] flex-col">
                <div className="border-b border-slate-100 p-3">
                  <div className="relative">
                    <svg
                      className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                      />
                    </svg>
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Cari nomor invoice atau customer…"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {loading ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                      Memuat…
                    </p>
                  ) : filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                      {invoices.length === 0
                        ? "Belum ada invoice."
                        : "Tidak ada yang cocok."}
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {filtered.map((iv) => (
                        <li key={iv.id}>
                          <button
                            type="button"
                            onClick={() => goAddendum(iv.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-blue-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-mono text-sm font-semibold text-slate-900">
                                {iv.invoiceNo}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {iv.customerName || "—"}
                              </span>
                            </span>
                            <svg
                              className="h-4 w-4 shrink-0 text-slate-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-slate-100 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setStep("choose")}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    ← Kembali
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
