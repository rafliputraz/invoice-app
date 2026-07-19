"use client";

import type { InvoiceData, LineItem } from "@/lib/types";
import { computeTotals, currencyTotals, type Totals } from "@/lib/calc";
import { DEFAULT_SIGNER } from "@/lib/defaults";

/** Label : value line used across templates. */
export function LabeledLine({
  label,
  value,
  labelWidth = "8.5rem",
  bold = false,
}: {
  label: string;
  value: string;
  labelWidth?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex">
      <span className="shrink-0" style={{ width: labelWidth }}>
        {label}
      </span>
      <span className="shrink-0 pr-1">:</span>
      <span className={bold ? "font-bold" : ""}>{value}</span>
    </div>
  );
}

export interface InvoiceComputed {
  totals: Totals;
  /** Non-empty items, pinned rows (Doc Fee / Adm Fee) last. */
  visibleItems: LineItem[];
  perCurrency: { usd: number; idr: number };
  signer: string;
}

export function invoiceComputed(data: InvoiceData): InvoiceComputed {
  const visibleItems = data.items
    .filter((it) => it.description.trim() !== "" || it.unitPrice > 0)
    .sort((a, b) => Number(!!a.pinned) - Number(!!b.pinned));
  return {
    totals: computeTotals(data),
    visibleItems,
    perCurrency: currencyTotals(visibleItems),
    signer: data.signatureName ?? DEFAULT_SIGNER,
  };
}
