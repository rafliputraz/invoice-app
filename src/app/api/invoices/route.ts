import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { getDb, nextSeq } from "@/lib/db";
import { computeTotals } from "@/lib/calc";
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
              seq, year, status, due_date AS dueDate
       FROM invoices ORDER BY year DESC, seq DESC`
    )
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const data = (await req.json()) as InvoiceData;
  if (!data.invoiceDate) {
    return NextResponse.json({ error: "invoiceDate is required" }, { status: 400 });
  }
  const db = getDb();
  const year = yearOf(data.invoiceDate);
  const { total } = computeTotals(data);
  const sessionUser = await getSessionUser();
  const createdBy = sessionUser?.name || sessionUser?.username || "";

  // Transaction guarantees the sequence number is unique even with
  // concurrent saves: lookup + insert happen atomically.
  const insert = db.transaction(() => {
    const seq = nextSeq(db, year);
    const invoiceNo = formatInvoiceNo(seq, data.invoiceDate);
    const saved: InvoiceData = { ...data, invoiceNo };
    const result = db
      .prepare(
        `INSERT INTO invoices (seq, year, invoice_no, invoice_date, customer_name, total_idr, data, created_by, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        seq,
        year,
        invoiceNo,
        data.invoiceDate,
        data.invoiceTo.name,
        total,
        JSON.stringify(saved),
        createdBy,
        dueDateOf(data.invoiceDate, data.dueDays)
      );
    return { id: result.lastInsertRowid, invoiceNo };
  });

  const { id, invoiceNo } = insert();
  return NextResponse.json({ id, invoiceNo }, { status: 201 });
}
