import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { computeTotals } from "@/lib/calc";
import { dueDateOf } from "@/lib/invoice-number";
import type { InvoiceData } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const row = db
    .prepare("SELECT id, data FROM invoices WHERE id = ?")
    .get(Number(id)) as { id: number; data: string } | undefined;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: row.id, ...JSON.parse(row.data) });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const data = (await req.json()) as InvoiceData;
  const db = getDb();
  const existing = db
    .prepare(
      "SELECT invoice_no AS invoiceNo FROM invoices WHERE id = ? AND deleted_at IS NULL"
    )
    .get(Number(id)) as { invoiceNo: string } | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // The invoice number is immutable once assigned — keeps numbering gap-free.
  const saved: InvoiceData = { ...data, invoiceNo: existing.invoiceNo };
  const { total } = computeTotals(saved);
  db.prepare(
    `UPDATE invoices
     SET invoice_date = ?, customer_name = ?, total_idr = ?, data = ?,
         due_date = ?, updated_at = datetime('now', 'localtime')
     WHERE id = ?`
  ).run(
    saved.invoiceDate,
    saved.invoiceTo.name,
    total,
    JSON.stringify(saved),
    dueDateOf(saved.invoiceDate, saved.dueDays),
    Number(id)
  );
  return NextResponse.json({ id: Number(id), invoiceNo: existing.invoiceNo });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { status } = (await req.json()) as { status?: string };
  if (status !== "paid" && status !== "unpaid") {
    return NextResponse.json(
      { error: "status must be 'paid' or 'unpaid'" },
      { status: 400 }
    );
  }
  const db = getDb();
  const result = db
    .prepare(
      `UPDATE invoices
       SET status = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ? AND deleted_at IS NULL`
    )
    .run(status, Number(id));
  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: Number(id), status });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  // ?permanent=1 (admin only) really deletes; default moves to the trash.
  if (req.nextUrl.searchParams.get("permanent") === "1") {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    db.prepare("DELETE FROM invoices WHERE id = ?").run(Number(id));
    return NextResponse.json({ ok: true });
  }

  const result = db
    .prepare(
      `UPDATE invoices SET deleted_at = datetime('now', 'localtime')
       WHERE id = ? AND deleted_at IS NULL`
    )
    .run(Number(id));
  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
