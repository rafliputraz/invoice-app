"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Dialog from "./Dialog";
import Marking from "./Marking";
import {
  IconChevronRight,
  IconPlus,
  IconRegister,
  IconSearch,
} from "./Icons";

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
        className="btn btn-primary"
      >
        <IconPlus className="h-4 w-4" />
        <span className="hidden sm:inline">New Invoice</span>
        <span className="sm:hidden">New</span>
      </button>

      <Dialog
        open={open}
        onClose={close}
        title={step === "choose" ? "New invoice" : "Choose the parent B/L"}
        note={
          step === "choose"
            ? undefined
            : "The addendum inherits this invoice's bill of lading."
        }
        footer={
          step === "pick" ? (
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="btn btn-quiet btn-sm"
            >
              ← Back
            </button>
          ) : undefined
        }
      >
        {step === "choose" ? (
          <div className="grid gap-2.5">
            <button
              type="button"
              onClick={goFresh}
              className="flex items-start gap-3 rounded-sm border border-line p-3.5 text-left transition-colors hover:border-ink-2 hover:bg-soft"
            >
              <IconPlus className="mt-0.5 h-5 w-5 shrink-0 text-ink-2" />
              <span>
                <span className="block text-sm font-semibold text-ink">
                  Fresh invoice
                </span>
                <span className="note mt-0.5 block text-xs">
                  Takes the next number in this year&rsquo;s sequence.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStep("pick")}
              className="flex items-start gap-3 rounded-sm border border-line p-3.5 text-left transition-colors hover:border-ink-2 hover:bg-soft"
            >
              <IconRegister className="mt-0.5 h-5 w-5 shrink-0 text-ink-2" />
              <span>
                <span className="block text-sm font-semibold text-ink">
                  Addendum to an existing B/L
                </span>
                <span className="note mt-0.5 block text-xs">
                  Separate charges on the same bill of lading — numbered 028A,
                  028B, and so on.
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="flex max-h-[52vh] flex-col">
            <div className="relative mb-3">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search invoice number or customer"
                className="field pl-8"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-line">
              {loading ? (
                <p className="note py-8 text-center text-sm">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="note py-8 text-center text-sm">
                  {invoices.length === 0
                    ? "No invoices yet."
                    : "Nothing matches that search."}
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {filtered.map((iv) => (
                    <li key={iv.id}>
                      <button
                        type="button"
                        onClick={() => goAddendum(iv.id)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-soft"
                      >
                        <span className="min-w-0">
                          <Marking no={iv.invoiceNo} />
                          <span className="note mt-1 block truncate text-xs">
                            {iv.customerName || "—"}
                          </span>
                        </span>
                        <IconChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
