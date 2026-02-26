
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Box, ShoppingBag, ChevronRight, Plus, Minus, AlertCircle, TrendingDown, Package, X, Check, Edit3, Trash2, Tag, Smile, Archive, Layers, ArrowUpDown, Filter, ChevronDown, ArrowDownNarrowWide, ArrowUpNarrowWide, PackageOpen } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, LayoutGroup } from 'framer-motion';
import { InventoryState, InventoryItem, InventoryCategory } from '../types';
import { calculate_daily_rate, get_prediction, generate_step_chart_data, ChartPoint } from '../services/inventoryLogic';
import { Heading, Subheading } from '../components/ui/Typography';

// --- SHARED UTILS ---

const getAlertLevel = (item: InventoryItem, dailyRate: number | null) => {
    const daysLeft = get_prediction(item.current_stock, dailyRate);
    
    if (item.current_stock <= item.threshold) return 'CRITICAL';
    if (daysLeft !== null && daysLeft <= 3) return 'WARNING';
    return 'OK';
};

// --- COMPONENT: VISUAL STACKING CARD (Main View) ---
const VisualStackingCard: React.FC<{
    item: InventoryItem;
    category: InventoryCategory;
    onClick: () => void;
    onOpen: () => void;
    onRestock: () => void;
}> = ({ item, category, onClick, onOpen, onRestock }) => {
    const [positions, setPositions] = useState<Array<{top: string, left: string, r: number}>>([]);
    const [isUnboxing, setIsUnboxing] = useState(false);

    useEffect(() => {
        const count = Math.min(item.current_stock, 12); 
        const newPos = Array.from({ length: count }).map((_, i) => ({
             top: `${30 + Math.random() * 60}%`, 
             left: `${10 + Math.random() * 80}%`, 
             r: (Math.random() * 60) - 30
        }));
        setPositions(newPos);
    }, [item.current_stock]);

    const handleOpenClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.current_stock <= 0) return;
        
        setIsUnboxing(true);
        // Trigger the logic immediately, animation plays as feedback
        onOpen();
        
        // Reset animation state after effect
        setTimeout(() => setIsUnboxing(false), 600);
    };

    const alertLevel = getAlertLevel(item, null);
    const isCritical = alertLevel === 'CRITICAL';

    return (
        <motion.div
            layout // Enable smooth layout transitions
            layoutId={`card-${item.id}`}
            onClick={onClick}
            animate={isUnboxing ? { 
                x: [0, -5, 5, -5, 5, 0],
                scale: [1, 1.02, 1]
            } : {}}
            transition={{ duration: 0.4 }}
            className={`
                relative overflow-hidden h-52 rounded-[32px] border transition-shadow cursor-pointer active:scale-[0.98] group flex flex-col justify-between shadow-sm hover:shadow-md
                ${isCritical ? 'bg-red-50 border-red-100' : 'bg-white border-wood-100'}
            `}
        >
            {/* Unboxing Overlay Animation */}
            <AnimatePresence>
                {isUnboxing && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-wood-800/90 p-4 rounded-full text-white shadow-xl backdrop-blur-sm">
                            <PackageOpen size={32} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {positions.map((pos, i) => (
                    <div 
                        key={i}
                        className="absolute text-4xl transition-all duration-500 opacity-100 filter blur-[0.5px]"
                        style={{ 
                            top: pos.top, 
                            left: pos.left, 
                            transform: `translate(-50%, -50%) rotate(${pos.r}deg)` 
                        }}
                    >
                        {category.emoji}
                    </div>
                ))}
                <div className={`absolute inset-0 bg-gradient-to-b ${isCritical ? 'from-red-50/20 via-red-50/60 to-red-50' : 'from-white/10 via-white/50 to-white'}`} />
            </div>

            <div className="relative z-10 p-5">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold bg-white/60 text-wood-500 px-2 py-1 rounded-full border border-wood-100/50 backdrop-blur-sm">
                        {category.name}
                    </span>
                    {isCritical && <AlertCircle size={16} className="text-red-500" />}
                </div>
                <div className="font-serif font-bold text-lg text-wood-900 mt-2 leading-tight line-clamp-2">{item.name}</div>
            </div>

            <div className="relative z-10 px-5 -mt-2">
                <span className={`text-5xl font-serif font-bold tracking-tight ${isCritical ? 'text-red-600' : 'text-wood-800'}`}>
                    {item.current_stock}
                </span>
                <span className="text-xs text-wood-400 font-bold ml-1">件</span>
            </div>

            {/* Action Bar - Swapped Buttons */}
            <div className="relative z-20 p-3 grid grid-cols-2 gap-2 mt-auto bg-white/40 backdrop-blur-md border-t border-wood-100/50">
                <button 
                    onClick={(e) => { e.stopPropagation(); onRestock(); }}
                    className="flex flex-col items-center justify-center py-2.5 rounded-2xl bg-wood-100 text-wood-800 hover:bg-wood-200 transition-colors active:scale-95 shadow-sm"
                >
                    <span className="text-[10px] font-bold flex items-center gap-1"><Plus size={10}/> 补货</span>
                </button>
                <button 
                    onClick={handleOpenClick}
                    disabled={item.current_stock <= 0}
                    className="flex flex-col items-center justify-center py-2.5 rounded-2xl bg-white/80 hover:bg-white text-wood-700 transition-colors disabled:opacity-50 active:scale-95 shadow-sm"
                >
                    <span className="text-[10px] font-bold flex items-center gap-1"><PackageOpen size={10}/> 开封</span>
                </button>
            </div>
        </motion.div>
    );
};

