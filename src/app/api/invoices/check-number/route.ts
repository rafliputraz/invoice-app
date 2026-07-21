import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Live check for the manual-number field: is `?no=` already used?
 * `?excludeId=` skips the invoice being edited so its own number isn't a clash.
 * Soft-deleted invoices count — they keep their number under the UNIQUE index,
 * so this mirrors the guard the POST/PUT handlers enforce on save.
 */
export async function GET(req: NextRequest) {
  const no = req.nextUrl.searchParams.get("no")?.trim() ?? "";
  const excludeId = req.nextUrl.searchParams.get("excludeId");
  if (!no) return NextResponse.json({ taken: false });

  const db = getDb();
  const row = excludeId
    ? db
        .prepare("SELECT 1 FROM invoices WHERE invoice_no = ? AND id != ?")
        .get(no, Number(excludeId))
    : db.prepare("SELECT 1 FROM invoices WHERE invoice_no = ?").get(no);
  return NextResponse.json({ taken: !!row });
}
