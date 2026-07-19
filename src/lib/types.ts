export type Currency = "USD" | "IDR";

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
  shipment: {
    billOfLading: string;
    loadingPort: string;
    dischargePort: string;
    shipmentContract: string;
    vesselVoyage: string;
    etd: string;
    qty: string; // e.g. "2 x 20GP"
  };

  items: LineItem[];

  exchangeRate: number; // IDR per USD 1
  paymentTerms: string;
  /** Payment term in days from invoiceDate; due date is derived from this. */
  dueDays?: number;

  vatEnabled: boolean;
  vatLabel: string; // e.g. "@10%*11/12*12%"

  termsLines: string[];

  /** Name under the signature area; falls back to company.name when absent. */
  signatureName?: string;

  bankIdr: BankAccount;
  bankUsd: BankAccount;
}

export type InvoiceStatus = "paid" | "unpaid";

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
