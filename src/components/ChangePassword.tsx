"use client";

import { useState } from "react";
import Dialog from "./Dialog";
import { IconKey } from "./Icons";

/** Self-service "change my password" — trigger button + dialog. */
export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setMsg("");
    setOk(false);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setOk(false);
    if (next.length < 6) {
      setMsg("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      setMsg("The confirmation does not match the new password.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(body.error || "Could not change the password. Try again.");
      return;
    }
    setOk(true);
    setMsg("Password changed.");
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Change password"
        aria-label="Change password"
        className="btn btn-quiet p-1.5"
      >
        <IconKey className="h-[18px] w-[18px]" />
      </button>

      <Dialog
        open={open}
        onClose={close}
        title="Change password"
        width="sm"
        footer={
          <>
            <button type="button" onClick={close} className="btn">
              {ok ? "Close" : "Cancel"}
            </button>
            <button
              type="submit"
              form="change-password"
              disabled={busy}
              className="btn btn-primary"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <form id="change-password" onSubmit={submit} className="space-y-3.5">
          <label className="block">
            <span className="lbl mb-1.5 block">Current password</span>
            <input
              type="password"
              className="field"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="block">
            <span className="lbl mb-1.5 block">New password</span>
            <input
              type="password"
              className="field"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <label className="block">
            <span className="lbl mb-1.5 block">Confirm new password</span>
            <input
              type="password"
              className="field"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {msg && (
            <p
              role="status"
              className={`border px-2.5 py-1.5 text-xs font-medium ${
                ok
                  ? "border-paid/30 bg-paid-soft text-paid"
                  : "border-overdue/30 bg-overdue-soft text-overdue"
              }`}
            >
              {msg}
            </p>
          )}
        </form>
      </Dialog>
    </>
  );
}
