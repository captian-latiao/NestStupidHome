

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Sparkles, Clock, Loader2, AlertTriangle, CheckCircle2, Home, Wind, AlertCircle } from 'lucide-react';
import { calculate_entropy, get_hygiene_status, HygieneStatus } from '../services/hygieneLogic';
import { HygieneItem, HygieneState } from '../types';

// --- 1. Visual Assets & Images ---

// High-quality Unsplash IDs for specific categories
const CATEGORY_IMAGES: Record<string, string> = {
  stove: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80',
  floor_vac: 'https://images.unsplash.com/photo-1581539250439-c96689b516dd?auto=format&fit=crop&w=600&q=80',
  floor_mop: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=600&q=80',
  bedding: 'https://plus.unsplash.com/premium_photo-1673942750147-87233d9f29d5?q=80&w=997&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  curtain: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80', 
  toilet: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80', 
  washer: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80', 
  ac_filter: 'https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=600&q=80', 
};

const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E`;

const GRUNGE_SPOTS = [
  'radial-gradient(circle at 20% 30%, rgba(60,50,30,0.15) 0%, transparent 25%)',
  'radial-gradient(circle at 80% 70%, rgba(70,60,40,0.12) 0%, transparent 30%)',
  'radial-gradient(circle at 50% 50%, rgba(40,30,20,0.10) 0%, transparent 40%)'
].join(',');

const getCategoryImage = (category: string): string => {
  return CATEGORY_IMAGES[category] || CATEGORY_IMAGES['floor_vac'];
};

// --- Sub-components ---

const StatusBadge: React.FC<{ status: HygieneStatus }> = ({ status }) => {
  const config = {
    [HygieneStatus.FRESH]: { bg: 'bg-green-100/90', text: 'text-green-800', label: '洁净一新', icon: Sparkles },
    [HygieneStatus.NORMAL]: { bg: 'bg-blue-50/90', text: 'text-blue-700', label: '略有灰尘', icon: null },
    [HygieneStatus.DUSTY]: { bg: 'bg-orange-100/90', text: 'text-orange-800', label: '家务时间到', icon: Clock },
    [HygieneStatus.MESSY]: { bg: 'bg-red-100/95', text: 'text-red-800', label: '过敏警告', icon: AlertTriangle },
  };
  
  const c = config[status];
  const Icon = c.icon;

  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wide backdrop-blur-sm shadow-sm flex items-center gap-1 ${c.bg} ${c.text}`}>
      {Icon && <Icon size={10} strokeWidth={3} />}
      {c.label}
    </span>
  );
};

// --- Helper for Relative Time ---
const getRelativeTime = (timestamp: number, now: number): string => {
  const diffMs = now - timestamp;
  const diffHours = diffMs / (3600 * 1000);
  
  if (diffHours < 1) return "刚刚";
  if (diffHours < 24) return `${Math.floor(diffHours)}小时前`;
  const diffDays = diffHours / 24;
  if (diffDays < 30) return `${Math.floor(diffDays)}天前`;
  return `${Math.floor(diffDays / 30)}月前`;
};

