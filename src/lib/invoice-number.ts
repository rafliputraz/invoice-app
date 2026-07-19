const ROMAN_MONTHS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

/** Month (1-12) as Roman numeral. */
export function romanMonth(month: number): string {
  return ROMAN_MONTHS[month - 1] ?? "";
}

/** Two-digit year from an ISO date string ("2026-07-17" -> 26). */
export function yearOf(isoDate: string): number {
  return new Date(isoDate + "T00:00:00").getFullYear() % 100;
}

/** ISO due date = invoiceDate + dueDays, or null when no valid term is set. */
export function dueDateOf(
  isoDate: string,
  dueDays?: number
): string | null {
  if (!dueDays || dueDays < 1 || !Number.isFinite(dueDays)) return null;
  const d = new Date(isoDate + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Math.floor(dueDays));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Build the SFL invoice number: seq/romanMonth/SFL/yy
 * e.g. formatInvoiceNo(28, "2026-07-17") -> "028/VII/SFL/26"
 */
export function formatInvoiceNo(seq: number, isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  const month = d.getMonth() + 1;
  const yy = d.getFullYear() % 100;
  return `${String(seq).padStart(3, "0")}/${romanMonth(month)}/SFL/${String(
    yy
  ).padStart(2, "0")}`;
}
