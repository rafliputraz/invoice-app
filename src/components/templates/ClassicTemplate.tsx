"use client";

import type { InvoiceData } from "@/lib/types";
import { itemAmountIdr } from "@/lib/calc";
import { fmtIdr, fmtNum, fmtDate } from "@/lib/format";
import { amountInWords } from "@/lib/terbilang";
import { LabeledLine, invoiceComputed } from "./shared";

/** Faithful replica of the original SFL paper template. */
export default function ClassicTemplate({ data }: { data: InvoiceData }) {
  const { totals, visibleItems, perCurrency, signer } = invoiceComputed(data);

  return (
    <div
      id="invoice-print"
      className="mx-auto w-[194mm] shrink-0 border border-black bg-white font-[Calibri,Arial,sans-serif] text-[11pt] leading-[1.35] text-black"
    >
      {/* ===== Company header + logo ===== */}
      <div className="flex items-start justify-between border-b border-black px-3 py-2">
        <div>
          <div>{data.company.name}</div>
          {data.company.addressLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          <div>Mobile: {data.company.mobile}</div>
        </div>
        <div className="pr-4 pt-1">
          <img src="/logo-sfl.png" alt="SFL logo" className="h-20 w-auto" />
        </div>
      </div>

      {/* ===== Invoice-to + INVOICE box ===== */}
      <div className="flex border-b border-black">
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 px-3 py-2">
            <span className="w-24 shrink-0">Invoice to :</span>
            <div>
              <div className="font-bold">{data.invoiceTo.name}</div>
              {data.invoiceTo.addressLines
                .filter((l) => l.trim() !== "")
                .map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
            </div>
          </div>
          <div className="flex border-t border-black px-3 py-1">
            <span className="w-24 shrink-0">Tax ID :</span>
            <span>{data.invoiceTo.taxId}</span>
          </div>
          {!!data.invoicedBy?.trim() && (
            <div className="flex border-t border-black px-3 py-1">
              <span className="w-24 shrink-0">Invoiced By :</span>
              <span>{data.invoicedBy}</span>
            </div>
          )}
        </div>
        <div className="w-[34%] shrink-0 border-l border-black">
          <div className="px-2 pt-1 text-[10pt]">{data.copyLabel}</div>
          <div className="px-2 pb-1 text-[20pt] font-bold leading-tight">
            INVOICE
          </div>
          <div className="border-t border-black px-2 py-0.5">
            <LabeledLine label="No" value={data.invoiceNo} labelWidth="2.5rem" />
            <LabeledLine
              label="Date"
              value={fmtDate(data.invoiceDate)}
              labelWidth="2.5rem"
            />
          </div>
        </div>
      </div>

      {/* ===== Shipment details ===== */}
      <div className="border-b border-black px-3 py-2">
        <LabeledLine label="Bill of Lading" value={data.shipment.billOfLading} />
        <div className="flex">
          <div className="w-1/2">
            <LabeledLine label="Loading Port" value={data.shipment.loadingPort} />
            <LabeledLine
              label="Discharge Port"
              value={data.shipment.dischargePort}
            />
            <LabeledLine
              label="Shipment contract"
              value={data.shipment.shipmentContract}
            />
          </div>
          <div className="w-1/2">
            <LabeledLine
              label="Vessel / Voyage"
              value={data.shipment.vesselVoyage}
              labelWidth="6.5rem"
            />
            <LabeledLine
              label="ETD"
              value={data.shipment.etd ? fmtDate(data.shipment.etd) : ""}
              labelWidth="6.5rem"
            />
            <LabeledLine
              label="Qty"
              value={data.shipment.qty}
              labelWidth="6.5rem"
            />
          </div>
        </div>
      </div>

      {/* ===== Line items ===== */}
      <div className="min-h-[70mm] border-b border-black px-3 py-2">
        <table className="w-full">
          <tbody>
            {visibleItems.map((item, i) => (
              <tr key={i}>
                <td className="w-[38%] py-px align-top">{item.description}</td>
                <td className="w-[8%] py-px align-top">{item.currency}</td>
                <td className="w-[14%] py-px pr-6 text-right align-top">
                  {fmtNum(item.unitPrice)}
                </td>
                <td className="w-[10%] py-px align-top">x {item.qty}</td>
                <td className="w-[8%] py-px align-top">IDR</td>
                <td className="w-[22%] py-px text-right align-top">
                  {fmtIdr(itemAmountIdr(item, data.exchangeRate))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Exchange rate + totals ===== */}
      <div className="flex border-b border-black">
        <div className="flex-1 px-3 py-1">
          <div>
            Exch Rate : IDR {fmtNum(data.exchangeRate)} / USD 1
          </div>
          <div>
            Payment terms : <span className="font-bold italic">{data.paymentTerms}</span>
          </div>
          {(perCurrency.usd > 0 || perCurrency.idr > 0) && (
            <div className="mt-1 text-[10pt]">
              <div className="italic">Currency Charge Totals</div>
              {perCurrency.usd > 0 && (
                <div className="flex">
                  <span className="w-12">USD</span>
                  <span>{fmtNum(perCurrency.usd)}</span>
                </div>
              )}
              {perCurrency.idr > 0 && (
                <div className="flex">
                  <span className="w-12">IDR</span>
                  <span>{fmtIdr(perCurrency.idr)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex w-[52%] shrink-0 flex-col">
          <div className="flex border-b border-black py-0.5">
            <span className="flex-1 pr-2 text-right">Total (Excl. VAT)</span>
            <span className="w-12 border-l border-black pl-2">IDR</span>
            <span className="w-28 border-l border-black pl-1 pr-2 text-right">
              {fmtIdr(totals.subtotal)}
            </span>
          </div>
          {data.vatEnabled && (
            <div className="flex border-b border-black py-0.5">
              <span className="flex-1 pr-2 text-right">
                VAT Charges {data.vatLabel}
              </span>
              <span className="w-12 border-l border-black pl-2">IDR</span>
              <span className="w-28 border-l border-black pl-1 pr-2 text-right">
                {fmtIdr(totals.vat)}
              </span>
            </div>
          )}
          {/* flex-1 stretches this row so the vertical dividers reach the
              bottom even when the left column is taller */}
          <div className="flex flex-1 py-0.5 font-bold">
            <span className="flex-1 pr-2 text-right">Total (Incl. VAT)</span>
            <span className="w-12 border-l border-black pl-2">IDR</span>
            <span className="w-28 border-l border-black pl-1 pr-2 text-right">
              {fmtIdr(totals.total)}
            </span>
          </div>
        </div>
      </div>

      {/* ===== Amount in words ===== */}
      <div className="border-b border-black px-3 py-1">
        <span className="font-bold">Pay : </span>
        <span className="font-bold italic">{amountInWords(totals.total)}</span>
      </div>

      {/* ===== Terms ===== */}
      <div className="border-b border-black px-3 py-2 text-[9pt] italic leading-snug">
        {data.termsLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {/* ===== Bank details + signature ===== */}
      <div className="flex px-3 py-2">
        <div className="flex-1 text-[10pt]">
          <div className="italic font-bold">IDR Currency</div>
          <div>{data.bankIdr.bank}</div>
          <div>acc no : {data.bankIdr.accNo}</div>
          <div>acc name : {data.bankIdr.accName}</div>
          <div className="mt-3 italic font-bold">USD Currency</div>
          <div>{data.bankUsd.bank}</div>
          <div>acc no : {data.bankUsd.accNo}</div>
          <div>acc name : {data.bankUsd.accName}</div>
        </div>
        <div className="flex w-[40%] shrink-0 flex-col items-center justify-between pt-1">
          <div className="font-bold">Best Regards</div>
          <div className="h-24" />
          <div className="text-center font-bold">{signer}</div>
        </div>
      </div>
    </div>
  );
}
