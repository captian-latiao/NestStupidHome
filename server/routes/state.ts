import { Router, Request, Response } from 'express';
import { getDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/state
 * Returns the full NestState JSON for the current user's family.
 */
router.get('/', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const row = db.prepare('SELECT data FROM nest_state WHERE family_id = ?').get(req.familyId) as { data: string } | undefined;

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
 * Saves the full NestState JSON for the current user's family.
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
        const existing = db.prepare('SELECT id FROM nest_state WHERE family_id = ?').get(req.familyId);

        if (existing) {
            db.prepare('UPDATE nest_state SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE family_id = ?').run(dataStr, req.familyId);
        } else {
            db.prepare('INSERT INTO nest_state (family_id, data) VALUES (?, ?)').run(req.familyId, dataStr);
        }

        res.json({ success: true, size: dataStr.length });
    } catch (err) {
        console.error('[API] PUT /state error:', err);
        res.status(500).json({ error: 'Failed to save state' });
    }
});

/**
 * POST /api/state/reset
 * Deletes the saved state for the current family.
 */
router.post('/reset', (req: Request, res: Response) => {
    try {
        const db = getDb();
        db.prepare('DELETE FROM nest_state WHERE family_id = ?').run(req.familyId);
        res.json({ success: true, message: 'State has been reset' });
    } catch (err) {
        console.error('[API] POST /state/reset error:', err);
        res.status(500).json({ error: 'Failed to reset state' });
    }
});

/**
 * GET /api/state/export
 * Downloads the current family state as a JSON backup.
 */
router.get('/export', (req: Request, res: Response) => {
    try {
        const db = getDb();
        const row = db.prepare('SELECT data FROM nest_state WHERE family_id = ?').get(req.familyId) as { data: string } | undefined;

        if (!row) {
            res.status(404).json({ error: 'No state to export' });
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `nest-backup-${req.familyId}-${timestamp}.json`;

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
 * Imports a backup JSON, replacing the current family state.
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
        const currentRow = db.prepare('SELECT data FROM nest_state WHERE family_id = ?').get(req.familyId) as { data: string } | undefined;
        if (currentRow) {
            db.prepare('INSERT INTO state_backups (family_id, data, label) VALUES (?, ?, ?)').run(
                req.familyId,
                currentRow.data,
                `Pre-import backup at ${new Date().toISOString()}`
            );
        }

        const dataStr = JSON.stringify(importedState);
        const existing = db.prepare('SELECT id FROM nest_state WHERE family_id = ?').get(req.familyId);

        if (existing) {
            db.prepare('UPDATE nest_state SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE family_id = ?').run(dataStr, req.familyId);
        } else {
            db.prepare('INSERT INTO nest_state (family_id, data) VALUES (?, ?)').run(req.familyId, dataStr);
        }

        res.json({ success: true, message: 'State imported successfully' });
    } catch (err) {
        console.error('[API] POST /state/import error:', err);
        res.status(500).json({ error: 'Failed to import state' });
    }
});

/**
 * POST /api/state/migrate
 * One-time migration: localStorage → SQLite (only writes if family has no state yet)
 */
router.post('/migrate', (req: Request, res: Response) => {
    try {
        const localStorageState = req.body;

        if (!localStorageState || typeof localStorageState !== 'object') {
            res.status(400).json({ error: 'Invalid state for migration' });
            return;
        }

        const db = getDb();
        const existing = db.prepare('SELECT id FROM nest_state WHERE family_id = ?').get(req.familyId);

        if (existing) {
            res.json({ success: true, migrated: false, message: 'Family already has state, skipping migration' });
            return;
        }

        const dataStr = JSON.stringify(localStorageState);
        db.prepare('INSERT INTO nest_state (family_id, data) VALUES (?, ?)').run(req.familyId, dataStr);

        console.log(`[DB] Migrated localStorage data to SQLite for family: ${req.familyId}`);
        res.json({ success: true, migrated: true, message: 'Successfully migrated from localStorage' });
    } catch (err) {
        console.error('[API] POST /state/migrate error:', err);
        res.status(500).json({ error: 'Failed to migrate state' });
    }
});

export default router;
