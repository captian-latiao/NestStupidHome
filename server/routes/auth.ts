import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { USERS, JWT_SECRET, JWT_EXPIRES_IN } from '../auth.config.js';

const router = Router();

/**
 * POST /api/auth/login
 * 验证用户名和密码，成功返回 JWT token
 */
router.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({ error: '请输入用户名和密码' });
        return;
    }

    const user = USERS.find(
        u => u.username === username && u.password === password
    );

    if (!user) {
        res.status(401).json({ error: '用户名或密码错误' });
        return;
    }

    const token = jwt.sign(
        {
            userId: user.id,
            familyId: user.familyId,
            displayName: user.displayName,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    console.log(`[Auth] ✅ 用户 "${user.displayName}" 登录成功`);

    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            familyId: user.familyId,
        }
    });
});

/**
 * GET /api/auth/me
 * 验证当前 token 是否有效，返回用户信息
 */
router.get('/me', (req: Request, res: Response) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        res.status(401).json({ error: '未登录' });
        return;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            familyId: string;
            displayName: string;
        };
        res.json({
            userId: payload.userId,
            familyId: payload.familyId,
            displayName: payload.displayName,
        });
    } catch {
        res.status(401).json({ error: 'token 已过期，请重新登录' });
    }
});

export default router;
