import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
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
  try {
    const result = db
      .prepare(
        `UPDATE customers
         SET name = ?, address_lines = ?, tax_id = ?,
             updated_at = datetime('now', 'localtime')
         WHERE id = ?`
      )
      .run(name, JSON.stringify(addressLines), body.taxId?.trim() ?? "", Number(id));
    if (result.changes === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch {
    // UNIQUE(name) violation — renamed to a name that already exists.
    return NextResponse.json(
      { error: "Customer dengan nama itu sudah ada" },
      { status: 409 }
    );
  }
  return NextResponse.json({ id: Number(id), name });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();
  const result = db
    .prepare("DELETE FROM customers WHERE id = ?")
    .run(Number(id));
  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
