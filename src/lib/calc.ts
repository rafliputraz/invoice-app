import type { InvoiceData, LineItem, VatVariant } from "./types";

/**
 * The two VAT formulas an invoice can use. `label` is the exact string printed
 * on the document; `rate` is for display only. The actual VAT is computed with
 * the exact integer fraction num/den — float rates like (11/12)*0.12 come out
 * as 0.10999999999..., which flooring then turns into an off-by-one rupiah
 * (e.g. 1,125,000 x 11% -> 123,749 instead of 123,750).
 * - reduced: 10% (tax base) x 11/12 x 12% = 1.1%  = 11/1000
 * - full:    11/12 x 12%                  = 11%   = 11/100
 */
export const VAT_VARIANTS: Record<
  VatVariant,
  { rate: number; num: number; den: number; label: string }
> = {
  reduced: { rate: 0.011, num: 11, den: 1000, label: "@10%*11/12*12%" },
  full: { rate: 0.11, num: 11, den: 100, label: "@11/12*12%" },
};

/** Backward-compatible alias: the reduced rate old invoices assumed. */
export const VAT_RATE = VAT_VARIANTS.reduced.rate;

/** Default PPh (withholding) rate applied when an invoice is marked "kena PPh". */
export const WITHHOLDING_DEFAULT_RATE = 0.02;

/** IDR amount for one line item, rounded to whole rupiah. */
export function itemAmountIdr(item: LineItem, exchangeRate: number): number {
  const qty = item.qty || 0;
  const price = item.unitPrice || 0;
  const raw =
    item.currency === "USD" ? price * qty * (exchangeRate || 0) : price * qty;
  return Math.round(raw);
}

/**
 * Amount shown for one line item, in the invoice's display currency.
 * USD-only invoices price items directly in USD (no IDR conversion); all other
 * invoices convert to whole rupiah via itemAmountIdr.
 */
export function itemDisplayAmount(item: LineItem, data: InvoiceData): number {
  if (data.usdOnly) return (item.unitPrice || 0) * (item.qty || 0);
  return itemAmountIdr(item, data.exchangeRate);
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
  withholding: number; // PPh withheld on payment (0 when not applicable)
  netReceived: number; // total - withholding (amount actually received when paid)
}

export function computeTotals(data: InvoiceData): Totals {
  // USD-only invoices carry no tax and no IDR conversion: totals are the raw
  // USD sum (cents preserved), VAT/withholding are always zero.
  if (data.usdOnly) {
    const subtotal = data.items.reduce(
      (sum, item) => sum + (item.unitPrice || 0) * (item.qty || 0),
      0
    );
    return { subtotal, vat: 0, total: subtotal, withholding: 0, netReceived: subtotal };
  }
  const subtotal = data.items.reduce(
    (sum, item) => sum + itemAmountIdr(item, data.exchangeRate),
    0
  );
  // Indonesian tax convention: VAT is truncated (floored) to whole rupiah.
  // Integer multiply-then-divide keeps the math exact (no float drift).
  const { num, den } = VAT_VARIANTS[data.vatVariant ?? "reduced"];
  const vat = data.vatEnabled ? Math.floor((subtotal * num) / den) : 0;
  const total = subtotal + vat;
  // PPh (withholding) is deducted from the DPP (subtotal), not the VAT-inclusive
  // total. Only applies when the invoice is marked "kena PPh".
  const wRate = data.withholdingRate ?? WITHHOLDING_DEFAULT_RATE;
  const withholding = data.withholdingEnabled ? Math.round(subtotal * wRate) : 0;
  return { subtotal, vat, total, withholding, netReceived: total - withholding };
}
