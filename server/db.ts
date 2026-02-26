import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'nest.db');

let db: Database.Database;

export function getDb(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);

        // Enable WAL mode for better performance
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        // Initialize tables
        initTables(db);

        console.log(`[DB] SQLite database initialized at: ${DB_PATH}`);
    }
    return db;
}

function initTables(db: Database.Database): void {
    db.exec(`
    CREATE TABLE IF NOT EXISTS nest_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS state_backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function closeDb(): void {
    if (db) {
        db.close();
        console.log('[DB] Database connection closed.');
    }
}
