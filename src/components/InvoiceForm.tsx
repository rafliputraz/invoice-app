"use client";

import { useEffect, useState } from "react";
import type {
  BankAccount,
  CustomerMaster,
  InvoiceData,
  LineItem,
  VatVariant,
} from "@/lib/types";
import { itemDisplayAmount, VAT_VARIANTS } from "@/lib/calc";
import { DEFAULT_SIGNER } from "@/lib/defaults";
import { fmtDate, fmtMoney } from "@/lib/format";
import { dueDateOf } from "@/lib/invoice-number";
import {
  IconAnchor,
  IconChevronDown,
  IconClose,
  IconGrip,
  IconPlus,
} from "./Icons";

type Setter = (updater: (prev: InvoiceData) => InvoiceData) => void;

/** Invoice currency mode selectable in the Charges section. */
type CurrencyMode = "usd_idr" | "idr" | "usd";

/**
 * A collapsible block of the form. Ruled, flat, and titled in chart caps —
 * no icon tile, no elevation. The form is a stack of sheets, not a stack of
 * cards competing for attention with the data.
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`panel-head flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-soft ${
          open ? "" : "rounded-b-md border-b-transparent"
        }`}
      >
        <span className="lbl lbl-strong">{title}</span>
        <IconChevronDown
          className={`h-4 w-4 shrink-0 text-ink-2 transition-transform ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>
      {open && <div className="space-y-3.5 px-3.5 py-3.5">{children}</div>}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  /** Small italic note shown to the right of the label. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="lbl mb-1.5 flex items-baseline justify-between gap-2">
        {label}
        {hint && (
          <span className="font-normal normal-case italic tracking-normal">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

export default function InvoiceForm({
  data,
  setData,
  manualNo = false,
  setManualNo,
  isNew = false,
  numberError = "",
  addendum = false,
}: {
  data: InvoiceData;
  setData: Setter;
  /** When true, the invoice number is user-edited instead of auto-generated. */
  manualNo?: boolean;
  /** Provided when the number may be entered/edited manually. */
  setManualNo?: (v: boolean) => void;
  /** Distinguishes a brand-new invoice (auto number) from editing an existing one. */
  isNew?: boolean;
  /** Validation message for the manual number, shown under the field. */
  numberError?: string;
  /** Addendum on an existing B/L: number is a read-only auto-suffix. */
  addendum?: boolean;
}) {
  const set = (patch: Partial<InvoiceData>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const usesUsd = data.usesUsd ?? true;
  const usdOnly = data.usdOnly ?? false;
  const currencyMode: CurrencyMode = usdOnly ? "usd" : usesUsd ? "usd_idr" : "idr";

  /**
   * Switch invoice currency mode:
   * - usd_idr: multi-currency, items USD/IDR, exchange rate + both banks shown.
   * - idr:     IDR only; USD items forced to IDR, rate cleared.
   * - usd:     USD only; every item priced in USD, no IDR, no tax (VAT/PPh off).
   * Leaving mismatched items would price them wrong, so currencies are coerced.
   */
  const setCurrencyMode = (mode: CurrencyMode) =>
    setData((prev) => {
      if (mode === "usd") {
        return {
          ...prev,
          usdOnly: true,
          usesUsd: true,
          vatEnabled: false,
          withholdingEnabled: false,
          items: prev.items.map((it) => ({ ...it, currency: "USD" as const })),
        };
      }
      if (mode === "idr") {
        return {
          ...prev,
          usdOnly: false,
          usesUsd: false,
          exchangeRate: 0,
          items: prev.items.map((it) => ({ ...it, currency: "IDR" as const })),
        };
      }
      return { ...prev, usdOnly: false, usesUsd: true };
    });

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
    <div className="space-y-3.5">
      <Section title="Invoice details">
        {addendum && (
          <p className="rounded-sm border border-open/25 bg-open-soft px-3 py-2 text-[11px] leading-relaxed text-open">
            Addendum on an existing bill of lading. The number, shipment and
            customer follow the parent invoice — enter only the different
            charges below.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Invoice no."
            hint={
              addendum
                ? "from parent"
                : manualNo
                  ? "manual"
                  : isNew
                    ? "auto"
                    : undefined
            }
          >
            {manualNo ? (
              <input
                className="field"
                style={
                  numberError
                    ? { borderColor: "var(--color-late)" }
                    : undefined
                }
                value={data.invoiceNo}
                onChange={(e) => set({ invoiceNo: e.target.value })}
                placeholder="015/III/SFL/25"
                aria-invalid={!!numberError}
              />
            ) : (
              <input
                className="field cursor-not-allowed bg-soft text-ink-2"
                value={data.invoiceNo}
                readOnly
                tabIndex={-1}
                placeholder={addendum ? "Choose a parent invoice…" : undefined}
              />
            )}
            {(manualNo || addendum) && numberError && (
              <span className="mt-1 block text-[11px] font-medium text-overdue">
                {numberError}
              </span>
            )}
          </Field>

          <Field label="Date">
            <input
              type="date"
              className="field"
              value={data.invoiceDate}
              onChange={(e) => set({ invoiceDate: e.target.value })}
            />
          </Field>
        </div>

        {setManualNo && !addendum && (
          <label className="flex items-start gap-2 text-xs text-ink-2">
            <input
              type="checkbox"
              className="check mt-px h-3.5 w-3.5"
              checked={manualNo}
              onChange={(e) => setManualNo(e.target.checked)}
            />
            <span>
              {isNew
                ? "Type the number myself (for backlog entries)"
                : "Correct the invoice number by hand"}
            </span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Label">
            <select
              className="field"
              value={data.copyLabel}
              onChange={(e) => set({ copyLabel: e.target.value })}
            >
              <option value="ORIGINAL">ORIGINAL</option>
              <option value="COPY">COPY</option>
            </select>
          </Field>
          <Field label="Payment terms">
            <input
              className="field"
              value={data.paymentTerms}
              onChange={(e) => set({ paymentTerms: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Payment due">
          <div className="flex">
            <input
              type="number"
              step="1"
              min="1"
              className="field field-num flex-1"
              value={data.dueDays || ""}
              onChange={(e) =>
                set({ dueDays: parseInt(e.target.value) || undefined })
              }
              placeholder="30"
            />
            <span className="lbl flex items-center border border-l-0 border-line bg-soft px-3">
              days
            </span>
          </div>
          {(() => {
            const due = dueDateOf(data.invoiceDate, data.dueDays);
            return (
              <span className="note mt-1.5 block text-[11px]">
                {due
                  ? `Falls due ${fmtDate(due)}`
                  : "Leave empty if they pay on the spot — it will never count as late."}
              </span>
            );
          })()}
        </Field>

        <Field label="Invoiced by" hint="optional">
          <input
            className="field"
            value={data.invoicedBy ?? ""}
            onChange={(e) => set({ invoicedBy: e.target.value })}
            placeholder="Sapta Fajri"
          />
          <span className="note mt-1.5 block text-[11px]">
            Hidden from the printed document when empty.
          </span>
        </Field>
      </Section>

      <Section title="Customer">
        {customers.length > 0 && (
          <Field label="Fill from a saved customer">
            <div className="flex gap-2">
              <select
                className="field"
                value=""
                onChange={(e) => pickCustomer(e.target.value)}
              >
                <option value="">— choose a customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearCustomer}
                title="Clear the customer fields"
                className="btn btn-sm shrink-0 hover:text-overdue"
              >
                Clear
              </button>
            </div>
          </Field>
        )}

        <Field label="Customer name">
          <input
            className="field"
            value={data.invoiceTo.name}
            onChange={(e) =>
              set({ invoiceTo: { ...data.invoiceTo, name: e.target.value } })
            }
            placeholder="PT. Example Indonesia"
          />
        </Field>

        <Field label="Address" hint="one line each">
          <textarea
            className="field resize-y"
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

        <Field label="Tax ID (NPWP)">
          <input
            className="field"
            value={data.invoiceTo.taxId}
            onChange={(e) =>
              set({ invoiceTo: { ...data.invoiceTo, taxId: e.target.value } })
            }
            placeholder="00.000.000.0-000.000"
          />
        </Field>
      </Section>

      <Section title="Shipment">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bill of lading">
            <input
              className="field"
              value={data.shipment.billOfLading}
              onChange={(e) =>
                set({
                  shipment: { ...data.shipment, billOfLading: e.target.value },
                })
              }
              placeholder="MEDURQ995991"
            />
          </Field>
          <Field label="Vessel / voyage">
            <input
              className="field"
              value={data.shipment.vesselVoyage}
              onChange={(e) =>
                set({
                  shipment: { ...data.shipment, vesselVoyage: e.target.value },
                })
              }
              placeholder="MSC MANU IV"
            />
          </Field>
          <Field label="Loading port">
            <input
              className="field"
              value={data.shipment.loadingPort}
              onChange={(e) =>
                set({
                  shipment: { ...data.shipment, loadingPort: e.target.value },
                })
              }
              placeholder="Panjang, ID"
            />
          </Field>
          <Field label="Discharge port">
            <input
              className="field"
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
              className="field"
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
              className="field"
              value={data.shipment.etd}
              onChange={(e) =>
                set({ shipment: { ...data.shipment, etd: e.target.value } })
              }
            />
          </Field>
          <Field label="Quantity">
            <input
              className="field"
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
        <Field label="Invoice currency">
          <div className="flex">
            {(
              [
                ["usd_idr", "USD + IDR"],
                ["idr", "IDR only"],
                ["usd", "USD only"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCurrencyMode(val)}
                aria-pressed={currencyMode === val}
                className={`lbl flex-1 border border-r-0 border-line px-2 py-2 transition-colors last:border-r ${
                  currencyMode === val
                    ? "lbl-strong border-ink-2 bg-soft"
                    : "hover:bg-soft"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="note mt-1.5 block text-[11px]">
            {currencyMode === "usd_idr"
              ? "Lines may be USD or IDR; the exchange rate and USD bank appear on the document."
              : currencyMode === "idr"
                ? "Every line in rupiah; the rate line and USD bank are hidden."
                : "Every line in USD, with no rupiah conversion and no tax (VAT and PPh off)."}
          </span>
        </Field>

        {usesUsd && !usdOnly && (
          <Field label="Exchange rate" hint="IDR per USD 1">
            <input
              type="number"
              step="any"
              min="0"
              className="field field-num"
              value={data.exchangeRate || ""}
              onChange={(e) =>
                set({ exchangeRate: parseFloat(e.target.value) || 0 })
              }
              placeholder="18436.61"
            />
          </Field>
        )}

        <div className="-mx-1 overflow-x-auto">
          <table className="w-full px-1 text-sm">
            <thead>
              <tr>
                <th className="w-5 pb-1.5"></th>
                <th className="lbl pb-1.5 pr-2 text-left">Description</th>
                <th className="lbl pb-1.5 pr-2 text-left">Curr</th>
                <th className="lbl pb-1.5 pr-2 text-left">Price</th>
                <th className="lbl pb-1.5 pr-2 text-left">Qty</th>
                <th className="lbl pb-1.5 pr-2 text-right">
                  {usdOnly ? "USD" : "IDR"}
                </th>
                <th className="w-7 pb-1.5"></th>
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
                  <td className="py-1 align-middle">
                    {item.pinned ? (
                      <span
                        className="block text-ink-3"
                        title="Always stays at the bottom"
                      >
                        <IconAnchor className="h-4 w-4" />
                      </span>
                    ) : (
                      <span
                        draggable
                        onDragStart={() => setDragIndex(i)}
                        onDragEnd={() => setDragIndex(null)}
                        className="block cursor-grab text-ink-3 transition-colors select-none hover:text-ink active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        <IconGrip className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      className="field"
                      value={item.description}
                      onChange={(e) =>
                        setItem(i, { description: e.target.value })
                      }
                      placeholder="Ocean Freight"
                      aria-label="Description"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    {usesUsd && !usdOnly ? (
                      <select
                        className="field w-[4.75rem] px-1.5"
                        value={item.currency}
                        aria-label="Currency"
                        onChange={(e) =>
                          setItem(i, {
                            currency: e.target.value as LineItem["currency"],
                          })
                        }
                      >
                        <option value="USD">USD</option>
                        <option value="IDR">IDR</option>
                      </select>
                    ) : (
                      <span className="lbl inline-block w-[4.75rem] px-1.5">
                        {usdOnly ? "USD" : "IDR"}
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="field field-num w-24 px-1.5"
                      value={item.unitPrice || ""}
                      aria-label="Unit price"
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
                      className="field field-num w-14 px-1.5"
                      value={item.qty || ""}
                      aria-label="Quantity"
                      onChange={(e) =>
                        setItem(i, { qty: parseInt(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="fig py-1 pr-2 text-right text-xs">
                    {fmtMoney(
                      itemDisplayAmount(item, data),
                      usdOnly ? "USD" : "IDR"
                    )}
                  </td>
                  <td className="py-1">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="btn btn-quiet p-1 hover:text-overdue"
                      title="Remove this line"
                      aria-label="Remove this line"
                    >
                      <IconClose className="h-3.5 w-3.5" />
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
          className="btn btn-sm w-full border-dashed"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Add a line
        </button>

        {!usdOnly && (
          <div className="space-y-2 border-t border-line pt-3">
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                className="check"
                checked={data.vatEnabled}
                onChange={(e) => set({ vatEnabled: e.target.checked })}
              />
              <span className="font-medium text-ink">Charge VAT (PPN)</span>
            </label>
            {data.vatEnabled && (
              <div className="ml-6 space-y-1.5">
                {(Object.keys(VAT_VARIANTS) as VatVariant[]).map((v) => {
                  const info = VAT_VARIANTS[v];
                  const pct = (info.rate * 100).toLocaleString("en-GB", {
                    maximumFractionDigits: 2,
                  });
                  return (
                    <label
                      key={v}
                      className="flex items-center gap-2 text-xs text-ink-2"
                    >
                      <input
                        type="radio"
                        name="vatVariant"
                        checked={(data.vatVariant ?? "reduced") === v}
                        onChange={() =>
                          set({ vatVariant: v, vatLabel: info.label })
                        }
                      />
                      <span>
                        {info.label}{" "}
                        <span className="fig text-ink">({pct}%)</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Bank accounts">
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ["bankIdr", "Rupiah account"],
              ["bankUsd", "USD account"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2.5">
              <div className="lbl lbl-strong border-b border-line pb-1.5">
                {label}
              </div>
              <Field label="Bank">
                <input
                  className="field"
                  value={data[key].bank}
                  onChange={(e) => setBank(key, { bank: e.target.value })}
                />
              </Field>
              <Field label="Account no.">
                <input
                  className="field"
                  value={data[key].accNo}
                  onChange={(e) => setBank(key, { accNo: e.target.value })}
                />
              </Field>
              <Field label="Account name">
                <input
                  className="field"
                  value={data[key].accName}
                  onChange={(e) => setBank(key, { accName: e.target.value })}
                />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Company header">
        <Field label="Company name">
          <input
            className="field"
            value={data.company.name}
            onChange={(e) =>
              set({ company: { ...data.company, name: e.target.value } })
            }
          />
        </Field>
        <Field label="Address" hint="one line each">
          <textarea
            className="field resize-y"
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
            className="field"
            value={data.company.mobile}
            onChange={(e) =>
              set({ company: { ...data.company, mobile: e.target.value } })
            }
          />
        </Field>
        <Field label="Signature name" hint="bottom right of the document">
          <input
            className="field"
            value={data.signatureName ?? DEFAULT_SIGNER}
            onChange={(e) => set({ signatureName: e.target.value })}
          />
        </Field>
      </Section>
    </div>
  );
}
