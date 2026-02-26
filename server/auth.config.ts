// =====================================================
// 🔐 账户配置文件 — 直接在这里修改用户名和密码
// =====================================================

export interface UserConfig {
    id: string;
    username: string;
    password: string;       // 明文密码，本地应用
    displayName: string;
    familyId: string;       // 相同 familyId 的账户共享同一份家庭数据
}

export const USERS: UserConfig[] = [
    {
        id: 'demo',
        username: 'demo',
        password: 'demo123',
        displayName: '演示账户',
        familyId: 'family_demo',  // 独立数据，不影响真实家庭
    },
    {
        id: 'user1',
        username: 'bbb',        // ← 改成你的用户名
        password: '111111',     // ← 改成你的密码
        displayName: '主账户',
        familyId: 'family_main',  // user1 和 user2 共享此 family
    },
    {
        id: 'user2',
        username: 'www',        // ← 改成家人的用户名
        password: '222222',     // ← 改成家人的密码
        displayName: '家人账户',
        familyId: 'family_main',  // 与 user1 相同 → 共享数据
    },
];

// JWT 签名密钥（本地应用，无需修改）
export const JWT_SECRET = 'nest-local-jwt-secret-2026';

// Token 有效期（7天，自动续期）
export const JWT_EXPIRES_IN = '7d';

// =====================================================
// 🔑 快捷指令 API Keys — 用于 Apple Shortcuts 直接调用
// =====================================================
// 每个 Key 对应一个家庭，修改 key 字符串即可

export interface ApiKeyConfig {
    key: string;       // 在快捷指令 Header 里填写的密钥
    familyId: string;  // 这个 Key 对应的家庭数据
    name: string;      // 备注名
}

export const API_KEYS: ApiKeyConfig[] = [
    {
        key: 'nest-shortcuts-2026',   // ← 可以改成你自己的密钥
        familyId: 'family_main',       // 对应 user1/user2 的家庭数据
        name: '主家庭快捷指令',
    },
];
