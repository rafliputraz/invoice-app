"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Dialog from "@/components/Dialog";
import Avatar from "@/components/Avatar";
import useReveal from "@/components/useReveal";
import { fmtDate } from "@/lib/format";
import { IconPlus, IconSearch, IconKey, IconTrash } from "@/components/Icons";

interface UserRow {
  id: number;
  username: string;
  name: string;
  role: "admin" | "member";
  createdAt: string;
  lastSeen: string | null;
  lastLogout: string | null;
}

interface Me {
  id: number;
  username: string;
  name: string;
  role: string;
}

/** Split "2026-07-19 13:31:09" into a friendly date + time. */
function splitStamp(s: string): { date: string; time: string } {
  const [d, t] = s.split(" ");
  return { date: d ? fmtDate(d) : s, time: t?.slice(0, 5) ?? "" };
}

/**
 * Last-active state. "Online" means the user was active within the last few
 * minutes AND has not logged out since — so logging out shows them offline
 * immediately even though they were just active.
 */
function lastActive(
  lastSeen: string | null,
  lastLogout: string | null
): { text: string; online: boolean; never: boolean } {
  if (!lastSeen)
    return { text: "Never signed in", online: false, never: true };
  const then = new Date(lastSeen.replace(" ", "T")).getTime();
  if (Number.isNaN(then)) return { text: "—", online: false, never: false };
  const mins = Math.floor((Date.now() - then) / 60000);
  const loggedOut = lastLogout != null && lastLogout >= lastSeen;
  if (mins < 3 && !loggedOut)
    return { text: "Active", online: true, never: false };
  if (mins < 1) return { text: "Just now", online: false, never: false };
  if (mins < 60) return { text: `${mins} min ago`, online: false, never: false };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { text: `${hours} h ago`, online: false, never: false };
  if (hours < 48) return { text: "Yesterday", online: false, never: false };
  return {
    text: fmtDate(lastSeen.split(" ")[0]),
    online: false,
    never: false,
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
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
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  };

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u: Me | null) => setMe(u))
      .catch(() => {});
    // Refresh periodically so the "last active" times tick and online/offline
    // status stays current without needing a manual reload.
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
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
      setError(body.error || "Could not add the user.");
      return;
    }
    setForm({ username: "", name: "", password: "", role: "member" });
    setAddOpen(false);
    load();
  };

  const removeUser = async (u: UserRow) => {
    if (!confirm(`Remove user "${u.username}"? They lose access immediately.`))
      return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error || "Could not remove the user.");
      return;
    }
    load();
  };

  // Admin reset-password dialog.
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
      setResetMsg("Password must be at least 6 characters.");
      return;
    }
    if (resetPw !== resetConfirm) {
      setResetMsg("The confirmation does not match.");
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
      setResetMsg(body.error || "Could not reset the password.");
      return;
    }
    closeReset();
  };

  const changeRole = async (u: UserRow, role: "admin" | "member") => {
    if (u.role === role) return;
    setError("");
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error || "Could not change the role.");
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

  const root = useReveal<HTMLDivElement>(filtered.length);

  return (
    <AppShell
      active="users"
      title="Users"
      subtitle="Everyone with access to the register. Each person needs their own account — invoices record who created them."
    >
      <div ref={root}>
        {error && (
          <p
            role="alert"
            className="anim-card mb-4 rounded-xl bg-overdue-soft px-4 py-3 text-[13px] font-semibold text-overdue"
          >
            {error}
          </p>
        )}

        <section className="anim-card card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-5">
            <div className="mr-auto flex items-center gap-2.5">
              <h2 className="h-sec">Team members</h2>
              <span className="pill pill-neutral">
                {users.length} {users.length === 1 ? "user" : "users"}
              </span>
            </div>
            <div className="relative w-full sm:w-60">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                type="search"
                placeholder="Search name or username"
                aria-label="Search users"
                className="field pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button onClick={() => setAddOpen(true)} className="btn btn-primary">
              <IconPlus className="h-4 w-4" />
              Add user
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="register">
              <thead>
                <tr>
                  <th scope="col" className="pl-5">
                    Name
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Role</th>
                  <th scope="col">Added</th>
                  <th scope="col" className="pr-5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <p className="text-[15px] font-bold text-ink">
                        {users.length === 0
                          ? "Loading…"
                          : "Nothing matches that search"}
                      </p>
                      {users.length > 0 && (
                        <p className="note mt-1">Try a different name.</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const isYou = me?.id === u.id;
                    const active = lastActive(u.lastSeen, u.lastLogout);
                    const added = splitStamp(u.createdAt);
                    return (
                      <tr key={u.id} className="anim-row">
                        <td className="pl-5">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name || u.username} />
                            <div className="min-w-0">
                              <p className="truncate text-[13.5px] font-bold text-ink">
                                {u.name || u.username}
                                {isYou && (
                                  <span className="ml-1.5 text-[11.5px] font-medium text-ink-3">
                                    you
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-[12px] text-ink-3">
                                @{u.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              active.online
                                ? "pill-paid"
                                : active.never
                                  ? "pill-neutral"
                                  : "pill-neutral"
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`h-1.5 w-1.5 rounded-full ${
                                active.online ? "bg-paid" : "bg-ink-3"
                              }`}
                            />
                            {active.text}
                          </span>
                        </td>
                        <td>
                          {isYou ? (
                            <span
                              className={`pill ${
                                u.role === "admin" ? "pill-open" : "pill-neutral"
                              }`}
                            >
                              {u.role}
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              aria-label={`Role for ${u.username}`}
                              onChange={(e) =>
                                changeRole(
                                  u,
                                  e.target.value as "admin" | "member"
                                )
                              }
                              className="field w-auto py-1.5 text-[12.5px]"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>
                          )}
                        </td>
                        <td>
                          <p className="text-[13px] text-ink-2">{added.date}</p>
                          {added.time && (
                            <p className="text-[11.5px] text-ink-3">
                              {added.time}
                            </p>
                          )}
                        </td>
                        <td className="pr-5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setResetUser(u)}
                              title={`Reset password for @${u.username}`}
                              aria-label={`Reset password for @${u.username}`}
                              className="btn btn-quiet p-1.5"
                            >
                              <IconKey className="h-4 w-4" />
                            </button>
                            {!isYou && (
                              <button
                                onClick={() => removeUser(u)}
                                title={`Remove @${u.username}`}
                                aria-label={`Remove @${u.username}`}
                                className="btn btn-quiet p-1.5 hover:text-overdue"
                              >
                                <IconTrash className="h-4 w-4" />
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

          <p className="note border-t border-line px-5 py-4 text-[12.5px]">
            Passwords are stored hashed. Anyone can change their own from the key
            icon in the top bar; an admin can reset any password from this table.
          </p>
        </section>
      </div>

      {/* Add a user */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a user"
        note="They can sign in as soon as you save."
        footer={
          <>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-user"
              disabled={busy}
              className="btn btn-primary"
            >
              {busy ? "Adding…" : "Add user"}
            </button>
          </>
        }
      >
        <form id="add-user" onSubmit={addUser} className="space-y-4">
          <label className="block">
            <span className="lbl lbl-strong mb-1.5 block">Username</span>
            <input
              className="field"
              placeholder="john.doe"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="lbl lbl-strong mb-1.5 block">Display name</span>
            <input
              className="field"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="lbl lbl-strong mb-1.5 block">Password</span>
            <input
              type="password"
              className="field"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <label className="block">
            <span className="lbl lbl-strong mb-1.5 block">Role</span>
            <select
              className="field"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="member">Member — can issue and edit invoices</option>
              <option value="admin">Admin — also manages users and trash</option>
            </select>
          </label>
        </form>
      </Dialog>

      {/* Reset a password */}
      <Dialog
        open={resetUser !== null}
        onClose={closeReset}
        title="Reset password"
        note={resetUser ? `for @${resetUser.username}` : undefined}
        width="sm"
        footer={
          <>
            <button type="button" onClick={closeReset} className="btn">
              Cancel
            </button>
            <button
              type="submit"
              form="reset-password"
              disabled={resetBusy}
              className="btn btn-primary"
            >
              {resetBusy ? "Saving…" : "Reset password"}
            </button>
          </>
        }
      >
        <form id="reset-password" onSubmit={submitReset} className="space-y-4">
          <label className="block">
            <span className="lbl lbl-strong mb-1.5 block">New password</span>
            <input
              type="password"
              className="field"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <label className="block">
            <span className="lbl lbl-strong mb-1.5 block">
              Confirm new password
            </span>
            <input
              type="password"
              className="field"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {resetMsg && (
            <p
              role="alert"
              className="rounded-xl bg-overdue-soft px-3.5 py-2.5 text-[13px] font-semibold text-overdue"
            >
              {resetMsg}
            </p>
          )}
          <p className="note text-[12.5px]">
            They will use this password from their next sign-in.
          </p>
        </form>
      </Dialog>
    </AppShell>
  );
}
