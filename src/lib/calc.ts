import type { InvoiceData, LineItem } from "./types";

/**
 * Effective VAT rate for freight forwarding invoices:
 * 10% (tax base) x 11/12 x 12% = 1.1%
 * Matches the template label "@10%*11/12*12%".
 */
export const VAT_RATE = 0.1 * (11 / 12) * 0.12;

/** IDR amount for one line item, rounded to whole rupiah. */
export function itemAmountIdr(item: LineItem, exchangeRate: number): number {
  const qty = item.qty || 0;
  const price = item.unitPrice || 0;
  const raw =
    item.currency === "USD" ? price * qty * (exchangeRate || 0) : price * qty;
  return Math.round(raw);
}

/** Raw per-currency sums (price x qty), before any conversion. */
export function currencyTotals(items: LineItem[]): { usd: number; idr: number } {
  let usd = 0;
  let idr = 0;
  for (const item of items) {
    const amount = (item.unitPrice || 0) * (item.qty || 0);
    if (item.currency === "USD") usd += amount;
    else idr += amount;
  }
  return { usd, idr };
}

export interface Totals {
  subtotal: number; // Total (Excl. VAT)
  vat: number; // VAT Charges
  total: number; // Total (Incl. VAT)
}

export function computeTotals(data: InvoiceData): Totals {
  const subtotal = data.items.reduce(
    (sum, item) => sum + itemAmountIdr(item, data.exchangeRate),
    0
  );
  // Indonesian tax convention: VAT is truncated (floored) to whole rupiah.
  const vat = data.vatEnabled ? Math.floor(subtotal * VAT_RATE) : 0;
  return { subtotal, vat, total: subtotal + vat };
}
