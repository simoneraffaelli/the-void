import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "canvas.db");

let db: Database.Database;

export function initDb() {
  // Ensure data directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS strokes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `);

  return db;
}

export interface StrokeData {
  id: string;
  type: "draw" | "text";
  points?: { x: number; y: number }[];
  text?: string;
  x?: number;
  y?: number;
  color: string;
  width?: number;
  fontSize?: number;
}

export function getAllStrokes(): StrokeData[] {
  const rows = db.prepare("SELECT id, type, data FROM strokes ORDER BY created_at ASC").all() as {
    id: string;
    type: string;
    data: string;
  }[];
  return rows.map((row) => ({
    ...JSON.parse(row.data),
    id: row.id,
    type: row.type,
  }));
}

export function addStroke(stroke: StrokeData) {
  const stmt = db.prepare("INSERT OR REPLACE INTO strokes (id, type, data) VALUES (?, ?, ?)");
  stmt.run(stroke.id, stroke.type, JSON.stringify(stroke));
}

export function deleteStroke(id: string) {
  db.prepare("DELETE FROM strokes WHERE id = ?").run(id);
}

export function clearAll() {
  db.exec("DELETE FROM strokes");
}
