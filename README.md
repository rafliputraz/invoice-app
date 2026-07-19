# SFL Invoice App

Invoice generator for PT. Salam Fortuna Logistik. Split-screen editor: fill the form on the left, see the invoice update in realtime on the right.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## What's automated

- **Invoice number** — `028/VII/SFL/26` format: sequence auto-increments per year (checked against the database so numbers are never reused), month as Roman numeral, `SFL` fixed, 2-digit year. Assigned server-side on save.
- **Currency conversion** — USD line items are converted to IDR using the exchange rate you enter; IDR items pass through unchanged.
- **Totals** — Total (Excl. VAT), VAT Charges (10% × 11/12 × 12% = 1,1%, truncated to whole rupiah), Total (Incl. VAT).
- **Amount in words** — the "Pay :" line is generated from the grand total.

## Printing

Click **Print / PDF** in the editor — only the invoice prints (A4). Use the browser's "Save as PDF" destination to export a PDF.

## Data

Invoices are stored in SQLite at `data/invoices.db` (created automatically). Back this file up to keep your invoice history and numbering.
