/** Indonesian number formatting: 20280271 -> "20.280.271" */
export function fmtIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    n || 0
  );
}

/** Format a number keeping up to `maxFrac` decimals, id-ID style (18.436,6). */
export function fmtNum(n: number, maxFrac = 2): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: maxFrac,
  }).format(n || 0);
}

/** US-style money with 2 decimals: 1234.5 -> "1,234.50" */
export function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

/** Format an amount in the given currency (USD keeps cents, IDR is whole). */
export function fmtMoney(n: number, currency: "USD" | "IDR"): string {
  return currency === "USD" ? fmtUsd(n) : fmtIdr(n);
}

/** "2026-07-17" -> "Jul 17, 2026" */
export function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