// Enhanced Card Design
const AgingCard: React.FC<{ 
  item: HygieneItem; 
  progress: number; 
  status: HygieneStatus; 
  daysSince: number;
  onClean: () => void;
}> = ({ item, progress, status, daysSince, onClean }) => {
  const [isCleaning, setIsCleaning] = useState(false);

  const normalizedProgress = Math.min(2.0, progress); 
  const noiseOpacity = Math.min(0.6, (normalizedProgress * 0.3)); 
  const grungeOpacity = Math.max(0, Math.min(0.7, (normalizedProgress - 0.5) * 0.7));
  const darkenAmount = Math.max(0, Math.min(0.3, (progress - 1.0) * 0.3));

  const bgImage = useMemo(() => getCategoryImage(item.category), [item.category]);

  const handleCleanClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (isCleaning) return;
    setIsCleaning(true);
    await new Promise(r => setTimeout(r, 1200)); 
    onClean();
    setIsCleaning(false);
  };

  const imageStyle: React.CSSProperties = {
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
  };

  const isFresh = status === HygieneStatus.FRESH;

  return (
    <motion.div 
      layout 
      transition={{ type: "spring", stiffness: 400, damping: 30 }} 
      className="relative w-full bg-wood-50 rounded-3xl shadow-soft border border-wood-100/50 overflow-hidden group min-h-[240px]"
    >
      <div className="absolute inset-0 z-0 bg-wood-50">
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105 opacity-30 saturate-0" style={imageStyle} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-wood-50/40 to-wood-200/90" />
          <div className="absolute inset-0 pointer-events-none">
             <div 
               className="absolute inset-0 mix-blend-multiply transition-opacity duration-1000"
               style={{ backgroundImage: `url("${NOISE_SVG}")`, opacity: noiseOpacity }}
             />
             <div 
               className="absolute inset-0 mix-blend-multiply transition-opacity duration-1000 bg-amber-900/10"
               style={{ backgroundImage: GRUNGE_SPOTS, backgroundSize: '100% 100%', opacity: grungeOpacity }}
             />
             <div 
               className="absolute inset-0 bg-black transition-opacity duration-1000 mix-blend-soft-light"
               style={{ opacity: darkenAmount }}
             />
          </div>
      </div>

      <motion.div 
        className="absolute inset-0 z-10"
        initial={false}
        animate={(isCleaning || isFresh)
           ? { clipPath: 'circle(180% at 88% 85%)' } 
           : { clipPath: 'circle(0% at 88% 85%)' }   
        }
        transition={{ duration: 1.2, ease: "easeInOut" }}
      >
          <div className="absolute inset-0 opacity-30 saturate-0" style={imageStyle} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/50 to-wood-50/80" />
          <div className="absolute inset-0 bg-blue-50/10 mix-blend-overlay" />
      </motion.div>

      <div className="absolute inset-0 p-5 flex flex-col justify-between z-20 pointer-events-none">
         <div className="flex flex-col gap-3 pointer-events-auto">
            <h3 className="text-xl font-serif font-bold text-wood-900 leading-tight drop-shadow-md line-clamp-2">
                {item.name}
            </h3>
            
            <div className="flex items-center gap-2 flex-wrap">
                 <StatusBadge status={isCleaning ? HygieneStatus.FRESH : status} />
                 <span className="text-[10px] font-medium text-wood-600 flex items-center gap-0.5 bg-white/70 px-2 py-1 rounded-md backdrop-blur-md shadow-sm">
                    <Clock size={10} /> {item.base_interval_days}天
                 </span>
            </div>
         </div>
         
         <div className="flex items-end justify-between mt-4 pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[10px] text-wood-500 font-medium mb-0.5 drop-shadow-sm">上次清洁</span>
              <span className="text-sm font-bold text-wood-800 font-mono">
                 {isCleaning ? '刚刚' : (daysSince === 0 ? '今天' : `${daysSince} 天前`)}
              </span>
            </div>
            
            <button 
               onClick={handleCleanClick}
               disabled={isCleaning}
               className={`
                 relative overflow-hidden z-30
                 px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-sm transition-all duration-300
                 ${isCleaning 
                    ? 'bg-wood-100 text-wood-600 border border-wood-200 cursor-default' 
                    : (status === HygieneStatus.FRESH 
                        ? 'bg-white/90 text-wood-400 border border-wood-100 hover:bg-white' 
                        : 'bg-wood-800 text-wood-50 border-transparent hover:bg-wood-700 active:scale-95 shadow-md')
                 }
               `}
            >
               {isCleaning ? (
                 <Loader2 size={14} className="animate-spin" />
               ) : (
                 <Sparkles size={14} className={status !== HygieneStatus.FRESH ? "text-yellow-200" : ""} />
               )}
               {isCleaning ? '焕新中' : '焕新'}
            </button>
         </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-wood-100/30 z-20">
         <motion.div 
            initial={false}
            animate={{ width: `${Math.min(100, (isCleaning ? 0 : progress) * 100)}%` }} 
            className={`h-full ${progress > 1.5 ? 'bg-red-500' : (progress > 1.0 ? 'bg-orange-400' : (progress > 0.8 ? 'bg-yellow-400' : 'bg-green-400'))}`}
         />
      </div>

      <AnimatePresence>
        {isCleaning && (
          <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0] }}
                  transition={{ duration: 1.2, times: [0, 0.5, 1] }}
                  className="absolute inset-0 bg-white mix-blend-overlay"
               />
               
               {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                     key={i}
                     style={{
                        top: `${Math.random() * 80 + 10}%`,
                        left: `${Math.random() * 80 + 10}%`,
                     }}
                     initial={{ opacity: 0, scale: 0, rotate: 0 }}
                     animate={{ 
                        opacity: [0, 1, 0], 
                        scale: [0, 1.2, 0],
                        rotate: [0, 45, 90]
                     }}
                     transition={{ 
                        duration: 0.8 + Math.random() * 0.4, 
                        delay: Math.random() * 0.6,
                        ease: "easeOut" 
                     }}
                     className="absolute"
                  >
                     <Sparkles size={12 + Math.random() * 12} className="text-yellow-400" fill="currentColor" />
                  </motion.div>
               ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Main Views ---

export const HygieneWidget: React.FC<{ data: HygieneState; systemTime: number }> = ({ data, systemTime }) => {
  const urgentItems = useMemo(() => {
      if (!data?.items || data.items.length === 0) return [];
      
      return data.items
        .map(item => {
            const entropy = calculate_entropy(item.last_cleaned_at, item.base_interval_days, item.is_public_area, 2, systemTime);
            const status = get_hygiene_status(entropy);
            return { ...item, progress: entropy, status, lastCleanedAt: item.last_cleaned_at };
        })
        .filter(item => item.status === HygieneStatus.DUSTY || item.status === HygieneStatus.MESSY)
        .sort((a, b) => b.progress - a.progress);
  }, [data, systemTime]);

  const Header = () => (
     <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg shadow-sm border border-blue-100">
               <Sparkles size={16} />
            </div>
            <span className="font-serif text-lg text-wood-800">清洁</span>
        </div>
        {urgentItems.length > 0 && (
           <div className="bg-red-50 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-red-100">
              <AlertCircle size={10} />
              {urgentItems.length} 待办
           </div>
        )}
     </div>
  );

  // EMPTY STATE: All Clean
  if (urgentItems.length === 0) {
     return (
        <div className="h-full p-5 relative overflow-hidden flex flex-col">
           {/* Ambient Background */}
           <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-white to-wood-50/20" />
           <div className="absolute -bottom-10 -right-4 text-blue-100/60 rotate-[10deg]">
              <Home size={160} strokeWidth={1} />
           </div>
           
           <Header />

           <div className="flex-1 flex flex-col items-center justify-center relative z-10 pb-2">
              <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-full flex items-center justify-center shadow-soft mb-3 border border-blue-100/50"
              >
                 <CheckCircle2 size={32} className="text-blue-500" strokeWidth={2} />
              </motion.div>
              <div className="text-center">
                 <div className="text-wood-800 font-bold text-sm">焕然一新</div>
                 <div className="text-wood-400 text-[10px] mt-0.5">全屋卫生状况良好</div>
              </div>
           </div>
        </div>
     );
  }

  // URGENT STATE: Focus on Dirty Item
  const topItem = urgentItems[0];
  const isMessy = topItem.status === HygieneStatus.MESSY;
  const timeSince = getRelativeTime(topItem.lastCleanedAt, systemTime);

  return (
    <div className="h-full p-5 relative overflow-hidden flex flex-col">
       {/* Ambient Background */}
       <div className={`absolute inset-0 bg-gradient-to-br ${isMessy ? 'from-red-50/50 to-orange-50/30' : 'from-orange-50/50 to-yellow-50/30'}`} />

       <Header />

       <div className="flex-1 flex flex-col justify-end relative z-10">
          <div className="text-[10px] text-wood-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
             <Clock size={10} /> {timeSince}清洁
          </div>
          
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-white/60 rounded-xl backdrop-blur-sm text-wood-600 border border-wood-100/50">
               {isMessy ? <AlertTriangle size={24} className="text-red-500" /> : <Wind size={24} />}
             </div>
             <div className="flex-1">
                <div className="text-lg font-bold text-wood-900 leading-none mb-1">{topItem.name}</div>
                <div className={`text-xs font-bold ${isMessy ? 'text-red-500' : 'text-orange-500'}`}>
                   {isMessy ? '严重积灰 · 建议立即打扫' : '有些脏了 · 建议打扫'}
                </div>
             </div>
          </div>

          <div className="w-full bg-white/60 h-1.5 rounded-full overflow-hidden mb-2">
             <div 
               className={`h-full rounded-full ${isMessy ? 'bg-red-500' : 'bg-orange-400'}`}
               style={{ width: `${Math.min(100, topItem.progress * 100)}%` }}
             />
          </div>
          
          {urgentItems.length > 1 && (
             <div className="text-[10px] text-wood-400 text-center">
                还有 {urgentItems.length - 1} 处区域需要清洁
             </div>
          )}
       </div>
    </div>
  );
};

export const HygieneDetailView: React.FC<{ data: HygieneState & { memberCount: number }; actions: any; systemTime: number }> = ({ data, actions, systemTime }) => {
  const items = data.items || [];
  const memberCount = data.memberCount || 2;

  const processedItems = useMemo(() => {
     return items.map(item => {
        const progress = calculate_entropy(
           item.last_cleaned_at, 
           item.base_interval_days, 
           item.is_public_area, 
           memberCount, 
           systemTime
        );
        const status = get_hygiene_status(progress);
        const daysSince = Math.floor((systemTime - item.last_cleaned_at) / (24 * 3600 * 1000));
        return { ...item, progress, status, daysSince };
     }).sort((a, b) => b.progress - a.progress);
  }, [items, memberCount, systemTime]);

  return (
    <div className="pb-8 animate-[fadeIn_0.3s_ease-out] relative">
       <LayoutGroup>
          <motion.div 
            layout 
            className="grid grid-cols-2 gap-4 mt-1"
          >
             <AnimatePresence>
                {processedItems.map(item => (
                   <AgingCard 
                     key={item.id}
                     item={item}
                     progress={item.progress}
                     status={item.status}
                     daysSince={item.daysSince}
                     onClean={() => actions.cleanHygieneItem(item.id)}
                   />
                ))}
             </AnimatePresence>
          </motion.div>
       </LayoutGroup>
    </div>
  );
};
