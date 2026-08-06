import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  // USD-only invoices store their USD amount in total_idr, so the two
  // currencies must never be added together. Each figure is summed twice —
  // once over rupiah invoices, once over USD-only ones — and reported apart,
  // the same way the register's title block does it.
  const rows = db
    .prepare(
      `SELECT customer_name AS customerName,
              COUNT(*) AS invoiceCount,
              SUM(CASE WHEN usd_only = 0 THEN total_idr ELSE 0 END) AS totalIdr,
              SUM(CASE WHEN usd_only = 1 THEN total_idr ELSE 0 END) AS totalUsd,
              SUM(CASE WHEN usd_only = 0 AND status = 'unpaid'
                  THEN total_idr ELSE 0 END) AS outstandingIdr,
              SUM(CASE WHEN usd_only = 1 AND status = 'unpaid'
                  THEN total_idr ELSE 0 END) AS outstandingUsd,
              SUM(CASE WHEN usd_only = 0 AND status = 'unpaid'
                        AND due_date IS NOT NULL
                        AND due_date < date('now', 'localtime')
                  THEN total_idr ELSE 0 END) AS overdueIdr,
              SUM(CASE WHEN usd_only = 1 AND status = 'unpaid'
                        AND due_date IS NOT NULL
                        AND due_date < date('now', 'localtime')
                  THEN total_idr ELSE 0 END) AS overdueUsd,
              MAX(invoice_date) AS lastInvoiceDate
       FROM invoices
       WHERE deleted_at IS NULL
       GROUP BY customer_name
       ORDER BY outstandingIdr DESC, outstandingUsd DESC, totalIdr DESC`
    )
    .all();
  return NextResponse.json(rows);
}