// --- COMPONENT: STOCK FLOW CHART ---
const StockFlowChart: React.FC<{ 
    logs: any[]; 
    currentStock: number; 
    systemTime: number; 
}> = ({ logs, currentStock, systemTime }) => {
    const points = useMemo(() => 
        generate_step_chart_data(logs, currentStock, 90, systemTime), 
    [logs, currentStock, systemTime]);

    if (points.length < 2) return null;

    const height = 120;
    const width = 300;
    const padding = 10;
    const minTime = points[0].x;
    const maxTime = points[points.length - 1].x;
    const timeSpan = maxTime - minTime;
    const maxVal = Math.max(...points.map(p => p.y), currentStock + 2);
    const getX = (t: number) => padding + ((t - minTime) / timeSpan) * (width - 2 * padding);
    const getY = (v: number) => height - padding - (v / maxVal) * (height - 2 * padding);

    let d = `M ${getX(points[0].x)} ${getY(points[0].y)}`;
    points.forEach((p, i) => { if (i > 0) d += ` L ${getX(p.x)} ${getY(p.y)}`; });

    return (
        <div className="w-full h-32 mt-4 relative select-none">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#EBE0C2" strokeWidth="1" strokeDasharray="4 4" />
                <path d={d} fill="none" stroke="#BFA06A" strokeWidth="2" strokeLinejoin="round" />
                {points.filter(p => p.isDot).map((p, i) => (
                    <circle key={i} cx={getX(p.x)} cy={getY(p.y)} r="3" fill={p.color || '#BFA06A'} stroke="white" strokeWidth="1.5" />
                ))}
            </svg>
            <div className="absolute bottom-0 left-0 text-[9px] text-wood-400">90天前</div>
            <div className="absolute bottom-0 right-0 text-[9px] text-wood-400">今天</div>
        </div>
    );
};

