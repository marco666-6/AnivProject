/**
 * SQLite connection + schema.
 *
 * Two tiers of data live here:
 *   1. CONTENT  (memories, photos, reasons) — mirrored from content/*.json on every boot.
 *      Source of truth is the JSON. Edit JSON, restart, done.
 *   2. STATE    (scores, unlocks, visits, replies, favourites) — created by actually using
 *      the site. Never wiped by a content re-sync.
 *
 * If better-sqlite3 can't load (e.g. a serverless platform with no native modules),
 * we fall back to an in-memory store so the site still runs. Nothing crashes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

const onVercel = !!process.env.VERCEL;
const configured = process.env.DB_PATH || path.join(ROOT, 'data', 'aniv.sqlite');
export const DB_PATH = onVercel ? '/tmp/aniv.sqlite' : configured;

export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------- content (mirrored from content/*.json) ----------
CREATE TABLE IF NOT EXISTS memories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT UNIQUE NOT NULL,
  date       TEXT NOT NULL,
  icon       TEXT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  photo      TEXT,
  pin        INTEGER DEFAULT 0,
  anchor     INTEGER DEFAULT 0,
  approx     INTEGER DEFAULT 0,
  sort       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS photos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  file       TEXT UNIQUE NOT NULL,
  slug       TEXT,
  date       TEXT,
  title      TEXT,
  caption    TEXT,
  tags       TEXT,
  width      INTEGER,
  height     INTEGER,
  sort       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reasons (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT UNIQUE NOT NULL,
  tone       TEXT DEFAULT 'soft',
  text       TEXT NOT NULL,
  sort       INTEGER DEFAULT 0
);

-- ---------- state (survives content re-syncs) ----------
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game       TEXT NOT NULL,
  player     TEXT DEFAULT 'aby',
  score      INTEGER NOT NULL,
  meta       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game, score DESC);

CREATE TABLE IF NOT EXISTS unlocks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT UNIQUE NOT NULL,
  label      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favourites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,
  ref        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(kind, ref)
);

CREATE TABLE IF NOT EXISTS replies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author     TEXT DEFAULT 'aby',
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  day        TEXT UNIQUE NOT NULL,
  count      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS meta (
  key        TEXT PRIMARY KEY,
  value      TEXT
);
`;

let db = null;
export let driver = 'memory';

try {
  const { default: Database } = await import('better-sqlite3');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.exec(SCHEMA);
  driver = 'sqlite';
  console.log(`[db] sqlite ready → ${DB_PATH}`);
} catch (err) {
  console.warn(`[db] sqlite unavailable (${err.message.split('\n')[0]}) — using in-memory store.`);
  db = null;
  driver = 'memory';
}

export default db;
