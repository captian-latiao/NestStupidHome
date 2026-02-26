const TOKEN_KEY = 'nest_auth_token';
const USER_KEY = 'nest_auth_user';

export interface AuthUser {
    id: string;
    username: string;
    displayName: string;
    familyId: string;
}

// 保存 token 和用户信息到 localStorage
export function saveAuth(token: string, user: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// 获取 token
export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

// 获取当前用户信息
export function getCurrentUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as AuthUser;
    } catch {
        return null;
    }
}

// 检查是否已登录（token 是否存在）
export function isLoggedIn(): boolean {
    return !!getToken();
}

// 退出登录
export function logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// 登录请求
export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '登录失败');
    }

    const data = await res.json();
    return data as { token: string; user: AuthUser };
}

// 验证 token 是否还有效（请求 /api/auth/me）
export async function verifyToken(): Promise<boolean> {
    const token = getToken();
    if (!token) return false;

    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.ok;
    } catch {
        return false;
    }
}

// 构建带 JWT 的请求头
export function authHeaders(): Record<string, string> {
    const token = getToken();
    return token
        ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        : { 'Content-Type': 'application/json' };
}
