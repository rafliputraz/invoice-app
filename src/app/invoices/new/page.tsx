import InvoiceEditor from "@/components/InvoiceEditor";
import { getDb } from "@/lib/db";
import { defaultInvoice } from "@/lib/defaults";
import { buildAddendum } from "@/lib/addendum";

export const dynamic = "force-dynamic";

/**
 * ?addendum=<parentId> creates an additional invoice on an existing B/L: the
 * number is auto-suffixed (028 -> 028A) and shipment/customer are copied from
 * the parent. Without it, a plain new invoice. The choice is made in the
 * "New Invoice" chooser before landing here.
 */
export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ addendum?: string }>;
}) {
  const { addendum } = await searchParams;
  if (!addendum) return <InvoiceEditor />;

  const seed = buildAddendum(getDb(), Number(addendum));
  // Unknown parent: fall back to a blank invoice rather than erroring.
  if (!seed) return <InvoiceEditor />;

  return (
    <InvoiceEditor
      addendum
      initialData={{
        ...defaultInvoice(),
        invoiceNo: seed.invoiceNo,
        shipment: seed.shipment,
        invoiceTo: seed.invoiceTo,
      }}
    />
  );
}
