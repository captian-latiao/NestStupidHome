
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Cat, AlertCircle, Heart, Check, Sparkles, Clock, AlertTriangle, Loader2, Smile, ArrowRight } from 'lucide-react';
import { PetState, PetCareItem } from '../types';
import { 
  calculate_pet_entropy, 
  get_pet_status, 
  PetCareStatus, 
  get_pet_config, 
  get_pet_image,
  PAW_PRINT_SVG_RAW,
  SCRATCH_SVG_RAW
} from '../services/petLogic';

// --- Sub-components ---

const StatusBadge: React.FC<{ status: PetCareStatus }> = ({ status }) => {
  const config = {
    [PetCareStatus.HAPPY]: { bg: 'bg-green-100/90', text: 'text-green-800', label: '惬意', icon: Sparkles },
    [PetCareStatus.OKAY]: { bg: 'bg-blue-50/90', text: 'text-blue-700', label: '舒适', icon: null },
    [PetCareStatus.STALE]: { bg: 'bg-yellow-100/90', text: 'text-yellow-800', label: '有味道', icon: Clock },
    [PetCareStatus.CRISIS]: { bg: 'bg-red-100/95', text: 'text-red-800', label: '脏乱!', icon: AlertTriangle },
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

// --- Random Dirt Layer Component ---
const DirtLayer: React.FC<{ status: PetCareStatus }> = ({ status }) => {
  const isStale = status === PetCareStatus.STALE;
  const isCrisis = status === PetCareStatus.CRISIS;

  const dirtSpots = useMemo(() => {
    const count = 8;
    return Array.from({ length: count }).map(() => ({
      top: `${Math.random() * 80 + 10}%`,
      left: `${Math.random() * 80 + 10}%`,
      rotation: Math.random() * 360,
      scale: 0.4 + Math.random() * 0.6,
      type: Math.random() > 0.3 ? 'paw' : 'scratch'
    }));
  }, []);

  if (!isStale && !isCrisis) return null;
  const visibleCount = isCrisis ? 8 : 3;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {dirtSpots.slice(0, visibleCount).map((spot, i) => (
        <div
          key={i}
          className="absolute w-12 h-12 bg-no-repeat bg-contain transition-opacity duration-1000"
          style={{
            top: spot.top,
            left: spot.left,
            transform: `translate(-50%, -50%) rotate(${spot.rotation}deg) scale(${spot.scale})`,
            backgroundImage: `url("${spot.type === 'paw' ? PAW_PRINT_SVG_RAW : SCRATCH_SVG_RAW}")`,
            opacity: isCrisis ? 0.9 : 0.5,
            filter: isCrisis ? 'brightness(0.6) sepia(0.4)' : 'opacity(0.6)'
          }}
        />
      ))}
      {isCrisis && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(60,40,20,0.3)_100%)] mix-blend-multiply" />
      )}
    </div>
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

