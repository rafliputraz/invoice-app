"use client";

import { useState } from "react";
import type { BankAccount, InvoiceData, LineItem } from "@/lib/types";
import { itemAmountIdr } from "@/lib/calc";
import { DEFAULT_SIGNER } from "@/lib/defaults";
import { fmtDate, fmtIdr } from "@/lib/format";
import { dueDateOf } from "@/lib/invoice-number";

type Setter = (updater: (prev: InvoiceData) => InvoiceData) => void;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <legend className="px-1 text-sm font-semibold text-gray-700">
        {title}
      </legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs font-medium text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function InvoiceForm({
  data,
  setData,
}: {
  data: InvoiceData;
  setData: Setter;
}) {
  const set = (patch: Partial<InvoiceData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const setBank = (key: "bankIdr" | "bankUsd", patch: Partial<BankAccount>) =>
    setData((prev) =>
      key === "bankIdr"
        ? { ...prev, bankIdr: { ...prev.bankIdr, ...patch } }
        : { ...prev, bankUsd: { ...prev.bankUsd, ...patch } }
    );

  const setItem = (index: number, patch: Partial<LineItem>) =>
    setData((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));

  // New rows go above the pinned ones (Doc Fee / Adm Fee stay at the bottom).
  const addItem = () =>
    setData((prev) => {
      const items = [...prev.items];
      const firstPinned = items.findIndex((it) => it.pinned);
      const insertAt = firstPinned === -1 ? items.length : firstPinned;
      items.splice(insertAt, 0, {
        description: "",
        currency: "IDR",
        unitPrice: 0,
        qty: 1,
      });
      return { ...prev, items };
    });

  const removeItem = (index: number) =>
    setData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const moveItem = (from: number, to: number) =>
    setData((prev) => {
      const items = [...prev.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...prev, items };
    });

  // Stable sort: pinned rows always render (and print) last.
  const entries = data.items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(!!a.item.pinned) - Number(!!b.item.pinned));

  return (
    <div className="space-y-4">
      <Section title="Invoice">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice No (auto)">
            <input
              className={`${inputCls} bg-gray-100 font-mono`}
              value={data.invoiceNo}
              readOnly
              tabIndex={-1}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={inputCls}
              value={data.invoiceDate}
              onChange={(e) => set({ invoiceDate: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Label">
            <select
              className={inputCls}
              value={data.copyLabel}
              onChange={(e) => set({ copyLabel: e.target.value })}
            >
              <option value="ORIGINAL">ORIGINAL</option>
              <option value="COPY">COPY</option>
            </select>
          </Field>
          <Field label="Payment terms">
            <input
              className={inputCls}
              value={data.paymentTerms}
              onChange={(e) => set({ paymentTerms: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Payment due (days — kosongkan jika bayar langsung)">
          <input
            type="number"
            step="1"
            min="1"
            className={inputCls}
            value={data.dueDays || ""}
            onChange={(e) =>
              set({ dueDays: parseInt(e.target.value) || undefined })
            }
            placeholder="e.g. 30"
          />
          {(() => {
            const due = dueDateOf(data.invoiceDate, data.dueDays);
            return due ? (
              <span className="mt-0.5 block text-xs text-gray-400">
                Due date: {fmtDate(due)}
              </span>
            ) : null;
          })()}
        </Field>
        <Field label="Invoiced by (optional — hidden when empty)">
          <input
            className={inputCls}
            value={data.invoicedBy ?? ""}
            onChange={(e) => set({ invoicedBy: e.target.value })}
            placeholder="e.g. Sapta Fajri"
          />
        </Field>
      </Section>

      <Section title="Invoice to">
        <Field label="Customer name">
          <input
            className={inputCls}
            value={data.invoiceTo.name}
            onChange={(e) =>
              set({ invoiceTo: { ...data.invoiceTo, name: e.target.value } })
            }
            placeholder="PT. SALAM FORTUNA LOGISTIK"
          />
        </Field>
        <Field label="Address (one line per row)">
          <textarea
            className={inputCls}
            rows={3}
            value={data.invoiceTo.addressLines.join("\n")}
            onChange={(e) =>
              set({
                invoiceTo: {
                  ...data.invoiceTo,
                  addressLines: e.target.value.split("\n"),
                },
              })
            }
          />
        </Field>
        <Field label="Tax ID">
          <input
            className={inputCls}
            value={data.invoiceTo.taxId}
            onChange={(e) =>
              set({ invoiceTo: { ...data.invoiceTo, taxId: e.target.value } })
            }
            placeholder="000000 000 0000 000"
          />
        </Field>
      </Section>

      <Section title="Shipment">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bill of Lading">
            <input
              className={inputCls}
              value={data.shipment.billOfLading}
              onChange={(e) =>
                set({
                  shipment: { ...data.shipment, billOfLading: e.target.value },
                })
              }
              placeholder="MEDURQ995991"
            />
          </Field>
          <Field label="Vessel / Voyage">
            <input
              className={inputCls}
              value={data.shipment.vesselVoyage}
              onChange={(e) =>
                set({
                  shipment: { ...data.shipment, vesselVoyage: e.target.value },
                })
              }
              placeholder="MSC MANU IV"
            />
          </Field>
          <Field label="Loading Port">
            <input
              className={inputCls}
              value={data.shipment.loadingPort}
              onChange={(e) =>
                set({
                  shipment: { ...data.shipment, loadingPort: e.target.value },
                })
              }
              placeholder="Panjang, ID"
            />
          </Field>
          <Field label="Discharge Port">
            <input
              className={inputCls}
              value={data.shipment.dischargePort}
              onChange={(e) =>
                set({
                  shipment: { ...data.shipment, dischargePort: e.target.value },
                })
              }
              placeholder="Pasir Gudang, MY"
            />
          </Field>
          <Field label="Shipment contract">
            <input
              className={inputCls}
              value={data.shipment.shipmentContract}
              onChange={(e) =>
                set({
                  shipment: {
                    ...data.shipment,
                    shipmentContract: e.target.value,
                  },
                })
              }
              placeholder="SML075/EHS/26"
            />
          </Field>
          <Field label="ETD">
            <input
              type="date"
              className={inputCls}
              value={data.shipment.etd}
              onChange={(e) =>
                set({ shipment: { ...data.shipment, etd: e.target.value } })
              }
            />
          </Field>
          <Field label="Qty">
            <input
              className={inputCls}
              value={data.shipment.qty}
              onChange={(e) =>
                set({ shipment: { ...data.shipment, qty: e.target.value } })
              }
              placeholder="2 x 20GP"
            />
          </Field>
        </div>
      </Section>

      <Section title="Charges">
        <Field label="Exchange rate (IDR per USD 1)">
          <input
            type="number"
            step="any"
            min="0"
            className={inputCls}
            value={data.exchangeRate || ""}
            onChange={(e) =>
              set({ exchangeRate: parseFloat(e.target.value) || 0 })
            }
            placeholder="18436.61"
          />
        </Field>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="pb-1 pr-1"></th>
                <th className="pb-1 pr-2 font-medium">Description</th>
                <th className="pb-1 pr-2 font-medium">Curr</th>
                <th className="pb-1 pr-2 font-medium">Price</th>
                <th className="pb-1 pr-2 font-medium">Qty</th>
                <th className="pb-1 pr-2 text-right font-medium">IDR Amount</th>
                <th className="pb-1"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(({ item, index: i }) => (
                <tr
                  key={i}
                  onDragOver={
                    item.pinned ? undefined : (e) => e.preventDefault()
                  }
                  onDrop={
                    item.pinned
                      ? undefined
                      : () => {
                          if (dragIndex !== null && dragIndex !== i) {
                            moveItem(dragIndex, i);
                          }
                          setDragIndex(null);
                        }
                  }
                  className={dragIndex === i ? "opacity-50" : ""}
                >
                  <td className="py-1 pr-1 align-middle">
                    {item.pinned ? (
                      <span
                        className="cursor-default text-xs text-gray-400"
                        title="Always stays at the bottom"
                      >
                        📌
                      </span>
                    ) : (
                      <span
                        draggable
                        onDragStart={() => setDragIndex(i)}
                        onDragEnd={() => setDragIndex(null)}
                        className="cursor-grab select-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        ⠿
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      className={inputCls}
                      value={item.description}
                      onChange={(e) =>
                        setItem(i, { description: e.target.value })
                      }
                      placeholder="Ocean Freight"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      className="w-[4.5rem] rounded border border-gray-300 px-1 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={item.currency}
                      onChange={(e) =>
                        setItem(i, {
                          currency: e.target.value as LineItem["currency"],
                        })
                      }
                    >
                      <option value="USD">USD</option>
                      <option value="IDR">IDR</option>
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="w-20 rounded border border-gray-300 px-1.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        setItem(i, {
                          unitPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className="w-14 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={item.qty || ""}
                      onChange={(e) =>
                        setItem(i, { qty: parseInt(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2 text-right font-mono text-xs text-gray-600">
                    {fmtIdr(itemAmountIdr(item, data.exchangeRate))}
                  </td>
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="rounded px-2 py-1 text-red-500 hover:bg-red-50"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="rounded border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
        >
          + Add row
        </button>

        <label className="flex items-center gap-2 pt-1 text-sm">
          <input
            type="checkbox"
            checked={data.vatEnabled}
            onChange={(e) => set({ vatEnabled: e.target.checked })}
          />
          <span>VAT Charges {data.vatLabel} (1,1%)</span>
        </label>
      </Section>

      <Section title="Bank accounts">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["bankIdr", "IDR Currency"],
              ["bankUsd", "USD Currency"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <div className="text-xs font-semibold text-gray-600">{label}</div>
              <Field label="Bank">
                <input
                  className={inputCls}
                  value={data[key].bank}
                  onChange={(e) => setBank(key, { bank: e.target.value })}
                />
              </Field>
              <Field label="Acc no">
                <input
                  className={inputCls}
                  value={data[key].accNo}
                  onChange={(e) => setBank(key, { accNo: e.target.value })}
                />
              </Field>
              <Field label="Acc name">
                <input
                  className={inputCls}
                  value={data[key].accName}
                  onChange={(e) => setBank(key, { accName: e.target.value })}
                />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Company (header)">
        <Field label="Company name">
          <input
            className={inputCls}
            value={data.company.name}
            onChange={(e) =>
              set({ company: { ...data.company, name: e.target.value } })
            }
          />
        </Field>
        <Field label="Address (one line per row)">
          <textarea
            className={inputCls}
            rows={3}
            value={data.company.addressLines.join("\n")}
            onChange={(e) =>
              set({
                company: {
                  ...data.company,
                  addressLines: e.target.value.split("\n"),
                },
              })
            }
          />
        </Field>
        <Field label="Mobile">
          <input
            className={inputCls}
            value={data.company.mobile}
            onChange={(e) =>
              set({ company: { ...data.company, mobile: e.target.value } })
            }
          />
        </Field>
        <Field label="Signature name (bottom right of invoice)">
          <input
            className={inputCls}
            value={data.signatureName ?? DEFAULT_SIGNER}
            onChange={(e) => set({ signatureName: e.target.value })}
          />
        </Field>
      </Section>
    </div>
  );
}
