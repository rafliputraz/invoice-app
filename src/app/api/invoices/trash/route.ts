import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, invoice_no AS invoiceNo, invoice_date AS invoiceDate,
              customer_name AS customerName, total_idr AS totalIdr,
              deleted_at AS deletedAt
       FROM invoices WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC`
    )
    .all();
  return NextResponse.json(rows);
}