// --- Visual Aging Card for Pets ---
const PetAgingCard: React.FC<{
  item: PetCareItem;
  progress: number;
  status: PetCareStatus;
  onCare: () => void;
  hoursSince: number;
}> = ({ item, progress, status, onCare, hoursSince }) => {
  const [isCleaning, setIsCleaning] = useState(false);
  const bgImage = useMemo(() => get_pet_image(item.type), [item.type]);
  const isHappy = status === PetCareStatus.HAPPY;
  const isDirty = status === PetCareStatus.STALE || status === PetCareStatus.CRISIS;

  const handleCare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCleaning) return;
    setIsCleaning(true);
    await new Promise(r => setTimeout(r, 1200));
    onCare();
    setIsCleaning(false);
  };

  const imageStyle: React.CSSProperties = {
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
  };

  const thresholdLabel = item.base_interval_hours >= 24
    ? `${Math.round(item.base_interval_hours / 24)}天`
    : `${item.base_interval_hours}h`;

  return (
    <motion.div 
      layout
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`
        relative w-full rounded-3xl overflow-hidden border transition-shadow duration-300 min-h-[200px] group
        bg-wood-50 border-wood-100/50 shadow-soft
      `}
    >
      <div className="absolute inset-0 z-0 bg-wood-50">
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105 opacity-40 saturate-50" style={imageStyle} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-wood-50/20 to-wood-200/90" />
          <DirtLayer status={status} />
      </div>

      <motion.div 
        className="absolute inset-0 z-10"
        initial={false}
        animate={(isCleaning || !isDirty)
           ? { clipPath: 'circle(180% at 88% 85%)' } 
           : { clipPath: 'circle(0% at 88% 85%)' } 
        }
        transition={{ duration: 1.2, ease: "easeInOut" }}
      >
          <div className="absolute inset-0 opacity-40" style={imageStyle} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/60 to-wood-50/80" />
          <div className="absolute inset-0 bg-blue-50/10 mix-blend-overlay" />
      </motion.div>

      <div className="absolute inset-0 p-4 flex flex-col justify-between z-20 pointer-events-none">
         <div className="flex flex-col gap-2 pointer-events-auto">
            <h3 className="text-lg font-serif font-bold text-wood-900 leading-tight drop-shadow-md flex items-center gap-2 truncate">
                {item.name.split('(')[0]}
            </h3>
            
            <div className="flex flex-wrap gap-1.5">
                 <StatusBadge status={isCleaning ? PetCareStatus.HAPPY : status} />
                 <span className="text-[10px] font-medium text-wood-600 flex items-center gap-0.5 bg-white/70 px-2 py-1 rounded-md backdrop-blur-md shadow-sm">
                    <Clock size={10} /> {thresholdLabel}
                 </span>
            </div>
         </div>

         <div className="flex flex-col gap-2 mt-auto pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[10px] text-wood-500 font-medium mb-0.5 drop-shadow-sm">上次护理</span>
              <span className="text-xs font-bold text-wood-800 font-mono">
                 {isCleaning ? '刚刚' : (hoursSince < 1 ? '刚刚' : (hoursSince > 24 ? `${Math.floor(hoursSince/24)} 天前` : `${Math.floor(hoursSince)}h 前`))}
              </span>
            </div>

            <button
               onClick={handleCare}
               disabled={isCleaning}
               className={`
                 relative overflow-hidden z-30 w-full
                 py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold shadow-sm transition-all duration-300
                 ${isCleaning 
                    ? 'bg-wood-100 text-wood-600 border border-wood-200 cursor-default' 
                    : (status === PetCareStatus.HAPPY 
                        ? 'bg-white/90 text-wood-400 border border-wood-100 hover:bg-white' 
                        : 'bg-wood-800 text-wood-50 border-transparent hover:bg-wood-700 active:scale-95 shadow-md')
                 }
               `}
            >
               {isCleaning ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
               {isCleaning ? '护理中' : '完成'}
            </button>
         </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-wood-100/30 z-20">
         <motion.div 
            initial={false}
            animate={{ width: `${Math.min(100, (isCleaning ? 0 : progress) * 100)}%` }} 
            className={`h-full ${status === PetCareStatus.CRISIS ? 'bg-red-500' : (status === PetCareStatus.STALE ? 'bg-orange-400' : 'bg-green-400')}`}
         />
      </div>

      <AnimatePresence>
        {isCleaning && (
          <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 bg-white mix-blend-overlay"
             />
             {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                   key={i}
                   initial={{ opacity: 0, y: 20, scale: 0 }}
                   animate={{ opacity: [0, 1, 0], y: -60, scale: 1.5 }}
                   transition={{ delay: Math.random() * 0.3, duration: 0.8 }}
                   className="absolute left-1/2 top-1/2 text-orange-400"
                   style={{ left: `${Math.random() * 80 + 10}%`, top: `${Math.random() * 60 + 20}%` }}
                >
                   {Math.random() > 0.5 ? <Heart size={20} fill="currentColor" /> : <Sparkles size={20} />}
                </motion.div>
             ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Widgets ---

export const PetWidget: React.FC<{ data: PetState & { memberCount: number }; systemTime: number }> = ({ data, systemTime }) => {
  const urgentItems = useMemo(() => {
    if (!data?.care_items) return [];
    
    return [...data.care_items]
      .map(item => {
         const progress = calculate_pet_entropy(item, 2, systemTime); 
         const status = get_pet_status(progress);
         return { ...item, progress, status, lastActionAt: item.last_action_at };
      })
      .filter(item => item.status === PetCareStatus.STALE || item.status === PetCareStatus.CRISIS)
      .sort((a, b) => b.progress - a.progress); // Sort by Dirtiest
  }, [data, systemTime]);

  // Unified Widget Header (Internal)
  const Header = () => (
     <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg shadow-sm border border-orange-100">
               <Cat size={16} />
            </div>
            <span className="font-serif text-lg text-wood-800">宠物</span>
        </div>
        {urgentItems.length > 0 && (
           <div className="bg-red-50 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-red-100">
              <AlertCircle size={10} />
              {urgentItems.length} 待办
           </div>
        )}
     </div>
  );

  // EMPTY STATE: All Good (Unified Visual)
  if (urgentItems.length === 0) {
     return (
        <div className="h-full p-5 relative overflow-hidden flex flex-col">
           {/* Ambient Background */}
           <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-white to-wood-50/20" />
           <div className="absolute -bottom-8 -right-8 text-orange-100/50 rotate-[-10deg]">
              <Cat size={160} strokeWidth={1.5} />
           </div>

           <Header />

           <div className="flex-1 flex flex-col items-center justify-center relative z-10 pb-2">
              <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center shadow-soft mb-3 border border-orange-100/50"
              >
                 <Smile size={32} className="text-orange-400" strokeWidth={2} />
              </motion.div>
              <div className="text-center">
                 <div className="text-wood-800 font-bold text-sm">主子很满意</div>
                 <div className="text-wood-400 text-[10px] mt-0.5">暂无护理事项</div>
              </div>
           </div>
        </div>
     );
  }

  // URGENT STATE: Focus on the ONE most important task
  const topItem = urgentItems[0];
  const config = get_pet_config(topItem.type);
  const isCrisis = topItem.status === PetCareStatus.CRISIS;

  return (
    <div className="h-full p-5 relative overflow-hidden flex flex-col">
       {/* Ambient Background (Urgent) */}
       <div className={`absolute inset-0 bg-gradient-to-br ${isCrisis ? 'from-red-50/50 to-orange-50/30' : 'from-orange-50/50 to-yellow-50/30'}`} />
       
       <Header />

       <div className="flex-1 flex flex-col justify-end relative z-10">
          <div className="text-[10px] text-wood-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
             <Clock size={10} /> 
             {getRelativeTime(topItem.lastActionAt, systemTime)}
          </div>
          
          <div className="flex items-center gap-3 mb-2">
             <div className="text-3xl">{config.iconEmoji}</div>
             <div className="flex-1">
                <div className="text-lg font-bold text-wood-900 leading-none mb-1">{topItem.name}</div>
                <div className={`text-xs font-bold ${isCrisis ? 'text-red-500' : 'text-orange-500'}`}>
                   {isCrisis ? '非常脏乱 · 需要立即处理' : '有点味道了 · 建议处理'}
                </div>
             </div>
          </div>

          <div className="w-full bg-white/60 h-1.5 rounded-full overflow-hidden mb-2">
             <div 
               className={`h-full rounded-full ${isCrisis ? 'bg-red-500' : 'bg-orange-400'}`}
               style={{ width: `${Math.min(100, topItem.progress * 100)}%` }}
             />
          </div>

          {urgentItems.length > 1 && (
             <div className="text-[10px] text-wood-400 text-center">
                还有 {urgentItems.length - 1} 项其他任务
             </div>
          )}
       </div>
    </div>
  );
};

export const PetDetailView: React.FC<{ 
  data: PetState & { memberCount: number, pets?: any[] }; 
  actions: any; 
  systemTime: number 
}> = ({ data, actions, systemTime }) => {
  const petCount = data.pets ? data.pets.length : 1; 
  
  const items = useMemo(() => {
    if (!data?.care_items) return [];
    return [...data.care_items].map(item => {
      const progress = calculate_pet_entropy(item, petCount, systemTime);
      const status = get_pet_status(progress);
      const hoursSince = (systemTime - item.last_action_at) / (3600 * 1000);
      return { ...item, progress, status, hoursSince };
    }).sort((a, b) => {
        const isAUrgent = a.status === PetCareStatus.STALE || a.status === PetCareStatus.CRISIS;
        const isBUrgent = b.status === PetCareStatus.STALE || b.status === PetCareStatus.CRISIS;
        if (isAUrgent && !isBUrgent) return -1;
        if (!isAUrgent && isBUrgent) return 1;
        if (isAUrgent && isBUrgent) return b.progress - a.progress;
        return a.base_interval_hours - b.base_interval_hours;
    });
  }, [data, petCount, systemTime]);

  return (
    <div className="pb-8 animate-[fadeIn_0.3s_ease-out] relative">
       <LayoutGroup>
          <motion.div 
            layout 
            className="grid grid-cols-2 gap-3 mt-2" 
          >
             <AnimatePresence>
                {items.map(item => (
                   <PetAgingCard 
                     key={item.id}
                     item={item}
                     progress={item.progress}
                     status={item.status}
                     hoursSince={item.hoursSince}
                     onCare={() => actions.performPetCare(item.id)}
                   />
                ))}
             </AnimatePresence>
          </motion.div>
       </LayoutGroup>
    </div>
  );
};
