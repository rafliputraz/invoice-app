import { NextRequest, NextResponse } from "next/server";
import { getDb, nextSeq } from "@/lib/db";
import { formatInvoiceNo, yearOf } from "@/lib/invoice-number";

export const dynamic = "force-dynamic";

/** Preview the next invoice number for a given date (?date=yyyy-mm-dd). */
export async function GET(req: NextRequest) {
  const date =
    req.nextUrl.searchParams.get("date") ||
    new Date().toISOString().slice(0, 10);
  const db = getDb();
  const seq = nextSeq(db, yearOf(date));
  return NextResponse.json({ invoiceNo: formatInvoiceNo(seq, date), seq });
}
