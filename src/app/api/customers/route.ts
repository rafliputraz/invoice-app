import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT customer_name AS customerName,
              COUNT(*) AS invoiceCount,
              SUM(total_idr) AS totalIdr,
              SUM(CASE WHEN status = 'unpaid' THEN total_idr ELSE 0 END)
                AS outstandingIdr,
              SUM(CASE WHEN status = 'unpaid' AND due_date IS NOT NULL
                        AND due_date < date('now', 'localtime')
                  THEN total_idr ELSE 0 END) AS overdueIdr,
              MAX(invoice_date) AS lastInvoiceDate
       FROM invoices
       WHERE deleted_at IS NULL
       GROUP BY customer_name
       ORDER BY outstandingIdr DESC, totalIdr DESC`
    )
    .all();
  return NextResponse.json(rows);
}
