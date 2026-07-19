import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

function createDb(): Database.Database {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "invoices.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seq INTEGER NOT NULL,
      year INTEGER NOT NULL,
      invoice_no TEXT NOT NULL UNIQUE,
      invoice_date TEXT NOT NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      total_idr INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      address_lines TEXT NOT NULL DEFAULT '[]',
      tax_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT
    );
  `);

  // Migration: track which user created each invoice.
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN created_by TEXT DEFAULT ''");
  } catch {
    // column already exists
  }

  // Migration: paid/unpaid tracking.
  try {
    db.exec(
      "ALTER TABLE invoices ADD COLUMN status TEXT NOT NULL DEFAULT 'unpaid'"
    );
  } catch {
    // column already exists
  }

  // Migration: payment due date (invoice_date + payment term days).
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN due_date TEXT");
  } catch {
    // column already exists
  }

  // Migration: soft delete (recycle bin) — NULL means the invoice is live.
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN deleted_at TEXT");
  } catch {
    // column already exists
  }

  // Migration: track when each user was last active (updated via /api/auth/me).
  try {
    db.exec("ALTER TABLE users ADD COLUMN last_seen TEXT");
  } catch {
    // column already exists
  }

  // First run: seed the admin account from env (fallback admin / admin123 —
  // change AUTH_ADMIN_PASSWORD in .env before deploying).
  const userCount = (
    db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }
  ).n;
  if (userCount === 0) {
    const username = process.env.AUTH_ADMIN_USER || "admin";
    const password = process.env.AUTH_ADMIN_PASSWORD || "admin123";
    db.prepare(
      "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, 'admin')"
    ).run(username, bcrypt.hashSync(password, 10), "Administrator");
  }

  return db;
}

// Singleton that survives Next.js dev-server hot reloads.
const globalForDb = globalThis as unknown as { __sflDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__sflDb) {
    globalForDb.__sflDb = createDb();
  }
  return globalForDb.__sflDb;
}

/**
 * Next free sequence number for a given 2-digit year (resets each year).
 * Intentionally counts soft-deleted rows too: trashed invoices keep their
 * number, so numbers are never reused and restore can't hit the UNIQUE
 * invoice_no constraint.
 */
export function nextSeq(db: Database.Database, year: number): number {
  const row = db
    .prepare("SELECT MAX(seq) AS maxSeq FROM invoices WHERE year = ?")
    .get(year) as { maxSeq: number | null };
  return (row.maxSeq ?? 0) + 1;
}
