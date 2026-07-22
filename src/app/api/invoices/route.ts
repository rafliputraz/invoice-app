import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getDb, nextSeq } from "@/lib/db";
import { computeTotals, WITHHOLDING_DEFAULT_RATE } from "@/lib/calc";
import { dueDateOf, formatInvoiceNo, yearOf } from "@/lib/invoice-number";
import type { InvoiceData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, invoice_no AS invoiceNo, invoice_date AS invoiceDate,
              customer_name AS customerName, total_idr AS totalIdr,
              created_at AS createdAt, created_by AS createdBy,
              seq, year, status, due_date AS dueDate,
              withholding_idr AS withholdingIdr,
              paid_at AS paidAt, amount_paid AS amountPaid, bupot_no AS bupotNo,
              usd_only AS usdOnly, data
       FROM invoices WHERE deleted_at IS NULL
       ORDER BY invoice_date DESC, created_at DESC, id DESC`
    )
    .all() as Array<{
    totalIdr: number;
    withholdingIdr: number;
    usdOnly: number;
    data: string;
  }>;
  const list = rows.map(({ data, ...row }) => {
    // The paid dialog needs the DPP (subtotal) to compute the PPh cut live,
    // plus the stored rate as its default.
    let subtotalIdr = row.totalIdr;
    let withholdingRate = WITHHOLDING_DEFAULT_RATE;
    try {
      const parsed = JSON.parse(data) as InvoiceData;
      subtotalIdr = computeTotals(parsed).subtotal;
      withholdingRate = parsed.withholdingRate ?? WITHHOLDING_DEFAULT_RATE;
    } catch {
      // malformed data JSON — fall back to totals
    }
    return {
      ...row,
      usdOnly: !!row.usdOnly,
      subtotalIdr,
      withholdingRate,
      netReceivedIdr: row.totalIdr - row.withholdingIdr,
    };
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as InvoiceData & { manualInvoiceNo?: boolean };
  if (!body.invoiceDate) {
    return NextResponse.json({ error: "invoiceDate is required" }, { status: 400 });
  }
  // Manual mode: caller supplies the number verbatim (backfilling old/backlog
  // invoices). Strip the transient flag so it never lands in the stored JSON.
  const manual = body.manualInvoiceNo === true;
  const data: InvoiceData = { ...body };
  delete (data as Partial<{ manualInvoiceNo: boolean }>).manualInvoiceNo;
  if (manual && !data.invoiceNo.trim()) {
    return NextResponse.json(
      { error: "Nomor invoice manual tidak boleh kosong" },
      { status: 400 }
    );
  }

  const db = getDb();
  const year = yearOf(data.invoiceDate);
  const { total, withholding } = computeTotals(data);
  const sessionUser = await getSessionUser();
  const createdBy = sessionUser?.name || sessionUser?.username || "";

  // Transaction guarantees the sequence number is unique even with
  // concurrent saves: lookup + insert happen atomically.
  const insert = db.transaction(() => {
    let seq: number;
    let invoiceNo: string;
    if (manual) {
      invoiceNo = data.invoiceNo.trim();
      // Reuse the number's leading digits as the stored seq so per-year MAX(seq)
      // — and future auto-numbers — still account for backfilled rows.
      const parsed = parseInt(invoiceNo, 10);
      seq = Number.isFinite(parsed) && parsed > 0 ? parsed : nextSeq(db, year);
      const clash = db
        .prepare("SELECT 1 FROM invoices WHERE invoice_no = ?")
        .get(invoiceNo);
      if (clash) throw new Error("DUPLICATE_INVOICE_NO");
    } else {
      seq = nextSeq(db, year);
      invoiceNo = formatInvoiceNo(seq, data.invoiceDate);
    }
    const saved: InvoiceData = { ...data, invoiceNo };
    const result = db
      .prepare(
        `INSERT INTO invoices (seq, year, invoice_no, invoice_date, customer_name, total_idr, withholding_idr, usd_only, data, created_by, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        seq,
        year,
        invoiceNo,
        data.invoiceDate,
        data.invoiceTo.name,
        total,
        withholding,
        data.usdOnly ? 1 : 0,
        JSON.stringify(saved),
        createdBy,
        dueDateOf(data.invoiceDate, data.dueDays)
      );

    const id = Number(result.lastInsertRowid);
    return { id, invoiceNo };
  });

  try {
    const { id, invoiceNo } = insert();
    return NextResponse.json({ id, invoiceNo }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "DUPLICATE_INVOICE_NO") {
      return NextResponse.json(
        { error: `Nomor invoice "${data.invoiceNo.trim()}" sudah dipakai` },
        { status: 409 }
      );
    }
    throw err;
  }
}
