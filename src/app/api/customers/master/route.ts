import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { CustomerMaster } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, address_lines AS addressLines, tax_id AS taxId
       FROM customers ORDER BY name COLLATE NOCASE`
    )
    .all() as { id: number; name: string; addressLines: string; taxId: string }[];
  const customers: CustomerMaster[] = rows.map((r) => ({
    ...r,
    addressLines: JSON.parse(r.addressLines) as string[],
  }));
  return NextResponse.json(customers);
}

// Upsert by name: saving the same customer again updates address/tax id.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    addressLines?: string[];
    taxId?: string;
  };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const addressLines = Array.isArray(body.addressLines)
    ? body.addressLines.map((l) => String(l))
    : [];
  const db = getDb();
  db.prepare(
    `INSERT INTO customers (name, address_lines, tax_id)
     VALUES (?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       address_lines = excluded.address_lines,
       tax_id = excluded.tax_id,
       updated_at = datetime('now', 'localtime')`
  ).run(name, JSON.stringify(addressLines), body.taxId?.trim() ?? "");
  const row = db
    .prepare("SELECT id FROM customers WHERE name = ?")
    .get(name) as { id: number };
  return NextResponse.json({ id: row.id, name }, { status: 201 });
}
