# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences of roughly equal weight, both inside PT. Salam Fortuna Logistik:

- **Admin / finance staff (desktop).** Issue invoices, key in shipment and line-item
  data, print or export them, and record payments as they land. This is repetitive,
  keyboard-heavy data entry done many times a day at an office PC.
- **Owner / management (mobile and desktop).** Check what is outstanding, what is
  overdue, and how much cash actually came in. Read-mostly, often on a phone.

Roles in the system are `admin` and `member`; only `admin` sees Users and Trash.

## Product Purpose

An internal system of record for the company's freight invoices. It creates a
correctly numbered, correctly taxed invoice document, prints it to A4 for the
customer, and then tracks that invoice through to the cash actually received.
Success is that every invoice issued is accounted for and nothing overdue goes
unnoticed.

## Positioning

Not a general invoicing SaaS. It encodes this company's specific billing reality:
Indonesian tax handling and sea-freight shipment fields sit in the document
itself, and invoice numbering follows the company's own per-year sequence.

## Operating Context

- **Indonesian tax mechanics are part of the document, not an afterthought.**
  PPN (VAT) has two formulas — `reduced` (10% × 11/12 × 12% = 1.1%) and `full`
  (11/12 × 12% = 11%). PPh withholding (default 2% of DPP) is cut *by the customer*
  and is therefore recorded at payment time, not at invoice time, together with the
  bukti potong (BUPOT) number.
- **Cash received ≠ invoice total.** Net expected = total − PPh. The amount actually
  banked is recorded separately, so an invoice can be marked paid yet still be short
  (partial). This gap is the core thing management watches.
- **Dual currency.** Invoices are IDR with a USD exchange rate, IDR-only, or USD-only.
  USD-only invoices carry no tax and cannot be summed with rupiah totals.
- **Sea-freight shipment data** rides on the invoice: bill of lading, loading and
  discharge port, shipment contract, vessel/voyage, ETD, and container quantity.
- **Amounts are spelled out in words** (terbilang) on the printed document.
- Payment terms are a day count from the invoice date; the due date derives from it.

## Capabilities and Constraints

- Invoice create / edit / print / PDF export, per-year sequential numbering with
  collision checks, soft delete to Trash with restore, CSV-Excel export honoring the
  active month and status filters.
- Customer master data that prefills the invoice form; user administration;
  password change; idle auto-logout; a guided first-run tour.
- Four printed templates (`ledger` is the house style, plus `classic`, `modern`,
  `band`), switchable per invoice.
- Stack: Next.js 15 App Router, React 19, Tailwind CSS v4, better-sqlite3, jose for
  auth cookies, jsPDF + html2canvas-pro for PDF, exceljs for export.
- **Constraint — printed output is frozen.** The four templates under
  `src/components/templates/` produce the document customers and tax authorities
  receive. Redesign work does not change them.
- **Decision (2026-08-05):** app chrome copy standardizes to English. Printed
  template wording is unaffected.

## Brand Commitments

- Legal name **PT. Salam Fortuna Logistik**, shortened to **SFL** in the app.
- Logo asset at `public/logo-sfl.png`; app icon at `src/app/icon.png`.
- No brand palette, typeface, or style guide has been supplied — colors and type in
  the incumbent build are unattributed defaults, not brand commitments.

## Evidence on Hand

Real production data lives in the local SQLite database (invoice history, customer
master, users). There are no testimonials, case studies, benchmarks, or marketing
claims associated with this product, and none may be invented — it is an internal
tool with no public-facing surface.

## Product Principles

1. **The number is the interface.** Amounts, due dates, and shortfalls are what
   users come for; chrome must never compete with them.
2. **Overdue and short-paid must be impossible to miss** on either device.
3. **Entry is repetitive work** — favor speed, keyboard reach, and low friction over
   ceremony.
4. **The printed document is the contract.** The app may change freely; the paper
   may not.
5. **Never imply certainty the data lacks** — unrecorded payment amounts, missing
   due dates, and USD/IDR sums that cannot be combined stay visibly distinct.

## Accessibility & Inclusion

No formal standard was established. Practical needs: legible dense numeric tables,
usable on a phone, and status never communicated by color alone (overdue, partial,
and paid must each carry a text or shape cue).
