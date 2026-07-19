"use client";

import { useEffect, useState } from "react";
import type {
  BankAccount,
  CustomerMaster,
  InvoiceData,
  LineItem,
} from "@/lib/types";
import { itemAmountIdr } from "@/lib/calc";
import { DEFAULT_SIGNER } from "@/lib/defaults";
import { fmtDate, fmtIdr } from "@/lib/format";
import { dueDateOf } from "@/lib/invoice-number";

type Setter = (updater: (prev: InvoiceData) => InvoiceData) => void;

const SECTION_TONES = {
  blue: "bg-blue-100 text-blue-600",
  emerald: "bg-emerald-100 text-emerald-600",
  indigo: "bg-indigo-100 text-indigo-600",
  amber: "bg-amber-100 text-amber-600",
  cyan: "bg-cyan-100 text-cyan-600",
  slate: "bg-slate-200 text-slate-600",
} as const;

function Section({
  title,
  icon,
  tone = "blue",
  children,
}: {
  title: string;
  icon: string;
  tone?: keyof typeof SECTION_TONES;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3"
      >
        <span className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded ${SECTION_TONES[tone]}`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={icon}
              />
            </svg>
          </span>
          <span className="text-sm font-bold text-slate-800">{title}</span>
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "" : "-rotate-90"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && <div className="space-y-4 p-4">{children}</div>}
    </div>
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
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";

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

  // Saved customers (managed on the Customers page) for the quick-fill dropdown.
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);

  useEffect(() => {
    fetch("/api/customers/master")
      .then((r) => r.json())
      .then((rows: CustomerMaster[]) => setCustomers(rows))
      .catch(() => {});
  }, []);

  const pickCustomer = (idStr: string) => {
    const c = customers.find((it) => String(it.id) === idStr);
    if (!c) return;
    set({
      invoiceTo: {
        name: c.name,
        addressLines: c.addressLines.length ? c.addressLines : ["", "", ""],
        taxId: c.taxId,
      },
    });
  };

  const clearCustomer = () =>
    set({ invoiceTo: { name: "", addressLines: ["", "", ""], taxId: "" } });

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
      <Section
        title="Invoice Details"
        tone="blue"
        icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice No (auto)">
            <input
              className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-sm font-medium text-slate-500"
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
        <Field label="Payment Due">
          <div className="flex rounded-lg shadow-sm">
            <input
              type="number"
              step="1"
              min="1"
              className="z-10 flex-1 rounded-l-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              value={data.dueDays || ""}
              onChange={(e) =>
                set({ dueDays: parseInt(e.target.value) || undefined })
              }
              placeholder="e.g. 30"
            />
            <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
              Days
            </span>
          </div>
          {(() => {
            const due = dueDateOf(data.invoiceDate, data.dueDays);
            return (
              <span className="mt-1.5 block text-[11px] text-slate-500">
                {due
                  ? `Jatuh tempo: ${fmtDate(due)}`
                  : "Kosongkan jika customer bayar langsung."}
              </span>
            );
          })()}
        </Field>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Invoiced By
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              Optional
            </span>
          </span>
          <input
            className={inputCls}
            value={data.invoicedBy ?? ""}
            onChange={(e) => set({ invoicedBy: e.target.value })}
            placeholder="e.g. Sapta Fajri"
          />
          <span className="mt-1.5 block text-[11px] text-slate-500">
            Disembunyikan dari dokumen jika kosong.
          </span>
        </label>
      </Section>

      <Section
        title="Customer Details"
        tone="emerald"
        icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      >
        {customers.length > 0 && (
          <Field label="Pilih customer tersimpan (isi otomatis)">
            <div className="flex gap-2">
              <select
                className={inputCls}
                value=""
                onChange={(e) => pickCustomer(e.target.value)}
              >
                <option value="">— pilih customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearCustomer}
                title="Kosongkan isian customer"
                className="shrink-0 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-rose-500"
              >
                ✕ Clear
              </button>
            </div>
          </Field>
        )}
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

      <Section
        title="Shipment Details"
        tone="indigo"
        icon="M13 10V3L4 14h7v7l9-11h-7z"
      >
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

      <Section
        title="Charges"
        tone="amber"
        icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      >
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
              <tr className="text-left text-xs text-slate-500">
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
                        className="cursor-default text-xs text-slate-400"
                        title="Always stays at the bottom"
                      >
                        📌
                      </span>
                    ) : (
                      <span
                        draggable
                        onDragStart={() => setDragIndex(i)}
                        onDragEnd={() => setDragIndex(null)}
                        className="cursor-grab select-none text-slate-400 hover:text-slate-600 active:cursor-grabbing"
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
                      className="w-[4.5rem] rounded-lg border border-slate-300 px-1 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      className="w-20 rounded-lg border border-slate-300 px-1.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      className="w-14 rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={item.qty || ""}
                      onChange={(e) =>
                        setItem(i, { qty: parseInt(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2 text-right font-mono text-xs text-slate-600">
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
          className="rounded border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600"
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

      <Section
        title="Bank Accounts"
        tone="cyan"
        icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      >
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["bankIdr", "IDR Currency"],
              ["bankUsd", "USD Currency"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <div className="text-xs font-semibold text-slate-600">{label}</div>
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

      <Section
        title="Company (Header)"
        tone="slate"
        icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      >
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
