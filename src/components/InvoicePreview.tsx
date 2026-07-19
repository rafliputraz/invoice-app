"use client";

import type { InvoiceData, TemplateId } from "@/lib/types";
import ClassicTemplate from "./templates/ClassicTemplate";
import ModernTemplate from "./templates/ModernTemplate";
import BandTemplate from "./templates/BandTemplate";
import LedgerTemplate from "./templates/LedgerTemplate";

const TEMPLATES: Record<TemplateId, React.ComponentType<{ data: InvoiceData }>> =
  {
    classic: ClassicTemplate,
    modern: ModernTemplate,
    band: BandTemplate,
    ledger: LedgerTemplate,
  };

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  classic: "Classic (SFL paper)",
  modern: "Modern Minimal",
  band: "Bold Header Band",
  ledger: "Carrier Ledger",
};

export default function InvoicePreview({ data }: { data: InvoiceData }) {
  // Carrier Ledger is the house style; older invoices saved without a
  // template also render with it (switchable per invoice in the form).
  const Template = TEMPLATES[data.template ?? "ledger"] ?? LedgerTemplate;
  return <Template data={data} />;
}
