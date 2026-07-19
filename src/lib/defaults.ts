import type { BankAccount, InvoiceData } from "./types";

/** Default signer name, configurable via .env.local (NEXT_PUBLIC_DEFAULT_SIGNER). */
export const DEFAULT_SIGNER =
  process.env.NEXT_PUBLIC_DEFAULT_SIGNER ?? "PT. SALAM FORTUNA LOGISTIK";

/** Default bank accounts, configurable via .env.local (NEXT_PUBLIC_BANK_*). */
export const DEFAULT_BANK_IDR: BankAccount = {
  bank: process.env.NEXT_PUBLIC_BANK_IDR_NAME ?? "Bank CIMB Niaga Malahayati",
  accNo: process.env.NEXT_PUBLIC_BANK_IDR_ACC_NO ?? "",
  accName: process.env.NEXT_PUBLIC_BANK_IDR_ACC_NAME ?? "",
};

export const DEFAULT_BANK_USD: BankAccount = {
  bank: process.env.NEXT_PUBLIC_BANK_USD_NAME ?? "Bank CIMB Niaga Malahayati",
  accNo: process.env.NEXT_PUBLIC_BANK_USD_ACC_NO ?? "",
  accName: process.env.NEXT_PUBLIC_BANK_USD_ACC_NAME ?? "",
};

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function defaultInvoice(): InvoiceData {
  return {
    invoiceNo: "",
    invoiceDate: todayIso(),
    copyLabel: "ORIGINAL",
    invoicedBy: "",
    template: "ledger",
    company: {
      name: "PT. SALAM FORTUNA LOGISTIK",
      addressLines: [
        "Citra Garden C11 No. 33",
        "Jalan Dr. Setiabudi, Bandar Lampung",
        "Kode Pos 35233",
      ],
      mobile: "+62 8127939286",
    },
    invoiceTo: {
      name: "",
      addressLines: ["", "", ""],
      taxId: "",
    },
    shipment: {
      billOfLading: "",
      loadingPort: "",
      dischargePort: "",
      shipmentContract: "",
      vesselVoyage: "",
      etd: "",
      qty: "",
    },
    items: [
      { description: "", currency: "USD", unitPrice: 0, qty: 1 },
      {
        description: "Doc Fee",
        currency: "IDR",
        unitPrice: 100000,
        qty: 1,
        pinned: true,
      },
      {
        description: "Adm Fee",
        currency: "IDR",
        unitPrice: 425000,
        qty: 1,
        pinned: true,
      },
    ],
    exchangeRate: 0,
    paymentTerms: "Cash",
    vatEnabled: true,
    vatLabel: "@10%*11/12*12%",
    termsLines: [
      "All Invoices are due upon presentation.",
      "Invoices not paid within 30 days from the date of invoices will carry an interest of 3% per month.",
      "All transactions are subjects to the Company's Standar Trading Conditions",
      "(copies available on request from the Company) and which, in certain cases, exclude",
      "or limit the Company liability.",
    ],
    signatureName: DEFAULT_SIGNER,
    bankIdr: { ...DEFAULT_BANK_IDR },
    bankUsd: { ...DEFAULT_BANK_USD },
  };
}
