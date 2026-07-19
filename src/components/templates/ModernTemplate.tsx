"use client";

import type { InvoiceData } from "@/lib/types";
import { itemAmountIdr } from "@/lib/calc";
import { fmtIdr, fmtNum, fmtDate } from "@/lib/format";
import { amountInWords } from "@/lib/terbilang";
import { invoiceComputed } from "./shared";

function MiniLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[7.5pt] font-semibold uppercase tracking-[0.15em] text-neutral-400">
      {children}
    </div>
  );
}

/** Clean, airy layout with a red accent — modern studio look. */
export default function ModernTemplate({ data }: { data: InvoiceData }) {
  const { totals, visibleItems, perCurrency, signer } = invoiceComputed(data);

  return (
    <div
      id="invoice-print"
      className="mx-auto w-[194mm] shrink-0 bg-white p-[10mm] font-[Arial,Helvetica,sans-serif] text-[10pt] leading-relaxed text-neutral-900"
    >
      {/* ===== Header ===== */}
      <div className="flex items-start justify-between border-b-2 border-red-600 pb-4">
        <div>
          <div className="text-[14pt] font-bold tracking-tight">
            {data.company.name}
          </div>
          <div className="mt-1 text-[8.5pt] leading-snug text-neutral-500">
            {data.company.addressLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            <div>Mobile: {data.company.mobile}</div>
          </div>
        </div>
        <img src="/logo-sfl.png" alt="SFL logo" className="h-16 w-auto" />
      </div>

      {/* ===== Invoice meta ===== */}
      <div className="flex items-end justify-between pt-5">
        <div>
          <div className="text-[22pt] font-light tracking-[0.25em]">INVOICE</div>
          <div className="text-[12pt] font-bold text-red-600">
            {data.invoiceNo}
          </div>
        </div>
        <div className="text-right text-[9pt]">
          <div className="text-[8pt] uppercase tracking-widest text-neutral-400">
            {data.copyLabel}
          </div>
          <div className="font-medium">{fmtDate(data.invoiceDate)}</div>
          {!!data.invoicedBy?.trim() && (
            <div className="text-neutral-500">
              Invoiced by {data.invoicedBy}
            </div>
          )}
        </div>
      </div>

      {/* ===== Billed to + shipment ===== */}
      <div className="grid grid-cols-2 gap-8 pt-6">
        <div>
          <MiniLabel>Billed to</MiniLabel>
          <div className="font-bold">{data.invoiceTo.name}</div>
          <div className="text-[9pt] text-neutral-600">
            {data.invoiceTo.addressLines
              .filter((l) => l.trim() !== "")
              .map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            {data.invoiceTo.taxId && <div>Tax ID {data.invoiceTo.taxId}</div>}
          </div>
        </div>
        <div>
          <MiniLabel>Shipment</MiniLabel>
          <div className="text-[9pt] text-neutral-600">
            {data.shipment.billOfLading && (
              <div>B/L {data.shipment.billOfLading}</div>
            )}
            {(data.shipment.loadingPort || data.shipment.dischargePort) && (
              <div>
                {data.shipment.loadingPort} → {data.shipment.dischargePort}
              </div>
            )}
            {data.shipment.vesselVoyage && (
              <div>Vessel {data.shipment.vesselVoyage}</div>
            )}
            {data.shipment.etd && <div>ETD {fmtDate(data.shipment.etd)}</div>}
            {data.shipment.shipmentContract && (
              <div>Contract {data.shipment.shipmentContract}</div>
            )}
            {data.shipment.qty && <div>Qty {data.shipment.qty}</div>}
          </div>
        </div>
      </div>

      {/* ===== Items ===== */}
      <table className="mt-6 w-full">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-[7.5pt] uppercase tracking-[0.15em] text-neutral-400">
            <th className="pb-1 font-semibold">Description</th>
            <th className="pb-1 font-semibold">Curr</th>
            <th className="pb-1 text-right font-semibold">Price</th>
            <th className="pb-1 text-center font-semibold">Qty</th>
            <th className="pb-1 text-right font-semibold">Amount (IDR)</th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item, i) => (
            <tr key={i} className="border-b border-neutral-100">
              <td className="w-[42%] py-1.5">{item.description}</td>
              <td className="w-[10%] py-1.5 text-neutral-500">
                {item.currency}
              </td>
              <td className="w-[15%] py-1.5 text-right">
                {fmtNum(item.unitPrice)}
              </td>
              <td className="w-[10%] py-1.5 text-center text-neutral-500">
                {item.qty}
              </td>
              <td className="w-[23%] py-1.5 text-right font-medium">
                {fmtIdr(itemAmountIdr(item, data.exchangeRate))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== Rates + totals ===== */}
      <div className="flex justify-between pt-4">
        <div className="text-[8.5pt] text-neutral-500">
          <div>
            Exch Rate : IDR {fmtNum(data.exchangeRate)} / USD 1
          </div>
          <div>
            Payment terms :{" "}
            <span className="font-semibold text-neutral-700">
              {data.paymentTerms}
            </span>
          </div>
          {(perCurrency.usd > 0 || perCurrency.idr > 0) && (
            <div className="mt-2">
              <MiniLabel>Currency charge totals</MiniLabel>
              {perCurrency.usd > 0 && <div>USD {fmtNum(perCurrency.usd)}</div>}
              {perCurrency.idr > 0 && <div>IDR {fmtIdr(perCurrency.idr)}</div>}
            </div>
          )}
        </div>
        <div className="w-[72mm] text-[9.5pt]">
          <div className="flex justify-between py-1">
            <span className="text-neutral-500">Total (Excl. VAT)</span>
            <span>IDR {fmtIdr(totals.subtotal)}</span>
          </div>
          {data.vatEnabled && (
            <div className="flex justify-between border-b border-neutral-200 py-1">
              <span className="text-neutral-500">
                VAT {data.vatLabel}
              </span>
              <span>IDR {fmtIdr(totals.vat)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-l-4 border-red-600 bg-neutral-50 py-2 pl-3 pr-1 text-[11pt] font-bold">
            <span>Total (Incl. VAT)</span>
            <span>IDR {fmtIdr(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* ===== Amount in words ===== */}
      <div className="pt-3 text-[9pt] italic text-neutral-700">
        <span className="font-semibold not-italic">Pay : </span>
        {amountInWords(totals.total)}
      </div>

      {/* ===== Banks + signature ===== */}
      <div className="flex items-start justify-between gap-6 pt-6">
        <div className="grid flex-1 grid-cols-2 gap-3">
          {(
            [
              ["IDR Currency", data.bankIdr],
              ["USD Currency", data.bankUsd],
            ] as const
          ).map(([label, bank]) => (
            <div
              key={label}
              className="rounded-md border border-neutral-200 p-2.5 text-[8.5pt]"
            >
              <MiniLabel>{label}</MiniLabel>
              <div className="font-medium">{bank.bank}</div>
              <div className="text-neutral-500">acc no : {bank.accNo}</div>
              <div className="text-neutral-500">acc name : {bank.accName}</div>
            </div>
          ))}
        </div>
        <div className="w-[45mm] pt-1 text-center text-[9pt]">
          <div className="text-neutral-500">Best Regards</div>
          <div className="h-20" />
          <div className="border-t border-neutral-300 pt-1 font-bold">
            {signer}
          </div>
        </div>
      </div>

      {/* ===== Terms ===== */}
      <div className="pt-5 text-[7.5pt] italic leading-snug text-neutral-400">
        {data.termsLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
