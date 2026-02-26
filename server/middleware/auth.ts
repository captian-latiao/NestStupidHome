import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../auth.config.js';

// Extend Express Request type to include auth info
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            familyId?: string;
            displayName?: string;
        }
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
        res.status(401).json({ error: '未授权：缺少 token' });
        return;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            familyId: string;
            displayName: string;
        };
        req.userId = payload.userId;
        req.familyId = payload.familyId;
        req.displayName = payload.displayName;
        next();
    } catch {
        res.status(401).json({ error: '未授权：token 无效或已过期' });
    }
}
