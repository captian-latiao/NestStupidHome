import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';

const router = Router();

/**
 * GET /api/state
 * Returns the full NestState JSON, or null if no state saved yet.
 */
router.get('/', (_req: Request, res: Response) => {
    try {
        const db = getDb();
        const row = db.prepare('SELECT data FROM nest_state WHERE id = 1').get() as { data: string } | undefined;

        if (row) {
            res.json({ exists: true, state: JSON.parse(row.data) });
        } else {
            res.json({ exists: false, state: null });
        }
    } catch (err) {
        console.error('[API] GET /state error:', err);
        res.status(500).json({ error: 'Failed to read state' });
    }
});

/**
 * PUT /api/state
 * Saves the full NestState JSON. Upserts (insert or replace).
 */
router.put('/', (req: Request, res: Response) => {
    try {
        const state = req.body;

        if (!state || typeof state !== 'object') {
            res.status(400).json({ error: 'Invalid state object' });
            return;
        }

        const db = getDb();
        const dataStr = JSON.stringify(state);

        const existing = db.prepare('SELECT id FROM nest_state WHERE id = 1').get();

        if (existing) {
            db.prepare('UPDATE nest_state SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(dataStr);
        } else {
            db.prepare('INSERT INTO nest_state (id, data) VALUES (1, ?)').run(dataStr);
        }

        res.json({ success: true, size: dataStr.length });
    } catch (err) {
        console.error('[API] PUT /state error:', err);
        res.status(500).json({ error: 'Failed to save state' });
    }
});

/**
 * POST /api/state/reset
 * Deletes the saved state. Frontend will revert to DEFAULT_STATE on next load.
 */
router.post('/reset', (_req: Request, res: Response) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM nest_state WHERE id = 1').run();
        res.json({ success: true, message: 'State has been reset' });
    } catch (err) {
        console.error('[API] POST /state/reset error:', err);
        res.status(500).json({ error: 'Failed to reset state' });
    }
});

/**
 * GET /api/state/export
 * Downloads the current state as a JSON file for backup.
 */
router.get('/export', (_req: Request, res: Response) => {
    try {
        const db = getDb();
        const row = db.prepare('SELECT data FROM nest_state WHERE id = 1').get() as { data: string } | undefined;

        if (!row) {
            res.status(404).json({ error: 'No state to export' });
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `nest-backup-${timestamp}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(row.data);
    } catch (err) {
        console.error('[API] GET /state/export error:', err);
        res.status(500).json({ error: 'Failed to export state' });
    }
});

/**
 * POST /api/state/import
 * Imports a backup JSON file, replacing the current state.
 * Also creates a backup of the current state before importing.
 */
router.post('/import', (req: Request, res: Response) => {
    try {
        const importedState = req.body;

        if (!importedState || typeof importedState !== 'object') {
            res.status(400).json({ error: 'Invalid import data' });
            return;
        }

        const db = getDb();

        // Backup current state before importing
        const currentRow = db.prepare('SELECT data FROM nest_state WHERE id = 1').get() as { data: string } | undefined;
        if (currentRow) {
            db.prepare('INSERT INTO state_backups (data, label) VALUES (?, ?)').run(
                currentRow.data,
                `Pre-import backup at ${new Date().toISOString()}`
            );
        }

        // Import new state
        const dataStr = JSON.stringify(importedState);
        const existing = db.prepare('SELECT id FROM nest_state WHERE id = 1').get();

        if (existing) {
            db.prepare('UPDATE nest_state SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(dataStr);
        } else {
            db.prepare('INSERT INTO nest_state (id, data) VALUES (1, ?)').run(dataStr);
        }

        res.json({ success: true, message: 'State imported successfully' });
    } catch (err) {
        console.error('[API] POST /state/import error:', err);
        res.status(500).json({ error: 'Failed to import state' });
    }
});

/**
 * POST /api/state/migrate
 * Migrates localStorage data to SQLite (one-time, called from frontend).
 * Only writes if no state exists in the database yet.
 */
router.post('/migrate', (req: Request, res: Response) => {
    try {
        const localStorageState = req.body;

        if (!localStorageState || typeof localStorageState !== 'object') {
            res.status(400).json({ error: 'Invalid state for migration' });
            return;
        }

        const db = getDb();
        const existing = db.prepare('SELECT id FROM nest_state WHERE id = 1').get();

        if (existing) {
            // Database already has data — don't overwrite
            res.json({ success: true, migrated: false, message: 'Database already has state, skipping migration' });
            return;
        }

        // First time migration from localStorage
        const dataStr = JSON.stringify(localStorageState);
        db.prepare('INSERT INTO nest_state (id, data) VALUES (1, ?)').run(dataStr);

        console.log('[DB] Successfully migrated localStorage data to SQLite');
        res.json({ success: true, migrated: true, message: 'Successfully migrated from localStorage' });
    } catch (err) {
        console.error('[API] POST /state/migrate error:', err);
        res.status(500).json({ error: 'Failed to migrate state' });
    }
});

export default router;
