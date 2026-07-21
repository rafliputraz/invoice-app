export type Currency = "USD" | "IDR";

/**
 * VAT formula for the invoice:
 * - "reduced": 10% × 11/12 × 12% = 1.1%
 * - "full":    11/12 × 12%       = 11%
 */
export type VatVariant = "reduced" | "full";

export type TemplateId = "classic" | "modern" | "band" | "ledger";

export interface LineItem {
  description: string;
  currency: Currency;
  unitPrice: number;
  qty: number;
  /** Pinned rows (Doc Fee, Adm Fee) always stay at the bottom of the list. */
  pinned?: boolean;
}

export interface BankAccount {
  bank: string;
  accNo: string;
  accName: string;
}

/** Shipment leg shown on the invoice. */
export interface ShipmentDetails {
  billOfLading: string;
  loadingPort: string;
  dischargePort: string;
  shipmentContract: string;
  vesselVoyage: string;
  etd: string;
  qty: string; // e.g. "2 x 20GP"
}

export interface InvoiceData {
  // header / identity
  invoiceNo: string;
  invoiceDate: string; // ISO yyyy-mm-dd
  copyLabel: string; // ORIGINAL / COPY
  invoicedBy?: string; // shown on the invoice only when filled
  template?: TemplateId; // invoice design; defaults to "classic"

  // company (prefilled defaults, editable)
  company: {
    name: string;
    addressLines: string[];
    mobile: string;
  };

  // customer
  invoiceTo: {
    name: string;
    addressLines: string[];
    taxId: string;
  };

  // shipment details
  shipment: ShipmentDetails;

  items: LineItem[];

  exchangeRate: number; // IDR per USD 1
  /**
   * Whether this invoice uses a USD exchange rate. When false it is IDR-only:
   * the rate-of-exchange line and USD bank block are hidden so the document
   * doesn't show a meaningless "1 USD = 0 IDR".
   */
  usesUsd?: boolean;
  paymentTerms: string;
  /** Payment term in days from invoiceDate; due date is derived from this. */
  dueDays?: number;

  vatEnabled: boolean;
  /** Which VAT formula to apply; defaults to "reduced" (1.1%) for old invoices. */
  vatVariant?: VatVariant;
  vatLabel: string; // display label, kept in sync with vatVariant e.g. "@10%*11/12*12%"

  termsLines: string[];

  /** Name under the signature area; falls back to company.name when absent. */
  signatureName?: string;

  bankIdr: BankAccount;
  bankUsd: BankAccount;
}

export type InvoiceStatus = "paid" | "unpaid";

/** Saved customer master data, used to prefill the invoice form. */
export interface CustomerMaster {
  id: number;
  name: string;
  addressLines: string[];
  taxId: string;
}

export interface InvoiceListItem {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  totalIdr: number;
  createdAt: string;
  createdBy?: string;
  seq: number;
  year: number;
  status: InvoiceStatus;
  dueDate: string | null;
}
