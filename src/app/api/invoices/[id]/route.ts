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
  const { total, withholding } = computeTotals(saved);

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
           total_idr = ?, withholding_idr = ?, usd_only = ?, data = ?, due_date = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(
      invoiceNo,
      seq,
      year,
      saved.invoiceDate,
      saved.invoiceTo.name,
      total,
      withholding,
      saved.usdOnly ? 1 : 0,
      JSON.stringify(saved),
      dueDateOf(saved.invoiceDate, saved.dueDays),
      Number(id)
    );
  } else {
    db.prepare(
      `UPDATE invoices
       SET invoice_date = ?, customer_name = ?, total_idr = ?, withholding_idr = ?, usd_only = ?, data = ?,
           due_date = ?, updated_at = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(
      saved.invoiceDate,
      saved.invoiceTo.name,
      total,
      withholding,
      saved.usdOnly ? 1 : 0,
      JSON.stringify(saved),
      dueDateOf(saved.invoiceDate, saved.dueDays),
      Number(id)
    );
  }
  return NextResponse.json({ id: Number(id), invoiceNo });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as {
    status?: string;
    paidAt?: string | null;
    amountPaid?: number | null;
    bupotNo?: string | null;
    withholdingEnabled?: boolean;
    withholdingRate?: number;
  };
  const { status } = body;
  if (status !== "paid" && status !== "unpaid") {
    return NextResponse.json(
      { error: "status must be 'paid' or 'unpaid'" },
      { status: 400 }
    );
  }

  const db = getDb();
  const row = db
    .prepare("SELECT data FROM invoices WHERE id = ? AND deleted_at IS NULL")
    .get(Number(id)) as { data: string } | undefined;
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (status === "paid") {
    // Capture the payment record. All fields are optional; amount_paid is left
    // NULL when not supplied (the recap then defaults it to the net receivable).
    const paidAt =
      typeof body.paidAt === "string" && body.paidAt.trim()
        ? body.paidAt.trim()
        : null;
    // Keep the exact figure (USD invoices carry cents); rounding it could push a
    // full payment below the net and wrongly flag the invoice as "Partial".
    const amountPaid =
      typeof body.amountPaid === "number" && body.amountPaid >= 0
        ? body.amountPaid
        : null;
    const bupotNo =
      typeof body.bupotNo === "string" && body.bupotNo.trim()
        ? body.bupotNo.trim()
        : null;

    // PPh is decided in the paid dialog. Persist the flag/rate into the data
    // JSON (so a later PUT/save recomputes the same figure) and refresh the
    // denormalized withholding_idr from it. USD-only invoices carry no tax.
    const data = JSON.parse(row.data) as InvoiceData;
    if (typeof body.withholdingEnabled === "boolean" && !data.usdOnly) {
      data.withholdingEnabled = body.withholdingEnabled;
      if (
        typeof body.withholdingRate === "number" &&
        body.withholdingRate >= 0 &&
        body.withholdingRate < 1
      ) {
        data.withholdingRate = body.withholdingRate;
      }
    }
    const { withholding } = computeTotals(data);
    db.prepare(
      `UPDATE invoices
       SET status = 'paid', paid_at = ?, amount_paid = ?, bupot_no = ?,
           withholding_idr = ?, data = ?,
           updated_at = datetime('now', 'localtime')
       WHERE id = ? AND deleted_at IS NULL`
    ).run(
      paidAt,
      amountPaid,
      bupotNo,
      withholding,
      JSON.stringify(data),
      Number(id)
    );
  } else {
    // Reverting to unpaid clears the whole payment record — including the PPh
    // cut, which is part of the payment (it is re-entered on the next paid).
    const data = JSON.parse(row.data) as InvoiceData;
    data.withholdingEnabled = false;
    db.prepare(
      `UPDATE invoices
       SET status = 'unpaid', paid_at = NULL, amount_paid = NULL, bupot_no = NULL,
           withholding_idr = 0, data = ?,
           updated_at = datetime('now', 'localtime')
       WHERE id = ? AND deleted_at IS NULL`
    ).run(JSON.stringify(data), Number(id));
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
