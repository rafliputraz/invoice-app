"use client";

import { useState } from "react";
import Dialog from "./Dialog";
import { TOUR_EVENT } from "./GuidedTour";
import { IconHelp } from "./Icons";

function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="lbl lbl-strong mb-2">{title}</h3>
      <div className="max-w-[70ch] space-y-2 text-[13px] leading-relaxed text-ink-2">
        {children}
      </div>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        aria-hidden
        className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-xs bg-soft text-[11px] font-semibold text-ink-2"
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function HelpGuide({
  variant = "button",
}: {
  /** "sidebar" renders the call-to-action inside the sidebar's help card. */
  variant?: "button" | "sidebar";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "sidebar" ? (
        <button
          onClick={() => setOpen(true)}
          data-tour="help"
          title="How to use this app"
          className="btn btn-primary btn-sm w-full"
        >
          <IconHelp className="h-4 w-4" />
          Open the guide
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          data-tour="help"
          title="How to use this app"
          className="btn btn-sm"
        >
          <IconHelp className="h-4 w-4" />
          Guide
        </button>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="How to use this app"
        note="Working the invoice register end to end"
        width="lg"
        footer={
          <button
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new Event(TOUR_EVENT));
            }}
            className="btn btn-quiet btn-sm"
          >
            ↻ Replay the walkthrough
          </button>
        }
      >
        <div className="max-h-[64vh] space-y-6 overflow-y-auto pr-1">
          <GuideSection title="1 · Creating an invoice">
            <ol className="space-y-2">
              <Step n={1}>
                Click <b>New Invoice</b> at the top right, then choose a fresh
                invoice or an addendum on an existing bill of lading.
              </Step>
              <Step n={2}>
                The invoice number fills in <b>automatically</b> from the date.
                Turn on manual entry only for backlog numbers.
              </Step>
              <Step n={3}>
                Fill in the customer under <i>Invoice to</i> — or faster, pick a
                saved customer and the name, address and NPWP fill themselves.
                Then complete the shipment details and the charges. For USD
                lines, set the <b>exchange rate</b> so the rupiah conversion is
                right.
              </Step>
              <Step n={4}>
                Set <b>payment terms in days</b> (7, 14, 40 — whatever you
                agreed). <b>Leave it empty if they pay on the spot</b>; an
                invoice with no term never counts as late.
              </Step>
              <Step n={5}>
                Click <b>Save</b>. The invoice takes its final number and joins
                the register.
              </Step>
            </ol>
          </GuideSection>

          <GuideSection title="2 · Printing and PDF">
            <p>
              Open an invoice and click <b>Print</b>, or use the print button
              directly on a register row — the print dialog opens by itself. To
              keep a file, choose &ldquo;Save as PDF&rdquo; as the printer, or
              use the <b>PDF</b> button.
            </p>
          </GuideSection>

          <GuideSection title="3 · Recording a payment">
            <p>
              Click the <b>status pill</b> on the invoice&rsquo;s row. A dialog
              captures the payment date, the amount actually banked, and — when
              the customer withholds PPh — the rate and the bukti potong number.
              To undo it, reopen the same dialog and use <b>Mark unpaid</b>;
              that clears the whole payment record, including the PPh cut.
            </p>
            <p>
              If less arrived than expected, enter the real figure. The invoice
              is then marked <span className="pill pill-short">Short</span>, the
              gap shows under the amount on its row, and it is called out under
              <b> Banked</b> at the top of the dashboard.
            </p>
          </GuideSection>

          <GuideSection title="4 · Reading the status pills">
            <p>
              Every invoice carries a pill saying exactly where it stands, so
              nothing depends on colour alone:
            </p>
            <ul className="space-y-1.5">
              <li>
                <span className="pill pill-neutral">14d left</span> — in hand,
                counting down to its due date.
              </li>
              <li>
                <span className="pill pill-neutral">No term</span> — no payment
                term was agreed, so this one can never run late.
              </li>
              <li>
                <span className="pill pill-open">3d left</span> — due within a
                week. Worth a follow-up.
              </li>
              <li>
                <span className="pill pill-overdue">Late 6d</span> — past its
                due date. <b>Chase this one.</b> It is also totalled in the
                Overdue card at the top.
              </li>
              <li>
                <span className="pill pill-short">Short</span> — paid, but less
                arrived than the invoice asked for.
              </li>
              <li>
                <span className="pill pill-paid">Paid</span> — settled in full.
              </li>
            </ul>
            <p>
              The same three colours run through the donut and the monthly bar
              chart, so green, blue and red mean the same thing everywhere.
              Click <b>Overdue</b> in the filter row to see everything late at
              once.
            </p>
          </GuideSection>

          <GuideSection title="5 · Searching, filtering and export">
            <p>
              Type an invoice number or customer name into the search box. The
              buttons under it filter by status, and the two dropdowns pick a
              month and change the sort. Tick the boxes on the left to move
              several invoices to the trash at once. <b>Export</b> downloads a
              spreadsheet matching whatever filters are on — but the four
              figures and both charts at the top always cover <b>every</b>{" "}
              invoice, filters or not.
            </p>
          </GuideSection>

          <GuideSection title="6 · Customers">
            <p>
              The <b>Customers</b> page does two jobs: it shows what each
              customer owes — total, outstanding and overdue, largest first,
              with a bar showing how much of their billing has been collected —
              and it holds saved customer details. Click a row to open their
              panel on the right; add or edit names, addresses and NPWP so they
              fill the invoice form for you.
            </p>
          </GuideSection>

          <GuideSection title="7 · Editing and deleting">
            <p>
              Click an invoice number, or the pencil on its row, to open and
              edit it — the number does not change even if you edit the date. Deleting moves an invoice to{" "}
              <b>Trash</b> rather than removing it; an admin can restore it or
              clear it permanently from there.
            </p>
          </GuideSection>

          <GuideSection title="8 · Accounts (admins only)">
            <p>
              Admins add and remove accounts under <b>Users</b>. Everyone should
              have their own login so each invoice records who created it.
            </p>
          </GuideSection>

          <p className="well px-3 py-2.5 text-xs leading-relaxed text-ink-2">
            <b className="text-ink">Three habits</b> keep the register honest:
            set the payment term as agreed, record the payment the day it
            lands, and check the Overdue card each morning.
          </p>
        </div>
      </Dialog>
    </>
  );
}
