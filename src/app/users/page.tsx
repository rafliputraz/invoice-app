"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { fmtDate } from "@/lib/format";

interface UserRow {
  id: number;
  username: string;
  name: string;
  role: "admin" | "member";
  createdAt: string;
  lastSeen: string | null;
}

interface Me {
  id: number;
  username: string;
  name: string;
  role: string;
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

/** Split "2026-07-19 13:31:09" into a friendly date + time. */
function splitStamp(s: string): { date: string; time: string } {
  const [d, t] = s.split(" ");
  return { date: d ? fmtDate(d) : s, time: t?.slice(0, 8) ?? "" };
}

/** Relative "last active" label; online if seen within ~3 minutes. */
function lastActive(iso: string | null): { text: string; online: boolean } {
  if (!iso) return { text: "Belum pernah", online: false };
  const then = new Date(iso.replace(" ", "T")).getTime();
  if (Number.isNaN(then)) return { text: "—", online: false };
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 3) return { text: "Online now", online: true };
  if (mins < 60) return { text: `${mins} menit lalu`, online: false };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { text: `${hours} jam lalu`, online: false };
  if (hours < 48) return { text: "Kemarin", online: false };
  return { text: fmtDate(iso.split(" ")[0]), online: false };
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition-colors focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    username: "",
    name: "",
    password: "",
    role: "member",
  });
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetch("/api/users")
      .then(async (r) => {
        if (!r.ok) throw new Error("Only admins can manage users");
        setUsers((await r.json()) as UserRow[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  };

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u: Me | null) => setMe(u))
      .catch(() => {});
  }, []);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error || "Failed to add user");
      return;
    }
    setForm({ username: "", name: "", password: "", role: "member" });
    load();
  };

  const removeUser = async (u: UserRow) => {
    if (!confirm(`Remove user "${u.username}"?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error || "Failed to delete user");
      return;
    }
    load();
  };

  // Admin reset-password modal.
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const closeReset = () => {
    setResetUser(null);
    setResetPw("");
    setResetConfirm("");
    setResetMsg("");
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setResetMsg("");
    if (resetPw.length < 6) {
      setResetMsg("Password minimal 6 karakter");
      return;
    }
    if (resetPw !== resetConfirm) {
      setResetMsg("Konfirmasi tidak cocok");
      return;
    }
    setResetBusy(true);
    const res = await fetch(`/api/users/${resetUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPw }),
    });
    setResetBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setResetMsg(body.error || "Gagal reset password");
      return;
    }
    closeReset();
  };

  const changeRole = async (u: UserRow, role: "admin" | "member") => {
    if (u.role === role) return;
    setError("");
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, role } : x))
    );
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error || "Failed to change role");
      load(); // roll back to server state
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q)
      )
    : users;

  return (
    <AppShell
      active="users"
      title="Team Management"
      subtitle="Kelola akun tim — pastikan setiap orang punya akunnya sendiri demi keamanan data."
    >
      <div className="mx-auto max-w-[1000px] space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
            {error}
          </div>
        )}

        {/* Security policy banner */}
        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="shrink-0 rounded-lg bg-white p-1.5 text-indigo-600 shadow-sm">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-900">
              Kebijakan Password & Keamanan
            </h4>
            <p className="mt-0.5 text-xs leading-relaxed text-indigo-700/80">
              Semua password disimpan sebagai hash (bcrypt) di database. Tiap
              user bisa <strong>mengganti password sendiri</strong> lewat ikon
              gembok di profil (kiri bawah); admin bisa{" "}
              <strong>reset password</strong> siapa pun lewat tombol “Reset PW”
              di tabel.
            </p>
          </div>
        </div>

        {/* Add user card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Tambah User Baru
            </h3>
          </div>
          <div className="p-6">
            <form
              onSubmit={addUser}
              className="grid grid-cols-1 items-end gap-4 md:grid-cols-5"
            >
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Username
                </label>
                <input
                  className={inputCls}
                  placeholder="mis. john.doe"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Display Name
                </label>
                <input
                  className={inputCls}
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  className={`${inputCls} tracking-wider`}
                  placeholder="Min. 6 karakter"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Role
                </label>
                <select
                  className={inputCls}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {busy ? "Menambah…" : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* User list */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-bold text-slate-800">
              Active Team Members ({users.length})
            </h3>
            <div className="relative hidden w-48 sm:block">
              <svg
                className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Cari member…"
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-900 transition-colors outline-none focus:border-blue-500 focus:bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Added On
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold tracking-wider text-slate-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                      {users.length === 0 ? "Loading…" : "Tidak ada yang cocok."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const isYou = me?.id === u.id;
                    const active = lastActive(u.lastSeen);
                    const added = splitStamp(u.createdAt);
                    return (
                      <tr
                        key={u.id}
                        className="group transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-sm ${
                                  u.role === "admin"
                                    ? "border-blue-200 bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-700"
                                    : "border-slate-200 bg-slate-100 text-slate-500"
                                }`}
                              >
                                {initialsOf(u.name)}
                              </div>
                              {active.online && (
                                <div className="absolute -right-0.5 -bottom-0.5 z-10 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">
                                {u.name}
                                {isYou && (
                                  <span className="ml-1 text-[10px] font-normal text-slate-400">
                                    (You)
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 font-mono text-xs text-slate-500">
                                @{u.username}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isYou ? (
                            <span
                              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold ${
                                u.role === "admin"
                                  ? "border-purple-200 bg-purple-50 text-purple-700"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                              }`}
                            >
                              {u.role}
                            </span>
                          ) : (
                            <div className="relative inline-block">
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  changeRole(
                                    u,
                                    e.target.value as "admin" | "member"
                                  )
                                }
                                className={`cursor-pointer appearance-none rounded-md border py-1 pr-7 pl-2.5 text-[11px] font-bold transition-colors focus:outline-none ${
                                  u.role === "admin"
                                    ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                                    : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <option value="admin">admin</option>
                                <option value="member">member</option>
                              </select>
                              <svg
                                className={`pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 ${
                                  u.role === "admin"
                                    ? "text-purple-500"
                                    : "text-slate-500"
                                }`}
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
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {active.online ? (
                              <span className="text-xs font-semibold text-emerald-600">
                                Online now
                              </span>
                            ) : (
                              <>
                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                <span className="text-xs font-medium text-slate-500">
                                  {active.text}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-700">
                              {added.date}
                            </span>
                            {added.time && (
                              <span className="text-xs text-slate-400">
                                {added.time}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="ml-auto flex items-center justify-end gap-1">
                            <button
                              onClick={() => setResetUser(u)}
                              className="rounded px-2.5 py-1.5 text-xs font-semibold text-slate-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700"
                            >
                              Reset PW
                            </button>
                            {!isYou && (
                              <button
                                onClick={() => removeUser(u)}
                                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold text-rose-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-700"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Admin reset-password modal */}
      {resetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeReset}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Reset Password
                </h2>
                <p className="text-xs text-slate-500">
                  untuk <span className="font-mono">@{resetUser.username}</span>
                </p>
              </div>
              <button
                onClick={closeReset}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submitReset} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Password baru
                </label>
                <input
                  type="password"
                  className={inputCls}
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  placeholder="Min. 6 karakter"
                  autoFocus
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
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  required
                />
              </div>
              {resetMsg && (
                <p className="text-xs font-medium text-rose-500">{resetMsg}</p>
              )}
              <p className="text-[11px] text-slate-400">
                User akan langsung memakai password baru ini saat login
                berikutnya.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeReset}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {resetBusy ? "Menyimpan…" : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
