"use client";

import type { InvoiceData } from "@/lib/types";
import { itemAmountIdr } from "@/lib/calc";
import { fmtIdr, fmtNum, fmtDate } from "@/lib/format";
import { amountInWords } from "@/lib/terbilang";
import { invoiceComputed } from "./shared";

/** Bold red brand band header with strong totals box. */
export default function BandTemplate({ data }: { data: InvoiceData }) {
  const { totals, visibleItems, perCurrency, signer } = invoiceComputed(data);

  return (
    <div
      id="invoice-print"
      className="mx-auto w-[194mm] shrink-0 bg-white font-[Arial,Helvetica,sans-serif] text-[10pt] leading-normal text-neutral-900"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* ===== Brand band ===== */}
      <div className="flex items-center justify-between bg-red-700 px-[8mm] py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded bg-white p-1.5">
            <img src="/logo-sfl.png" alt="SFL logo" className="h-11 w-auto" />
          </div>
          <div>
            <div className="text-[13pt] font-bold leading-tight">
              {data.company.name}
            </div>
            <div className="text-[7.5pt] leading-snug opacity-85">
              {data.company.addressLines.join(" · ")}
              <br />
              Mobile: {data.company.mobile}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[20pt] font-black tracking-wider">INVOICE</div>
          <div className="text-[8pt] uppercase tracking-widest opacity-85">
            {data.copyLabel}
          </div>
        </div>
      </div>

      {/* ===== No / Date strip ===== */}
      <div className="flex justify-between border-b border-neutral-300 px-[8mm] py-2 text-[9.5pt]">
        <div>
          <span className="font-bold">No :</span> {data.invoiceNo}
        </div>
        {!!data.invoicedBy?.trim() && (
          <div>
            <span className="font-bold">Invoiced By :</span> {data.invoicedBy}
          </div>
        )}
        <div>
          <span className="font-bold">Date :</span>{" "}
          {fmtDate(data.invoiceDate)}
        </div>
      </div>

      {/* ===== Invoice-to + shipment ===== */}
      <div className="grid grid-cols-2 px-[8mm] py-3 text-[9.5pt]">
        <div className="pr-5">
          <div className="mb-1 text-[7.5pt] font-bold uppercase tracking-widest text-red-700">
            Invoice To
          </div>
          <div className="font-bold">{data.invoiceTo.name}</div>
          {data.invoiceTo.addressLines
            .filter((l) => l.trim() !== "")
            .map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          {data.invoiceTo.taxId && <div>Tax ID : {data.invoiceTo.taxId}</div>}
        </div>
        <div className="border-l border-neutral-300 pl-5">
          <div className="mb-1 text-[7.5pt] font-bold uppercase tracking-widest text-red-700">
            Shipment
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3">
            {(
              [
                ["B/L", data.shipment.billOfLading],
                ["Loading", data.shipment.loadingPort],
                ["Discharge", data.shipment.dischargePort],
                ["Vessel", data.shipment.vesselVoyage],
                ["ETD", data.shipment.etd ? fmtDate(data.shipment.etd) : ""],
                ["Contract", data.shipment.shipmentContract],
                ["Qty", data.shipment.qty],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <span className="font-semibold text-neutral-500">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ===== Items ===== */}
      <div className="px-[8mm]">
        <table className="w-full">
          <thead>
            <tr className="bg-red-700 text-left text-[8pt] uppercase tracking-wider text-white">
              <th className="px-2 py-1.5 font-bold">Description</th>
              <th className="px-2 py-1.5 font-bold">Curr</th>
              <th className="px-2 py-1.5 text-right font-bold">Price</th>
              <th className="px-2 py-1.5 text-center font-bold">Qty</th>
              <th className="px-2 py-1.5 text-right font-bold">
                Amount (IDR)
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item, i) => (
              <tr key={i} className={i % 2 ? "bg-neutral-50" : ""}>
                <td className="w-[42%] px-2 py-1.5">{item.description}</td>
                <td className="w-[10%] px-2 py-1.5">{item.currency}</td>
                <td className="w-[15%] px-2 py-1.5 text-right">
                  {fmtNum(item.unitPrice)}
                </td>
                <td className="w-[10%] px-2 py-1.5 text-center">
                  x {item.qty}
                </td>
                <td className="w-[23%] px-2 py-1.5 text-right font-medium">
                  {fmtIdr(itemAmountIdr(item, data.exchangeRate))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Rates + totals ===== */}
      <div className="flex items-start justify-between px-[8mm] pt-4">
        <div className="text-[8.5pt] text-neutral-600">
          <div>
            <span className="font-semibold">Exch Rate :</span> IDR{" "}
            {fmtNum(data.exchangeRate)} / USD 1
          </div>
          <div>
            <span className="font-semibold">Payment terms :</span>{" "}
            <span className="font-bold italic">{data.paymentTerms}</span>
          </div>
          {(perCurrency.usd > 0 || perCurrency.idr > 0) && (
            <div className="mt-1.5">
              <div className="font-semibold italic">Currency Charge Totals</div>
              {perCurrency.usd > 0 && <div>USD {fmtNum(perCurrency.usd)}</div>}
              {perCurrency.idr > 0 && <div>IDR {fmtIdr(perCurrency.idr)}</div>}
            </div>
          )}
        </div>
        <div className="w-[78mm] border border-neutral-400 text-[9.5pt]">
          <div className="flex justify-between px-3 py-1.5">
            <span>Total (Excl. VAT)</span>
            <span>IDR {fmtIdr(totals.subtotal)}</span>
          </div>
          {data.vatEnabled && (
            <div className="flex justify-between border-t border-neutral-300 px-3 py-1.5">
              <span>VAT Charges {data.vatLabel}</span>
              <span>IDR {fmtIdr(totals.vat)}</span>
            </div>
          )}
          <div className="flex justify-between bg-red-700 px-3 py-2 text-[11pt] font-bold text-white">
            <span>TOTAL</span>
            <span>IDR {fmtIdr(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* ===== Amount in words ===== */}
      <div className="px-[8mm] pt-3 text-[9pt]">
        <span className="font-bold">Pay : </span>
        <span className="font-bold italic">{amountInWords(totals.total)}</span>
      </div>

      {/* ===== Banks + signature ===== */}
      <div className="flex items-start justify-between gap-6 px-[8mm] pt-4">
        <div className="flex-1 text-[8.5pt]">
          {(
            [
              ["IDR Currency", data.bankIdr],
              ["USD Currency", data.bankUsd],
            ] as const
          ).map(([label, bank]) => (
            <div key={label} className="mb-2">
              <span className="font-bold italic">{label}</span> — {bank.bank}
              <div className="text-neutral-600">
                acc no : {bank.accNo} · acc name : {bank.accName}
              </div>
            </div>
          ))}
        </div>
        <div className="w-[45mm] text-center text-[9pt]">
          <div className="font-bold">Best Regards</div>
          <div className="h-20" />
          <div className="border-t-2 border-red-700 pt-1 font-bold">
            {signer}
          </div>
        </div>
      </div>

      {/* ===== Terms ===== */}
      <div className="px-[8mm] pb-[6mm] pt-3 text-[7.5pt] italic leading-snug text-neutral-500">
        {data.termsLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
