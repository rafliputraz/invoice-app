import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getDb } from "@/lib/db";
import { computeTotals } from "@/lib/calc";
import type { InvoiceData } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  total_idr: number;
  withholding_idr: number;
  paid_at: string | null;
  amount_paid: number | null;
  bupot_no: string | null;
  status: string;
  usd_only: number;
  data: string;
};

// Column layout for the bookkeeping recap. `w` = Excel width; `money`/`rate`
// mark numeric cells so they get a number format (and can be summed).
const COLUMNS: { header: string; w: number; money?: boolean; rate?: boolean }[] = [
  { header: "NO", w: 5 },
  { header: "NO INVOICE", w: 18 },
  { header: "Tgl Inv", w: 12 },
  { header: "CUSTOMER", w: 28 },
  { header: "CONTRACT/SI NO", w: 18 },
  { header: "BL NO", w: 16 },
  { header: "ETD", w: 12 },
  { header: "VOLUME", w: 12 },
  { header: "POL", w: 16 },
  { header: "POD", w: 16 },
  { header: "Nilai Invoice", w: 16, money: true },
  { header: "PPN ( 1,2%/12% )", w: 14, money: true },
  { header: "BUKPOT 2%", w: 14, money: true },
  { header: "no BUPOT", w: 16 },
  { header: "TGL BAYAR", w: 12 },
  { header: "JUMLAH", w: 16, money: true },
  { header: "JUMLAH DIBAYAR", w: 16, money: true },
  { header: "kurang bayar", w: 14, money: true },
  { header: "kurs tengah jual beli", w: 16, rate: true },
];

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
  } else if (status === "partial") {
    // Paid but recorded cash is below the net receivable (total − withholding).
    where.push(
      "status = 'paid' AND amount_paid IS NOT NULL AND amount_paid < (total_idr - withholding_idr)"
    );
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT invoice_no, invoice_date, customer_name, total_idr, withholding_idr,
              paid_at, amount_paid, bupot_no, status, usd_only, data
       FROM invoices WHERE ${where.join(" AND ")}
       ORDER BY invoice_date ASC, seq ASC, id ASC`
    )
    .all(...args) as Row[];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Recap");
  ws.columns = COLUMNS.map((c) => ({ header: c.header, width: c.w }));

  // Header styling.
  const head = ws.getRow(1);
  head.font = { bold: true };
  head.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  // Running totals for the summary row.
  const sum = { nilai: 0, ppn: 0, bukpot: 0, jumlah: 0, dibayar: 0, kurang: 0 };

  rows.forEach((r, i) => {
    let data: InvoiceData;
    try {
      data = JSON.parse(r.data) as InvoiceData;
    } catch {
      return;
    }
    const usdOnly = !!r.usd_only;
    const t = computeTotals(data);
    const withholding = r.withholding_idr || 0;
    const net = t.total - withholding; // expected cash in
    // JUMLAH DIBAYAR: explicit amount if recorded, else default (paid -> net, else 0).
    const dibayar =
      r.amount_paid != null ? r.amount_paid : r.status === "paid" ? net : 0;
    const kurang = net - dibayar;
    const s = data.shipment ?? ({} as InvoiceData["shipment"]);
    const kurs = usdOnly ? "" : data.usesUsd ? data.exchangeRate || 0 : null;

    // USD-only rows are a different currency; keep them out of the IDR totals.
    if (!usdOnly) {
      sum.nilai += t.subtotal;
      sum.ppn += t.vat;
      sum.bukpot += withholding;
      sum.jumlah += t.total;
      sum.dibayar += dibayar;
      sum.kurang += kurang;
    }

    ws.addRow([
      i + 1,
      r.invoice_no,
      r.invoice_date,
      r.customer_name,
      s.shipmentContract ?? "",
      s.billOfLading ?? "",
      s.etd ?? "",
      s.qty ?? "",
      s.loadingPort ?? "",
      s.dischargePort ?? "",
      t.subtotal,
      usdOnly ? "" : t.vat, // PPN — n/a for USD-only
      usdOnly ? "" : withholding, // BUKPOT — n/a for USD-only
      r.bupot_no ?? "",
      r.paid_at ?? "",
      t.total,
      dibayar,
      kurang,
      kurs,
    ]);
  });

  // Summary row.
  const totalRow = ws.addRow([
    "",
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    sum.nilai,
    sum.ppn,
    sum.bukpot,
    "",
    "",
    sum.jumlah,
    sum.dibayar,
    sum.kurang,
    "",
  ]);
  totalRow.font = { bold: true };

  // Apply number formats to the money / rate columns across all data rows.
  COLUMNS.forEach((c, idx) => {
    if (!c.money && !c.rate) return;
    const col = ws.getColumn(idx + 1);
    col.numFmt = c.rate ? "#,##0.00" : "#,##0";
    col.alignment = { horizontal: "right" };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const fname = `Recap-${month || "all"}${status ? "-" + status : ""}.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
