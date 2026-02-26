import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/apiKeyAuth.js';
import { getDb } from '../db.js';
import { process_refill_logic } from '../../services/waterLogic.js';
import { HomeMode } from '../../types.js';

const router = Router();

// All action routes require API Key auth
router.use(requireApiKey);

// ─── Helper: Read & Write State ────────────────────────────────────────────

function readState(familyId: string): any | null {
    const db = getDb();
    const row = db.prepare('SELECT data FROM nest_state WHERE family_id = ?').get(familyId) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
}

function writeState(familyId: string, state: any): void {
    const db = getDb();
    const dataStr = JSON.stringify(state);
    const existing = db.prepare('SELECT id FROM nest_state WHERE family_id = ?').get(familyId);
    if (existing) {
        db.prepare('UPDATE nest_state SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE family_id = ?').run(dataStr, familyId);
    } else {
        db.prepare('INSERT INTO nest_state (family_id, data) VALUES (?, ?)').run(familyId, dataStr);
    }
}

// ─── GET /api/actions/status ────────────────────────────────────────────────
// 查询家庭状态摘要（适合在 Shortcuts Widget 里显示）

router.get('/status', (req: Request, res: Response) => {
    const state = readState(req.familyId!);
    if (!state) {
        res.status(404).json({ error: '家庭数据不存在，请先在 App 中完成初始化' });
        return;
    }

    const water = state.moduleData?.water;
    const now = Date.now();

    res.json({
        homeName: state.homeName,
        homeMode: state.homeMode,
        memberCount: state.members?.length ?? 0,
        water: water ? {
            maxCapacity: water.max_capacity,
            lastRefillAt: new Date(water.last_refill_timestamp).toLocaleString('zh-CN'),
        } : null,
        timestamp: new Date(now).toLocaleString('zh-CN'),
    });
});

// ─── POST /api/actions/water-refill ─────────────────────────────────────────
// 换水：重置水位为满水并记录日志

router.post('/water-refill', (req: Request, res: Response) => {
    const state = readState(req.familyId!);
    if (!state) {
        res.status(404).json({ error: '家庭数据不存在' });
        return;
    }

    const water = state.moduleData?.water;
    if (!water || water.max_capacity === 0) {
        res.status(400).json({ error: '请先在 App 中配置饮水桶容量' });
        return;
    }

    const now = Date.now();
    const newWaterState = process_refill_logic(water, now);
    state.moduleData.water = newWaterState;
    writeState(req.familyId!, state);

    console.log(`[Actions] ✅ 换水 - family: ${req.familyId}`);
    res.json({
        success: true,
        message: '换水成功！水位已重置为满水',
        water: {
            maxCapacity: newWaterState.max_capacity,
            resetAt: new Date(now).toLocaleString('zh-CN'),
        }
    });
});

// ─── POST /api/actions/inventory-open ───────────────────────────────────────
// 开封物品：指定物品 ID 或名称，库存 -1

router.post('/inventory-open', (req: Request, res: Response) => {
    const { itemId, itemName } = req.body;

    if (!itemId && !itemName) {
        res.status(400).json({ error: '请提供 itemId 或 itemName' });
        return;
    }

    const state = readState(req.familyId!);
    if (!state) {
        res.status(404).json({ error: '家庭数据不存在' });
        return;
    }

    const inventory = state.moduleData?.inventory;
    if (!inventory?.items?.length) {
        res.status(400).json({ error: '库存数据不存在' });
        return;
    }

    // 按 id 或名称（模糊匹配）查找物品
    const item = inventory.items.find((i: any) =>
        i.id === itemId || (itemName && i.name.includes(itemName))
    );

    if (!item) {
        const available = inventory.items.map((i: any) => `${i.name}(${i.id})`).join(', ');
        res.status(404).json({ error: `未找到物品，可用的物品：${available}` });
        return;
    }

    if (item.current_stock <= 0) {
        res.status(400).json({ error: `${item.name} 库存已为零` });
        return;
    }

    const now = Date.now();
    const newBalance = item.current_stock - 1;
    item.current_stock = newBalance;
    item.history_logs = [...(item.history_logs || []), {
        ts: now,
        action: 'OPEN',
        delta: -1,
        balance: newBalance
    }];

    writeState(req.familyId!, state);

    console.log(`[Actions] ✅ 开封 ${item.name} - 剩余 ${newBalance} - family: ${req.familyId}`);
    res.json({
        success: true,
        message: `${item.name} 已开封，剩余 ${newBalance} 个`,
        item: { id: item.id, name: item.name, currentStock: newBalance }
    });
});