// --- COMPONENT: VISUAL HEADER (Refined) ---
const LargeVisualHeader: React.FC<{ 
    count: number; 
    emoji: string; 
    className?: string;
}> = ({ count, emoji, className = "h-72" }) => {
    const displayCount = Math.min(count, 30);
    const [positions, setPositions] = useState<Array<{id: number, left: number, top: number, r: number}>>([]);

    useEffect(() => {
        setPositions(prev => {
            if (prev.length === displayCount) return prev;
            if (displayCount > prev.length) {
                const added = Array.from({ length: displayCount - prev.length }).map((_, i) => ({
                    id: prev.length + i,
                    left: 10 + Math.random() * 80,
                    top: 100 - Math.random() * 80, 
                    r: (Math.random() * 60) - 30
                }));
                return [...prev, ...added];
            } else {
                return prev.slice(0, displayCount);
            }
        });
    }, [displayCount]);

    return (
        <div className={`relative w-full overflow-hidden shrink-0 pointer-events-none ${className}`}>
            <div className="absolute inset-0 z-10">
                <AnimatePresence>
                    {positions.map((pos) => (
                        <motion.div
                            key={pos.id}
                            initial={{ y: 200, opacity: 0 }}
                            animate={{ left: `${pos.left}%`, top: `${pos.top}%`, y: 0, opacity: 1, rotate: pos.r }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                            className="absolute text-8xl transform -translate-x-1/2 -translate-y-1/2 drop-shadow-sm select-none opacity-100 filter blur-[0.5px]"
                        >
                            {emoji}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

// --- COMPONENT: EDIT ITEM MODAL ---
const EditItemModal: React.FC<{
    initialItem?: Partial<InventoryItem>;
    categories: InventoryCategory[];
    onSave: (item: any) => void;
    onDelete?: () => void;
    onClose: () => void;
    onAddCategory: (name: string, emoji: string) => void;
}> = ({ initialItem, categories, onSave, onDelete, onClose, onAddCategory }) => {
    const [name, setName] = useState(initialItem?.name || '');
    const [categoryId, setCategoryId] = useState(initialItem?.category_id || categories[0]?.id || '');
    const [stock, setStock] = useState(initialItem?.current_stock?.toString() || '1');
    const [threshold, setThreshold] = useState(initialItem?.threshold?.toString() || '1');
    const [isAddingCat, setIsAddingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatEmoji, setNewCatEmoji] = useState('📦');

    const handleSave = () => {
        if (!name.trim() || !categoryId) return;
        onSave({
            name,
            category_id: categoryId,
            current_stock: parseInt(stock) || 0,
            threshold: parseInt(threshold) || 1,
            is_shared: true 
        });
        onClose();
    };

    const handleAddCat = () => {
        if (newCatName) {
            onAddCategory(newCatName, newCatEmoji);
            setIsAddingCat(false);
            setNewCatName('');
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-wood-900/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-wood-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <Heading className="!text-xl">{initialItem?.id ? '编辑物品' : '添加新物品'}</Heading>
                    <button onClick={onClose}><X size={20} className="text-wood-400 hover:text-wood-600"/></button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-wood-400 uppercase mb-1.5 block">物品名称</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-wood-50 border border-wood-100 rounded-2xl p-4 font-bold text-wood-800 focus:outline-none focus:border-wood-300 transition-colors" placeholder="例如：维达卷纸" />
                    </div>

                    <div className="p-4 bg-wood-50/50 rounded-2xl border border-wood-100">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-bold text-wood-400 uppercase flex items-center gap-1"><Tag size={12}/> 选择分类</label>
                            <button 
                                onClick={() => setIsAddingCat(!isAddingCat)} 
                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors ${isAddingCat ? 'text-red-500 bg-red-50' : 'text-wood-600 bg-white border border-wood-100'}`}
                            >
                                {isAddingCat ? '取消添加' : '+ 新建分类'}
                            </button>
                        </div>
                        
                        {isAddingCat ? (
                            <div className="bg-white p-3 rounded-xl border border-wood-100 animate-in fade-in slide-in-from-top-2 shadow-sm">
                                <div className="text-xs text-wood-400 font-bold mb-2">配置新分类</div>
                                <div className="flex gap-2 mb-2">
                                    <input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} className="w-12 text-center bg-wood-50 rounded-xl border border-wood-100 focus:border-wood-300 outline-none text-xl" placeholder="📦" />
                                    <input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 bg-wood-50 rounded-xl border border-wood-100 px-3 text-sm focus:border-wood-300 outline-none" placeholder="分类名称 (如: 零食)" />
                                </div>
                                <button onClick={handleAddCat} disabled={!newCatName} className="w-full bg-wood-800 text-wood-50 text-xs font-bold py-2.5 rounded-xl disabled:opacity-50">确认并选中</button>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {categories.map(c => (
                                    <button 
                                        key={c.id} 
                                        onClick={() => setCategoryId(c.id)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${categoryId === c.id ? 'bg-wood-800 text-wood-50 border-wood-800 shadow-md scale-105' : 'bg-white text-wood-500 border-wood-100 hover:border-wood-300'}`}
                                    >
                                        <span className="text-sm">{c.emoji}</span> {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-wood-400 uppercase mb-1.5 block">当前库存</label>
                            <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full bg-wood-50 border border-wood-100 rounded-2xl p-4 font-mono font-bold text-wood-800 text-center text-lg focus:outline-none focus:border-wood-300" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-wood-400 uppercase mb-1.5 block">警戒阈值</label>
                            <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} className="w-full bg-wood-50 border border-wood-100 rounded-2xl p-4 font-mono font-bold text-wood-800 text-center text-lg focus:outline-none focus:border-wood-300" />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        {onDelete && (
                            <button onClick={onDelete} className="p-4 bg-red-50 text-red-500 rounded-2xl border border-red-100 hover:bg-red-100 transition-colors">
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button onClick={handleSave} className="flex-1 bg-wood-800 text-wood-50 font-bold rounded-2xl py-4 shadow-lg active:scale-95 transition-transform">
                            保存
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// --- COMPONENT: RESTOCK MODAL ---
const RestockModal: React.FC<{ 
    current: number; 
    onConfirm: (amount: number) => void; 
    onClose: () => void 
}> = ({ current, onConfirm, onClose }) => {
    const [val, setVal] = useState(1);

    const handleConfirm = () => {
        if (val > 0) {
            onConfirm(val);
        }
        onClose();
    };

    const handleChange = (delta: number) => {
        setVal(prev => Math.max(1, prev + delta));
    };

    const handleChip = (n: number) => {
        setVal(prev => prev + n);
    }

    return (
        <div 
            className="fixed inset-0 z-[110] bg-wood-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} 
                className="bg-white w-full max-w-sm p-6 rounded-t-[32px] sm:rounded-[32px] shadow-2xl pb-10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-bold text-wood-800">补货入库</h3>
                    <button onClick={onClose}><X size={20} className="text-wood-400 hover:text-wood-600"/></button>
                </div>
                
                {/* Stepper Control */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <button 
                        onClick={() => handleChange(-1)} 
                        className="w-16 h-16 rounded-2xl bg-wood-100 text-wood-800 flex items-center justify-center hover:bg-wood-200 active:scale-95 transition-all shadow-sm"
                    >
                        <Minus size={24} strokeWidth={3} />
                    </button>
                    
                    <div className="flex-1 h-20 bg-wood-50 rounded-2xl border border-wood-100 flex items-center justify-center">
                        <input 
                            type="number" 
                            value={val}
                            onChange={(e) => setVal(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full text-center bg-transparent text-5xl font-serif font-bold text-wood-900 focus:outline-none"
                        />
                    </div>

                    <button 
                        onClick={() => handleChange(1)} 
                        className="w-16 h-16 rounded-2xl bg-wood-100 text-wood-800 flex items-center justify-center hover:bg-wood-200 active:scale-95 transition-all shadow-sm"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>

                {/* Quick Add Chips (Removed +1) */}
                <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2 justify-center">
                    {[5, 10, 20, 50].map(n => (
                        <button 
                            key={n} 
                            onClick={() => handleChip(n)} 
                            className="px-5 py-3 bg-wood-50 border border-wood-100 rounded-2xl text-sm font-bold text-wood-500 hover:bg-wood-100 hover:text-wood-700 active:scale-95 transition-all"
                        >
                            +{n}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={handleConfirm} 
                    className="w-full bg-wood-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform hover:bg-wood-700"
                >
                    确认入库
                </button>
            </motion.div>
        </div>
    );
};

// --- COMPONENT: ITEM DETAIL SHEET (Fixed Position Drawer) ---
const ItemDetailSheet: React.FC<{
    item: InventoryItem;
    category: InventoryCategory;
    onClose: () => void;
    onOpenItem: (id: string) => void;
    onRestockItem: (id: string, amount: number) => void;
    onUpdate: (id: string, updates: Partial<InventoryItem>) => void;
    onDelete: (id: string) => void;
    categories: InventoryCategory[];
    onAddCategory: (n: string, e: string) => void;
    systemTime: number;
}> = ({ item, category, onClose, onOpenItem, onRestockItem, onUpdate, onDelete, categories, onAddCategory, systemTime }) => {
    const [isRestocking, setIsRestocking] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isUnboxing, setIsUnboxing] = useState(false);

    const dailyRate = useMemo(() => calculate_daily_rate(item.history_logs, 60, systemTime), [item.history_logs, systemTime]);
    const daysLeft = get_prediction(item.current_stock, dailyRate);

    const handleOpenClick = () => {
        if (item.current_stock > 0) {
            setIsUnboxing(true);
            onOpenItem(item.id);
            setTimeout(() => setIsUnboxing(false), 800);
        }
    };

    return (
        <>
            {/* Fixed Backdrop - Z-Index 30 (Below Nav 50, Above List 0) */}
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[30] bg-black/20 backdrop-blur-sm"
            />
            
            {/* Fixed Drawer Container - Z-Index 40 (Below Nav 50) 
                Changed to bg-white to serve as main background 
                Height adjusted to be compact but flexible
            */}
            <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[40] bg-white rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Close Button - Sticky/Fixed inside the drawer */}
                <div className="absolute top-5 right-5 z-50">
                     <button 
                        onClick={onClose} 
                        className="p-2.5 bg-white/40 backdrop-blur-md rounded-full text-wood-600 hover:bg-white transition-all shadow-sm border border-white/20 active:scale-95"
                     >
                        <X size={20} />
                     </button>
                </div>

                {/* Unboxing Overlay (Detail View) */}
                <AnimatePresence>
                    {isUnboxing && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="absolute inset-0 z-[90] flex items-center justify-center pointer-events-none bg-wood-900/10 backdrop-blur-[2px]"
                        >
                             <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce">
                                 <PackageOpen size={48} className="text-wood-800 mb-2" />
                                 <span className="font-bold text-wood-800">已开封 -1</span>
                             </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Unified Scroll Container */}
                <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col pb-28">
                    
                    {/* Header Section - Integrated into White Card 
                        Removed bg-wood-50 wrapper to create seamless white look 
                        Added subtle gradient for visual richness
                    */}
                    <div className="relative w-full h-40 shrink-0 bg-gradient-to-b from-wood-50/50 to-white">
                        <LargeVisualHeader count={item.current_stock} emoji={category.emoji} className="h-full" />
                    </div>

                    {/* Content Body - No overlap needed anymore, flows naturally */}
                    <div className="px-6 space-y-5">
                        <div className="relative pt-2">
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="absolute right-0 top-0 p-2.5 bg-wood-50 rounded-full text-wood-400 hover:bg-wood-100 transition-colors"
                            >
                                <Edit3 size={18} />
                            </button>

                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-bold bg-wood-100/80 text-wood-600 px-2.5 py-1 rounded-full border border-wood-200/50">
                                    {category.name}
                                </span>
                            </div>
                            
                            <Heading className="pr-12 !text-3xl">{item.name}</Heading>

                            <div className="flex items-center gap-8 mt-6">
                                <div>
                                    <span className="text-xs text-wood-400 font-bold uppercase block mb-1">当前库存</span>
                                    <span className={`text-5xl font-serif font-bold ${item.current_stock <= item.threshold ? 'text-red-500' : 'text-wood-800'}`}>
                                        {item.current_stock}
                                    </span>
                                </div>
                                <div className="w-px h-12 bg-wood-200" />
                                <div>
                                    <span className="text-xs text-wood-400 font-bold uppercase block mb-1">预计可用</span>
                                    <span className={`text-3xl font-serif font-bold ${daysLeft !== null && daysLeft <= 3 ? 'text-orange-500' : 'text-wood-800'}`}>
                                        {daysLeft === null ? '--' : Math.floor(daysLeft)} <span className="text-sm font-sans font-bold text-wood-300">天</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-wood-50/50 p-5 rounded-[32px] border border-wood-100">
                            <Subheading className="!text-sm mb-4 text-wood-500">库存趋势</Subheading>
                            <StockFlowChart logs={item.history_logs} currentStock={item.current_stock} systemTime={systemTime} />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 pt-2">
                            <button 
                                onClick={() => setIsRestocking(true)}
                                className="flex-1 h-14 bg-wood-100 text-wood-800 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-sm hover:bg-wood-200 active:scale-95 transition-all"
                            >
                                <Plus size={20} strokeWidth={3} /> 补货
                            </button>
                            <button 
                                onClick={handleOpenClick}
                                disabled={item.current_stock <= 0}
                                className="flex-1 h-14 bg-white border border-wood-200 text-wood-600 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                            >
                                <PackageOpen size={20} strokeWidth={3} className="text-wood-400"/> 开封
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modals placed inside the drawer context but with higher z-index */}
                <AnimatePresence>
                    {isRestocking && (
                        <RestockModal 
                            current={item.current_stock} 
                            onConfirm={(amt) => onRestockItem(item.id, amt)} 
                            onClose={() => setIsRestocking(false)} 
                        />
                    )}
                    {isEditing && (
                        <EditItemModal 
                            initialItem={item}
                            categories={categories}
                            onSave={(updates) => onUpdate(item.id, updates)}
                            onDelete={() => { onDelete(item.id); onClose(); }}
                            onClose={() => setIsEditing(false)}
                            onAddCategory={onAddCategory}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
};

// --- MAIN WIDGET (Dashboard) ---
export const InventoryWidget: React.FC<{ data: InventoryState }> = ({ data }) => {
    const lowStockItems = (data?.items || []).filter(item => item.current_stock <= item.threshold);
    const lowStockCount = lowStockItems.length;
    const isAllGood = lowStockCount === 0;

    return (
        <div className="h-full p-5 flex flex-col relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${isAllGood ? 'from-green-50/50 via-white to-wood-50/20' : 'from-red-50/50 via-white to-wood-50/20'}`} />
            
            <div className="flex items-center justify-between mb-2 relative z-10">
               <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg shadow-sm border ${isAllGood ? 'bg-green-50 text-green-600 border-green-100' : 'bg-wood-100 text-wood-600 border-wood-200'}`}>
                     <Package size={16} />
                  </div>
                  <span className="font-serif text-lg text-wood-800">库存</span>
               </div>
            </div>
    
            <div className="flex-1 flex flex-col justify-end relative z-10 pb-1">
               {isAllGood ? (
                 <div>
                    <div className="text-3xl font-serif font-bold text-wood-800 mb-1">
                        {data?.items?.length || 0}<span className="text-lg font-sans font-medium text-wood-400 ml-1">项</span>
                    </div>
                    <div className="text-xs text-wood-500 font-medium">
                        全屋库存充足
                    </div>
                 </div>
               ) : (
                 <div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-4xl font-serif font-bold text-red-600 leading-none">{lowStockCount}</span>
                        <span className="text-sm font-bold text-red-400">项需补货</span>
                    </div>
                    <div className="text-xs text-wood-600 font-medium leading-tight line-clamp-2 opacity-80">
                        {lowStockItems.slice(0, 3).map(i => i.name).join('、')}
                        {lowStockItems.length > 3 && '...'}
                    </div>
                 </div>
               )}
            </div>
        </div>
    );
};

// --- DETAIL VIEW (Full Screen) ---
export const InventoryDetailView: React.FC<{ 
    data: InventoryState; 
    actions: any; 
    systemTime: number 
}> = ({ data, actions, systemTime }) => {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [quickRestockItemId, setQuickRestockItemId] = useState<string | null>(null);
    
    // Sort & Filter State
    const [selectedCatId, setSelectedCatId] = useState<string>('all');
    const [sortAsc, setSortAsc] = useState(true); // true = Low to High (Ascending)
    
    // Dropdown UI State
    const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

    const categories = data.categories || [];
    const items = data.items || [];
    const quickRestockItem = quickRestockItemId ? items.find(i => i.id === quickRestockItemId) : null;
    
    const selectedCategoryName = selectedCatId === 'all' 
        ? '全部品类' 
        : categories.find(c => c.id === selectedCatId)?.name || '未知分类';

    // Filter & Sort Logic
    const displayedItems = useMemo(() => {
        let filtered = items;
        if (selectedCatId !== 'all') {
            filtered = filtered.filter(i => i.category_id === selectedCatId);
        }
        return filtered.sort((a, b) => {
            return sortAsc 
                ? a.current_stock - b.current_stock // Low to High
                : b.current_stock - a.current_stock; // High to Low
        });
    }, [items, selectedCatId, sortAsc]);

    return (
        <div className="pb-24 animate-[fadeIn_0.3s_ease-out] relative h-full flex flex-col">
            
            {/* Header: Sort & Filter */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0 z-20 relative">
                
                {/* Custom Category Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-wood-100 rounded-2xl shadow-sm text-wood-800 font-bold text-sm active:scale-95 transition-transform"
                    >
                        <span>{selectedCategoryName}</span>
                        <ChevronDown size={16} className={`text-wood-400 transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isCatDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsCatDropdownOpen(false)} />
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-wood-100 z-40 overflow-hidden"
                                >
                                    <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
                                        <button 
                                            onClick={() => { setSelectedCatId('all'); setIsCatDropdownOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-wood-50 transition-colors flex items-center justify-between ${selectedCatId === 'all' ? 'text-wood-800 bg-wood-50/50' : 'text-wood-500'}`}
                                        >
                                            <span>全部品类</span>
                                            {selectedCatId === 'all' && <Check size={14} />}
                                        </button>
                                        {categories.map(cat => (
                                            <button 
                                                key={cat.id}
                                                onClick={() => { setSelectedCatId(cat.id); setIsCatDropdownOpen(false); }}
                                                className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-wood-50 transition-colors flex items-center justify-between ${selectedCatId === cat.id ? 'text-wood-800 bg-wood-50/50' : 'text-wood-500'}`}
                                            >
                                                <span>{cat.emoji} {cat.name}</span>
                                                {selectedCatId === cat.id && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Clear Sort Toggle */}
                <div className="pl-2">
                    <button 
                        onClick={() => setSortAsc(!sortAsc)}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-wood-100 rounded-2xl shadow-sm text-wood-600 hover:text-wood-800 hover:bg-wood-50 transition-colors active:scale-95"
                    >
                        {sortAsc ? (
                            <>
                                <ArrowDownNarrowWide size={16} />
                                <span className="text-xs font-bold">缺货优先</span>
                            </>
                        ) : (
                            <>
                                <ArrowUpNarrowWide size={16} />
                                <span className="text-xs font-bold">库存充裕</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Scrollable Grid with Smooth Layout Animations */}
            <div className="flex-1 overflow-y-auto p-4 pb-32">
                <LayoutGroup>
                    <motion.div layout className="grid grid-cols-2 gap-4">
                        {displayedItems.length === 0 && (
                            <div className="col-span-2 text-center py-20 text-wood-400">
                                <Package size={48} className="mx-auto mb-4 opacity-20" />
                                <p>暂无物品</p>
                                <button onClick={() => setIsAdding(true)} className="mt-4 text-wood-800 font-bold text-sm bg-wood-100 px-4 py-2 rounded-xl">点击添加</button>
                            </div>
                        )}

                        <AnimatePresence mode='popLayout'>
                            {displayedItems.map(item => {
                                const cat = categories.find(c => c.id === item.category_id) || { name: '未分类', emoji: '📦', id: 'unknown' };
                                return (
                                    <VisualStackingCard 
                                        key={item.id}
                                        item={item}
                                        category={cat}
                                        onClick={() => setSelectedItemId(item.id)}
                                        onOpen={() => actions.openInventoryItem(item.id)}
                                        onRestock={() => setQuickRestockItemId(item.id)}
                                    />
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                </LayoutGroup>
            </div>

            {/* Floating Add Button (Fixed) - Hidden when detail is open */}
            {!selectedItemId && (
                <button 
                    onClick={() => setIsAdding(true)}
                    className="fixed bottom-28 left-6 w-14 h-14 bg-wood-800 text-wood-50 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform z-50 hover:bg-wood-700"
                >
                    <Plus size={24} />
                </button>
            )}

            {/* Modals */}
            <AnimatePresence>
                {selectedItemId && (() => {
                    const item = items.find(i => i.id === selectedItemId);
                    const cat = categories.find(c => c.id === item?.category_id) || { name: '未分类', emoji: '📦', id: 'unknown' };
                    if (!item) return null;

                    return (
                        <ItemDetailSheet 
                            item={item}
                            category={cat}
                            onClose={() => setSelectedItemId(null)}
                            onOpenItem={actions.openInventoryItem}
                            onRestockItem={actions.restockInventoryItem}
                            onUpdate={actions.updateInventoryItem}
                            onDelete={actions.deleteInventoryItem}
                            categories={categories}
                            onAddCategory={actions.addInventoryCategory}
                            systemTime={systemTime}
                        />
                    );
                })()}

                {isAdding && (
                    <EditItemModal 
                        categories={categories}
                        onSave={actions.addInventoryItem}
                        onClose={() => setIsAdding(false)}
                        onAddCategory={actions.addInventoryCategory}
                    />
                )}

                {quickRestockItemId && quickRestockItem && (
                    <RestockModal 
                        current={quickRestockItem.current_stock}
                        onConfirm={(amt) => actions.restockInventoryItem(quickRestockItemId, amt)}
                        onClose={() => setQuickRestockItemId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
