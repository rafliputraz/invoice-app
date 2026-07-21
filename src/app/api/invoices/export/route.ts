import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Quote a CSV field when it contains the delimiter, quotes, or newlines.
function esc(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
  const status = req.nextUrl.searchParams.get("status"); // paid|unpaid|overdue

  const where = ["deleted_at IS NULL"];
  const args: string[] = [];
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    where.push("substr(invoice_date, 1, 7) = ?");
    args.push(month);
  }
  if (status === "paid" || status === "unpaid") {
    where.push("status = ?");
    args.push(status);
  } else if (status === "overdue") {
    where.push(
      "status = 'unpaid' AND due_date IS NOT NULL AND due_date < date('now', 'localtime')"
    );
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT invoice_no, invoice_date, customer_name, total_idr, status,
              due_date, created_by
       FROM invoices WHERE ${where.join(" AND ")}
       ORDER BY invoice_date DESC, created_at DESC, id DESC`
    )
    .all(...args) as {
    invoice_no: string;
    invoice_date: string;
    customer_name: string;
    total_idr: number;
    status: string;
    due_date: string | null;
    created_by: string;
  }[];

  // Semicolon delimiter + UTF-8 BOM so Excel (Indonesian locale) opens it
  // correctly on double-click.
  const lines = [
    "Invoice No;Date;Customer;Total IDR;Status;Due Date;Created By",
    ...rows.map((r) =>
      [
        esc(r.invoice_no),
        esc(r.invoice_date),
        esc(r.customer_name),
        esc(r.total_idr),
        esc(r.status),
        esc(r.due_date),
        esc(r.created_by),
      ].join(";")
    ),
  ];
  // Leading UTF-8 BOM so Excel detects the encoding on double-click.
  const csv = "﻿" + lines.join("\r\n");

  const parts = ["invoices", month || "all"];
  if (status && ["paid", "unpaid", "overdue"].includes(status)) {
    parts.push(status);
  }
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${parts.join("-")}.csv"`,
    },
  });
}