// ─── POST /api/actions/inventory-restock ────────────────────────────────────
// 补货：指定物品和数量，库存增加

router.post('/inventory-restock', (req: Request, res: Response) => {
    const { itemId, itemName, amount = 1 } = req.body;

    if (!itemId && !itemName) {
        res.status(400).json({ error: '请提供 itemId 或 itemName' });
        return;
    }

    const state = readState(req.familyId!);
    if (!state) {
        res.status(404).json({ error: '家庭数据不存在' });
        return;
    }

    const inventory = state.moduleData?.inventory;
    const item = inventory?.items?.find((i: any) =>
        i.id === itemId || (itemName && i.name.includes(itemName))
    );

    if (!item) {
        res.status(404).json({ error: '未找到物品' });
        return;
    }

    const now = Date.now();
    const newBalance = item.current_stock + Number(amount);
    item.current_stock = newBalance;
    item.history_logs = [...(item.history_logs || []), {
        ts: now,
        action: 'RESTOCK',
        delta: Number(amount),
        balance: newBalance
    }];

    writeState(req.familyId!, state);

    console.log(`[Actions] ✅ 补货 ${item.name} +${amount} - 剩余 ${newBalance} - family: ${req.familyId}`);
    res.json({
        success: true,
        message: `${item.name} 补货 ${amount} 个，现有 ${newBalance} 个`,
        item: { id: item.id, name: item.name, currentStock: newBalance }
    });
});

// ─── POST /api/actions/pet-care ─────────────────────────────────────────────
// 宠物护理：记录某项护理操作的时间

router.post('/pet-care', (req: Request, res: Response) => {
    const { itemId, itemName } = req.body;

    if (!itemId && !itemName) {
        res.status(400).json({ error: '请提供 itemId 或 itemName' });
        return;
    }

    const state = readState(req.familyId!);
    if (!state) {
        res.status(404).json({ error: '家庭数据不存在' });
        return;
    }

    const pet = state.moduleData?.pet;
    const item = pet?.care_items?.find((i: any) =>
        i.id === itemId || (itemName && i.name.includes(itemName))
    );

    if (!item) {
        const available = pet?.care_items?.map((i: any) => `${i.name}(${i.id})`).join(', ') ?? '无';
        res.status(404).json({ error: `未找到护理项目，可用：${available}` });
        return;
    }

    const now = Date.now();
    item.last_action_at = now;
    writeState(req.familyId!, state);

    console.log(`[Actions] ✅ 宠物护理 ${item.name} - family: ${req.familyId}`);
    res.json({
        success: true,
        message: `${item.name} 已完成！`,
        item: { id: item.id, name: item.name, lastActionAt: new Date(now).toLocaleString('zh-CN') }
    });
});

// ─── POST /api/actions/home-mode ────────────────────────────────────────────
// 切换家庭模式：HOME / AWAY

router.post('/home-mode', (req: Request, res: Response) => {
    const { mode } = req.body; // 'HOME' | 'AWAY'

    if (!mode || !['HOME', 'AWAY'].includes(mode)) {
        res.status(400).json({ error: '请提供 mode: "HOME" 或 "AWAY"' });
        return;
    }

    const state = readState(req.familyId!);
    if (!state) {
        res.status(404).json({ error: '家庭数据不存在' });
        return;
    }

    state.homeMode = mode as HomeMode;
    writeState(req.familyId!, state);

    const modeText = mode === 'HOME' ? '在家 🏠' : '外出 🚗';
    console.log(`[Actions] ✅ 模式切换 → ${mode} - family: ${req.familyId}`);
    res.json({
        success: true,
        message: `家庭模式已切换为：${modeText}`,
        homeMode: mode
    });
});

// ─── GET /api/actions/inventory-list ────────────────────────────────────────
// 列出所有库存物品（用于 Shortcuts 构建动态菜单）

router.get('/inventory-list', (req: Request, res: Response) => {
    const state = readState(req.familyId!);
    if (!state) {
        res.status(404).json({ error: '家庭数据不存在' });
        return;
    }

    const items = state.moduleData?.inventory?.items?.map((i: any) => ({
        id: i.id,
        name: i.name,
        currentStock: i.current_stock,
        threshold: i.threshold,
        isLow: i.current_stock <= i.threshold
    })) ?? [];

    res.json({ items });
});

export default router;
