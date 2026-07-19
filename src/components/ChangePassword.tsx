"use client";

import { useEffect, useState } from "react";

/** Self-service "change my password" — trigger button + modal. */
export default function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
      setMsg("Password baru minimal 6 karakter");
      return;
    }
    if (next !== confirm) {
      setMsg("Konfirmasi password tidak cocok");
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
      setMsg(body.error || "Gagal mengubah password");
      return;
    }
    setOk(true);
    setMsg("Password berhasil diubah ✓");
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ganti password"
        className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      </button>

      {open && (
        <div
          className="app-font fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-bold text-slate-800">
                Ganti Password
              </h2>
              <button
                onClick={close}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Password saat ini
                </label>
                <input
                  type="password"
                  className={inputCls}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Password baru
                </label>
                <input
                  type="password"
                  className={inputCls}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="Min. 6 karakter"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Konfirmasi password baru
                </label>
                <input
                  type="password"
                  className={inputCls}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {msg && (
                <p
                  className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-rose-500"}`}
                >
                  {msg}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {ok ? "Tutup" : "Batal"}
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
