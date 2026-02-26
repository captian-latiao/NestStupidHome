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
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
    console.log(`[DB] SQLite database initialized at: ${DB_PATH}`);
  }
  return db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    -- 主状态表：按 family_id 存储，同一家庭的账户共享数据
    CREATE TABLE IF NOT EXISTS nest_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id TEXT NOT NULL UNIQUE,
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS state_backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id TEXT NOT NULL DEFAULT 'family_main',
      data TEXT NOT NULL,
      label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 迁移旧数据：将原来 id=1 的单条数据迁移为 family_main
  migrateLegacyData(db);
}

function migrateLegacyData(db: Database.Database): void {
  // 检查旧表结构（没有 family_id 列的情况）
  const tableInfo = db.prepare("PRAGMA table_info(nest_state)").all() as { name: string }[];
  const hasFamilyId = tableInfo.some(col => col.name === 'family_id');

  if (!hasFamilyId) {
    // 旧表结构，需要迁移
    console.log('[DB] 检测到旧数据格式，正在迁移到 family_id 结构...');
    try {
      // 读取旧数据
      const oldRow = db.prepare('SELECT data FROM nest_state WHERE id = 1').get() as { data: string } | undefined;
      if (oldRow) {
        // 删除旧表，重建
        db.exec('DROP TABLE IF EXISTS nest_state');
        db.exec(`
                    CREATE TABLE nest_state (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        family_id TEXT NOT NULL UNIQUE,
                        data TEXT NOT NULL,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                `);
        // 将旧数据归到 family_main
        db.prepare('INSERT INTO nest_state (family_id, data) VALUES (?, ?)').run('family_main', oldRow.data);
        console.log('[DB] ✅ 数据迁移完成：旧数据已归属到 family_main');
      }
    } catch (e) {
      console.warn('[DB] 迁移过程中出错（可能已是新格式）:', e);
    }
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    console.log('[DB] Database connection closed.');
  }
}
