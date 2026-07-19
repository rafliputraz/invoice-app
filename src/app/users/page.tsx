"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UserRow {
  id: number;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

const inputCls =
  "w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
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

  useEffect(load, []);

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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">Team Users</h1>
          <Link
            href="/"
            className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            ← Invoices
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-6">
        {error && (
          <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={addUser}
          className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-5"
        >
          <input
            className={inputCls}
            placeholder="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            className={inputCls}
            placeholder="Display name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={inputCls}
            type="password"
            placeholder="password (min 6)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
          <select
            className={inputCls}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            + Add user
          </button>
        </form>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Username</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-mono">{u.username}</td>
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {u.createdAt}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => removeUser(u)}
                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400">
          Passwords are stored hashed (bcrypt). To change someone&apos;s
          password, remove the user and add them again.
        </p>
      </main>
    </div>
  );
}
