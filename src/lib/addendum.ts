import type Database from "better-sqlite3";
import type { InvoiceData } from "./types";

/** 1 -> "A", 26 -> "Z", 27 -> "AA" (bijective base-26). */
function indexToSuffix(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** "" -> 0, "A" -> 1, "AA" -> 27. Inverse of indexToSuffix. */
function suffixToIndex(s: string): number {
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

export interface AddendumSeed {
  invoiceNo: string;
  shipment: InvoiceData["shipment"];
  invoiceTo: InvoiceData["invoiceTo"];
}

/**
 * Seed for an additional invoice on the same B/L as `parentId`: the next
 * letter-suffixed number (028/VII/SFL/26 -> 028A -> 028B ...) plus the parent's
 * shipment and customer, since the shipment is identical and only the charges
 * differ. Returns null when the parent id doesn't exist.
 *
 * The suffix reuses the parent's numeric seq, so these addenda never consume a
 * fresh sequence number — the next plain invoice still gets 029.
 */
export function buildAddendum(
  db: Database.Database,
  parentId: number
): AddendumSeed | null {
  const parent = db
    .prepare("SELECT invoice_no AS invoiceNo, data FROM invoices WHERE id = ?")
    .get(parentId) as { invoiceNo: string; data: string } | undefined;
  if (!parent) return null;

  // Split "028A/VII/SFL/26" -> head "028A", tail "VII/SFL/26"; digits "028".
  const slash = parent.invoiceNo.indexOf("/");
  const head = slash === -1 ? parent.invoiceNo : parent.invoiceNo.slice(0, slash);
  const tail = slash === -1 ? "" : parent.invoiceNo.slice(slash + 1);
  const digits = head.match(/^\d+/)?.[0] ?? head;

  // Highest suffix among siblings sharing the same digits + tail (base = "").
  const re = new RegExp(
    `^${digits}([A-Z]*)/${tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`
  );
  const rows = db
    .prepare(
      "SELECT invoice_no AS invoiceNo FROM invoices WHERE invoice_no LIKE ?"
    )
    .all(`${digits}%/${tail}`) as { invoiceNo: string }[];
  let maxIdx = 0;
  for (const r of rows) {
    const m = re.exec(r.invoiceNo);
    if (m) maxIdx = Math.max(maxIdx, suffixToIndex(m[1]));
  }

  const invoiceNo = `${digits}${indexToSuffix(maxIdx + 1)}/${tail}`;
  const pdata = JSON.parse(parent.data) as InvoiceData;
  return { invoiceNo, shipment: pdata.shipment, invoiceTo: pdata.invoiceTo };
}
