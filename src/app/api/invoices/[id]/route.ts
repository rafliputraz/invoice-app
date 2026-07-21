import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSeq } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { computeTotals } from "@/lib/calc";
import { dueDateOf, yearOf } from "@/lib/invoice-number";
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
  const body = (await req.json()) as InvoiceData & { manualInvoiceNo?: boolean };
  // Strip the transient flag so it never lands in the stored JSON.
  const manual = body.manualInvoiceNo === true;
  const data: InvoiceData = { ...body };
  delete (data as Partial<{ manualInvoiceNo: boolean }>).manualInvoiceNo;

  const db = getDb();
  const existing = db
    .prepare(
      "SELECT invoice_no AS invoiceNo FROM invoices WHERE id = ? AND deleted_at IS NULL"
    )
    .get(Number(id)) as { invoiceNo: string } | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // By default the number is immutable. Manual mode lets it change (correcting a
  // backfilled/old invoice), guarded by the same uniqueness rule as creation.
  const wantsNo = data.invoiceNo?.trim() ?? "";
  if (manual && wantsNo === "") {
    return NextResponse.json(
      { error: "Nomor invoice manual tidak boleh kosong" },
      { status: 400 }
    );
  }
  const changingNo = manual && wantsNo !== existing.invoiceNo;
  if (changingNo) {
    const clash = db
      .prepare("SELECT 1 FROM invoices WHERE invoice_no = ? AND id != ?")
      .get(wantsNo, Number(id));
    if (clash) {
      return NextResponse.json(
        { error: `Nomor invoice "${wantsNo}" sudah dipakai` },
        { status: 409 }
      );
    }
  }

  const invoiceNo = changingNo ? wantsNo : existing.invoiceNo;
  const saved: InvoiceData = { ...data, invoiceNo };
  const { total } = computeTotals(saved);

  if (changingNo) {
    // Keep seq/year meaningful for ordering and future auto-numbers: reuse the
    // number's leading digits, falling back to the next free seq for the year.
    const year = yearOf(saved.invoiceDate);
    const parsed = parseInt(invoiceNo, 10);
    const seq =
      Number.isFinite(parsed) && parsed > 0 ? parsed : nextSeq(db, year);
    db.prepare(
      `UPDATE invoices
       SET invoice_no = ?, seq = ?, year = ?, invoice_date = ?, customer_name = ?,
           total_idr = ?, data = ?, due_date = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(
      invoiceNo,
      seq,
      year,
      saved.invoiceDate,
      saved.invoiceTo.name,
      total,
      JSON.stringify(saved),
      dueDateOf(saved.invoiceDate, saved.dueDays),
      Number(id)
    );
  } else {
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
  }
  return NextResponse.json({ id: Number(id), invoiceNo });
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
