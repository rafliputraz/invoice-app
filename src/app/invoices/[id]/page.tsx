import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import type { InvoiceData } from "@/lib/types";
import InvoiceEditor from "@/components/InvoiceEditor";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const { print } = await searchParams;
  const db = getDb();
  const row = db
    .prepare("SELECT id, data FROM invoices WHERE id = ?")
    .get(Number(id)) as { id: number; data: string } | undefined;
  if (!row) notFound();

  const data = JSON.parse(row.data) as InvoiceData;
  return (
    <InvoiceEditor
      invoiceId={row.id}
      initialData={data}
      autoPrint={print === "1"}
    />
  );
}
