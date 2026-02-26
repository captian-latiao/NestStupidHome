import { Request, Response, NextFunction } from 'express';
import { API_KEYS } from '../auth.config.js';

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
    const key = req.headers['x-api-key'] as string | undefined;

    if (!key) {
        res.status(401).json({ error: '缺少 X-API-Key header' });
        return;
    }

    const config = API_KEYS.find(k => k.key === key);
    if (!config) {
        res.status(401).json({ error: 'API Key 无效' });
        return;
    }

    // 注入 familyId，供 actions 路由使用
    req.familyId = config.familyId;
    req.displayName = config.name;
    next();
}
