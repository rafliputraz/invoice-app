"use client";

import type { InvoiceData } from "@/lib/types";
import { itemAmountIdr } from "@/lib/calc";
import { fmtIdr, fmtNum, fmtDate } from "@/lib/format";
import { amountInWords } from "@/lib/terbilang";
import { invoiceComputed } from "./shared";

/** Dense boxed-grid layout in the style of carrier (CMA CGM / CNC) invoices. */
export default function LedgerTemplate({ data }: { data: InvoiceData }) {
  const { totals, visibleItems, perCurrency, signer } = invoiceComputed(data);
  const showUsd = data.usesUsd ?? true;

  return (
    <div
      id="invoice-print"
      className="mx-auto w-[194mm] shrink-0 border border-black bg-white font-[Arial,Helvetica,sans-serif] text-[8.5pt] leading-snug text-black"
    >
      {/* ===== Header: company | INVOICE box ===== */}
      <div className="flex border-b border-black">
        <div className="flex-1 px-2 py-1.5">
          <div className="text-[10pt] font-bold">{data.company.name}</div>
          {data.company.addressLines.map((line, i) => (
            <div key={i} className="uppercase">
              {line}
            </div>
          ))}
          <div>Mobile: {data.company.mobile}</div>
        </div>
        <div className="flex w-[26%] shrink-0 items-center justify-center border-l border-black p-2">
          <img src="/logo-sfl.png" alt="SFL logo" className="h-14 w-auto" />
        </div>
      </div>

      {/* ===== Meta row: invoice no / copy ===== */}
      <div className="flex border-b border-black">
        <div className="flex-1 px-2 py-1">
          <div>
            <span className="inline-block w-24">Invoice No</span>:{" "}
            <span className="font-bold">{data.invoiceNo}</span>
          </div>
          <div>
            <span className="inline-block w-24">Date</span>:{" "}
            {fmtDate(data.invoiceDate)}
          </div>
          {!!data.invoicedBy?.trim() && (
            <div>
              <span className="inline-block w-24">Invoiced By</span>:{" "}
              {data.invoicedBy}
            </div>
          )}
        </div>
        <div className="w-[40%] shrink-0 border-l border-black px-2 py-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[14pt] font-bold">INVOICE</span>
            <span className="text-[9pt]">{data.copyLabel}</span>
          </div>
        </div>
      </div>

      {/* ===== Invoice to | shipment grid ===== */}
      <div className="flex border-b border-black">
        <div className="flex-1 px-2 py-1">
          <div className="text-[7.5pt] font-bold uppercase">Invoice To:</div>
          <div className="font-bold">{data.invoiceTo.name}</div>
          {data.invoiceTo.addressLines
            .filter((l) => l.trim() !== "")
            .map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          <div className="mt-0.5">Tax ID : {data.invoiceTo.taxId}</div>
        </div>
        <div className="w-[40%] shrink-0 border-l border-black">
          <table className="w-full [&_td]:px-1.5 [&_td]:py-px [&_td]:align-top">
            <tbody>
              <tr>
                <td className="w-[38%] font-semibold">B/L</td>
                <td>{data.shipment.billOfLading}</td>
              </tr>
              <tr>
                <td className="font-semibold">Load Port</td>
                <td>{data.shipment.loadingPort}</td>
              </tr>
              <tr>
                <td className="font-semibold">Discharge</td>
                <td>{data.shipment.dischargePort}</td>
              </tr>
              <tr>
                <td className="font-semibold">Vessel</td>
                <td>{data.shipment.vesselVoyage}</td>
              </tr>
              <tr>
                <td className="font-semibold">ETD</td>
                <td>{data.shipment.etd ? fmtDate(data.shipment.etd) : ""}</td>
              </tr>
              <tr>
                <td className="font-semibold">Contract</td>
                <td>{data.shipment.shipmentContract}</td>
              </tr>
              <tr>
                <td className="font-semibold">Qty</td>
                <td>{data.shipment.qty}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Items grid ===== */}
      <table className="w-full border-b border-black [&_td]:border-r [&_td]:border-neutral-400 [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border-r [&_th]:border-neutral-400 [&_th]:px-1.5 [&_th]:py-1">
        <thead>
          <tr className="border-b border-black text-left text-[7.5pt] uppercase">
            <th className="w-[40%] font-bold">Charge Description</th>
            <th className="w-[10%] font-bold">Currency</th>
            <th className="w-[15%] text-right font-bold">Rate</th>
            <th className="w-[10%] text-center font-bold">Based on</th>
            <th className="w-[25%] !border-r-0 text-right font-bold">
              Amount in IDR
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item, i) => (
            <tr key={i}>
              <td>{item.description}</td>
              <td>{item.currency}</td>
              <td className="text-right">{fmtNum(item.unitPrice)}</td>
              <td className="text-center">
                {item.qty} {item.pinned ? "FIX" : "UNI"}
              </td>
              <td className="!border-r-0 text-right">
                {fmtIdr(itemAmountIdr(item, data.exchangeRate))}
              </td>
            </tr>
          ))}
          {/* filler row keeps the grid tall like carrier invoices */}
          <tr>
            <td className="h-[30mm]"></td>
            <td></td>
            <td></td>
            <td></td>
            <td className="!border-r-0"></td>
          </tr>
        </tbody>
      </table>

      {/* ===== Rate of exchange | totals ===== */}
      <div className="flex border-b border-black">
        <div className="flex-1 px-2 py-1">
          {showUsd && (
            <>
              <div className="border-b border-neutral-400 pb-0.5 font-semibold">
                Rate of Exchange
              </div>
              <div>1 USD = {fmtNum(data.exchangeRate)} IDR</div>
            </>
          )}
          <div className="mt-1 border-b border-neutral-400 pb-0.5 font-semibold">
            Currency Charge Totals
          </div>
          {perCurrency.usd > 0 && (
            <div className="flex justify-between pr-6">
              <span>USD</span>
              <span>{fmtNum(perCurrency.usd)}</span>
            </div>
          )}
          {perCurrency.idr > 0 && (
            <div className="flex justify-between pr-6">
              <span>IDR</span>
              <span>{fmtIdr(perCurrency.idr)}</span>
            </div>
          )}
          <div className="mt-1">
            Payment terms : <span className="font-bold">{data.paymentTerms}</span>
          </div>
        </div>
        <div className="flex w-[45%] shrink-0 flex-col border-l border-black">
          <div className="flex justify-between border-b border-neutral-400 px-2 py-1">
            <span>Total Excl. Tax/VAT:</span>
            <span>{fmtIdr(totals.subtotal)}</span>
          </div>
          {data.vatEnabled && (
            <div className="flex justify-between border-b border-neutral-400 px-2 py-1">
              <span>VAT {data.vatLabel}:</span>
              <span>{fmtIdr(totals.vat)}</span>
            </div>
          )}
          <div className="flex flex-1 justify-between px-2 py-1 text-[9.5pt] font-bold">
            <span>Total Incl. Tax/VAT:</span>
            <span>{fmtIdr(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* ===== Total amount + words ===== */}
      <div className="flex items-center justify-between border-b border-black px-2 py-1.5">
        <div>
          <span className="font-bold">Total Amount : </span>
          <span className="text-[10pt] font-bold">
            {fmtIdr(totals.total)} IDR
          </span>
        </div>
        <div className="italic">{amountInWords(totals.total)}</div>
      </div>

      {/* ===== Bank box | signature ===== */}
      <div className="flex border-b border-black">
        <div className="flex-1 px-2 py-1.5">
          <div className="font-bold underline">IDR Currency</div>
          <div>{data.bankIdr.bank}</div>
          <div>Account Number: {data.bankIdr.accNo}</div>
          <div>Beneficiary Name: {data.bankIdr.accName}</div>
          {showUsd && (
            <>
              <div className="mt-1.5 font-bold underline">USD Currency</div>
              <div>{data.bankUsd.bank}</div>
              <div>Account Number: {data.bankUsd.accNo}</div>
              <div>Beneficiary Name: {data.bankUsd.accName}</div>
            </>
          )}
        </div>
        <div className="flex w-[40%] shrink-0 flex-col items-center justify-between border-l border-black px-2 py-1.5">
          <div className="font-bold">Best Regards</div>
          <div className="h-14" />
          <div className="font-bold">{signer}</div>
        </div>
      </div>

      {/* ===== Terms footer ===== */}
      <div className="px-2 py-1.5 text-[7pt] italic leading-snug">
        {data.termsLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
