
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
   Droplets, Info, Edit3, RefreshCw, SlidersHorizontal,
   X, Clock, Activity, FastForward, Zap, Bug, Waves, AlertCircle, Cat
} from 'lucide-react';
import { WaterState, WaterActionReport } from '../types';
import { Heading, Subheading } from '../components/ui/Typography';
import { TrendChart, SleepCycleSlider, BubbleParticles, WavePath } from '../components/shared/Common';
import { calculate_current_level, predict_endurance_hours, get_active_duration, generate_trend_data } from '../services/waterLogic';

// --- Components ---

const WaterHeaderInfo: React.FC<{
   percentage: number;
   currentLevel: number;
   maxCapacity: number;
   enduranceText: string;
   theme: 'dark' | 'light';
   onConfigClick: (e: React.MouseEvent) => void;
}> = ({ percentage, currentLevel, maxCapacity, enduranceText, theme, onConfigClick }) => {

   const textColor = theme === 'dark' ? 'text-wood-800' : 'text-white';
   const subTextColor = theme === 'dark' ? 'text-wood-500' : 'text-white/80';
   const pillClass = theme === 'dark' ? 'bg-wood-800/10 text-wood-700' : 'bg-white/20 text-white';

   return (
      <div className="flex justify-between items-start w-full">
         <div>
            <div className={`text-4xl font-serif font-bold ${textColor}`}>
               {percentage.toFixed(0)}<span className="text-xl opacity-60">%</span>
            </div>
            <div className={`flex items-center text-[10px] mt-0.5 font-medium ${subTextColor}`}>
               <span>{currentLevel.toFixed(1)}L / {maxCapacity}L</span>
            </div>
         </div>
         <div className={`px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md flex items-center gap-1 ${pillClass}`}>
            <Clock size={10} /> {enduranceText}
         </div>
      </div>
   );
};

// --- Animation Component: Refill Stream ---
const RefillStream = () => (
   <div className="absolute inset-0 z-[25] pointer-events-none overflow-hidden rounded-[40px]">
      {/* Outer Glow Column */}
      <motion.div
         initial={{ height: 0, opacity: 0 }}
         animate={{ height: '100%', opacity: 1 }}
         exit={{ height: 0, opacity: 0 }}
         transition={{ duration: 0.4, ease: "circIn" }}
         className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-full bg-gradient-to-b from-white/40 via-blue-200/20 to-blue-400/10 blur-xl"
      />

      {/* Inner Core Stream */}
      <motion.div
         initial={{ height: 0 }}
         animate={{ height: '100%' }}
         exit={{ height: 0 }}
         transition={{ duration: 0.2, ease: "linear" }}
         className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-full bg-gradient-to-b from-white/90 via-white/50 to-transparent blur-[2px]"
      />

      {/* Turbulence / Impact Bubbles at the center */}
      {Array.from({ length: 15 }).map((_, i) => (
         <motion.div
            key={i}
            initial={{ y: '110%', x: '-50%', opacity: 0, scale: 0.2 }}
            animate={{
               y: '-10%',
               opacity: [0, 1, 0],
               scale: [0.5, 1.5 + Math.random(), 0.5],
               x: `calc(-50% + ${Math.random() * 80 - 40}px)`
            }}
            transition={{
               duration: 1.5 + Math.random(),
               repeat: Infinity,
               delay: Math.random() * 0.5,
               ease: "easeOut"
            }}
            className="absolute bottom-0 left-1/2 w-3 h-3 bg-white/60 rounded-full shadow-sm"
         />
      ))}
   </div>
);

export const WaterSetupView: React.FC<{ onSave: (cap: number) => void }> = ({ onSave }) => {
   const [customCap, setCustomCap] = useState('');
   const presets = [
      { label: '标准桶装水', val: 18.9 },
      { label: '中号桶装水', val: 11.3 },
      { label: '大桶矿泉水', val: 5.0 },
      { label: '家用凉水壶', val: 1.5 },
   ];

   return (
      <div className="h-full flex flex-col justify-center items-center p-6 space-y-8 animate-[fadeIn_0.5s_ease-out]">
         <div className="text-center space-y-2">
            <div className="inline-flex p-4 bg-blue-50 text-blue-500 rounded-full shadow-sm mb-2">
               <Droplets size={32} />
            </div>
            <Heading className="text-2xl">配置饮水设备</Heading>
            <p className="text-wood-400 text-sm">请告诉 Nest 您的饮水机/水桶的最大容量</p>
         </div>

         <div className="grid grid-cols-2 gap-3 w-full">
            {presets.map(p => (
               <button
                  key={p.val}
                  onClick={() => onSave(p.val)}
                  className="p-4 bg-white border border-wood-100 rounded-2xl shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all text-left group active:scale-95"
               >
                  <div className="font-bold text-lg group-hover:text-blue-600 text-wood-800">{p.val}L</div>
                  <div className="text-xs text-wood-400">{p.label}</div>
               </button>
            ))}
         </div>

         <div className="w-full space-y-4">
            <div className="relative group">
               <input
                  type="number"
                  placeholder="自定义容量"
                  value={customCap}
                  onChange={e => setCustomCap(e.target.value)}
                  className="w-full bg-white border border-wood-200 p-4 rounded-2xl text-lg font-bold text-wood-900 focus:outline-none focus:border-blue-400 transition-colors placeholder:text-wood-300"
               />
               <span className="absolute right-6 top-1/2 -translate-y-1/2 text-wood-400 font-medium">L</span>
            </div>
            <button
               onClick={() => { if (customCap) onSave(parseFloat(customCap)); }}
               disabled={!customCap}
               className="w-full bg-wood-800 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
            >
               开始运转
            </button>
         </div>
      </div>
   )
}

// --- Main Views ---

export const WaterWidget: React.FC<{ data: WaterState; systemTime: number }> = ({ data, systemTime }) => {
   const [displayLevel, setDisplayLevel] = useState(data.current_level);

   useEffect(() => {
      const update = () => {
         const lvl = calculate_current_level(data.max_capacity, data.last_refill_timestamp, systemTime, data.current_cycle_rate, data.sleep_window);
         setDisplayLevel(lvl);
      };
      update();
   }, [data, systemTime]);

   if (data.max_capacity === 0) {
      return (
         <div className="w-full h-full relative p-5 flex flex-col overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-wood-50 to-white" />

            {/* Header */}
            <div className="relative z-10 w-full flex justify-between items-start">
               <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg shadow-sm border border-blue-100">
                     <Droplets size={16} />
                  </div>
                  <span className="font-serif text-lg text-wood-800">饮水</span>
               </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center pb-2">
               <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-soft mb-3 border border-wood-100 text-blue-400"
               >
                  <Info size={24} strokeWidth={2} />
               </motion.div>
               <div className="text-center">
                  <span className="block text-sm font-bold text-wood-800">配置容器</span>
                  <span className="block text-[10px] text-wood-400 mt-1">点击设置容量</span>
               </div>
            </div>
         </div>
      );
   }

   // Visual Calculations
   const percentage = data.max_capacity > 0 ? Math.round((displayLevel / data.max_capacity) * 100) : 0;
   const safePercentage = Math.min(100, Math.max(0, percentage));

   const enduranceHours = predict_endurance_hours(displayLevel, data.current_cycle_rate, data.sleep_window, systemTime);

   let enduranceText = "";
   if (displayLevel <= 0.1) enduranceText = "已耗尽";
   else if (enduranceHours > 24) enduranceText = `约 ${Math.round(enduranceHours / 24)} 天后`;
   else enduranceText = `约 ${Math.round(enduranceHours)}h 后`;

   // Colors based on level
   let liquidColor = 'bg-gradient-to-t from-blue-500 to-cyan-400';
   let waveColor = 'text-cyan-300';
   if (safePercentage < 20) {
      liquidColor = 'bg-gradient-to-t from-red-500 to-orange-400';
      waveColor = 'text-orange-300';
   } else if (safePercentage < 40) {
      liquidColor = 'bg-gradient-to-t from-indigo-600 to-blue-500';
      waveColor = 'text-blue-400';
   }

   // Determine header text color based on liquid level
   // If liquid is very high (>85%), it covers the header area, so text should be white.
   const isHigh = safePercentage > 85;

   return (
      // Unified Card Container - removing internal borders to blend with WidgetSlot
      <div className="w-full h-full relative isolate">
         {/* Background */}
         <div className="absolute inset-0 bg-wood-50" />

         {/* Liquid Container */}
         <motion.div
            className={`absolute bottom-0 left-0 right-0 ${liquidColor}`}
            initial={{ height: `${safePercentage}%` }}
            animate={{ height: `${safePercentage}%` }}
            transition={{ type: "spring", stiffness: 20, damping: 20 }}
         >
            {/* Wave */}
            <div className={`absolute -top-3 left-0 right-0 h-6 w-[200%] ${waveColor} opacity-50`}>
               <motion.div
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="w-full h-full"
               >
                  <WavePath />
               </motion.div>
            </div>
         </motion.div>

         {/* Content Overlay */}
         <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none">

            {/* Unified Header */}
            <div className="pointer-events-auto w-full flex justify-between items-start z-10">
               <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg shadow-sm border transition-colors duration-300 ${isHigh ? 'bg-white/20 text-white border-white/20' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                     <Droplets size={16} />
                  </div>
                  <span className={`font-serif text-lg transition-colors duration-300 ${isHigh ? 'text-white' : 'text-wood-800'}`}>饮水</span>
               </div>
            </div>

            <div className="pointer-events-auto w-full z-10">
               <WaterHeaderInfo
                  percentage={safePercentage}
                  currentLevel={displayLevel}
                  maxCapacity={data.max_capacity}
                  enduranceText={enduranceText}
                  theme={safePercentage > 60 ? 'light' : 'dark'}
                  onConfigClick={() => { }}
               />
            </div>
         </div>
      </div>
   );
};

export const WaterDetailView: React.FC<{ data: any; actions: any; systemTime: number }> = ({ data, actions, systemTime }) => {
   const [currentLevel, setCurrentLevel] = useState(data.current_level);
   const [enduranceHours, setEnduranceHours] = useState(0);

   const [isRefilling, setIsRefilling] = useState(false);
   const [isCalibrating, setIsCalibrating] = useState(false);
   const [calibrationValue, setCalibrationValue] = useState(data.current_level);

   const [isConfiguring, setIsConfiguring] = useState(false);
   const [newMaxCapacity, setNewMaxCapacity] = useState(data.max_capacity);

   const [isDebugOpen, setIsDebugOpen] = useState(false);
   const [debugRate, setDebugRate] = useState(data.learned_hourly_rate.toString());

   // Toast State
   const [toastMessage, setToastMessage] = useState<string | null>(null);

   const trendLogs = useMemo(() => generate_trend_data(data, systemTime), [data, systemTime]);
   const activeHours = get_active_duration(data.last_refill_timestamp, systemTime, data.sleep_window);

   useEffect(() => {
      if (isRefilling) return;

      const tick = () => {
         const lvl = calculate_current_level(data.max_capacity, data.last_refill_timestamp, systemTime, data.current_cycle_rate, data.sleep_window);
         setCurrentLevel(lvl);
         const hours = predict_endurance_hours(lvl, data.current_cycle_rate, data.sleep_window, systemTime);
         setEnduranceHours(hours);

         if (!isCalibrating) {
            setCalibrationValue(lvl);
         }
      };
      tick();
      const interval = setInterval(tick, 30000);
      return () => clearInterval(interval);
   }, [data, isCalibrating, isRefilling, systemTime]);

   useEffect(() => {
      setNewMaxCapacity(data.max_capacity);
   }, [data.max_capacity]);

   useEffect(() => {
      setDebugRate(data.learned_hourly_rate.toString());
   }, [data.learned_hourly_rate]);

   // Watch for Outlier Reports
   useEffect(() => {
      if (data.last_action_report && data.last_action_report.is_outlier && data.last_action_report.message) {
         if (Math.abs(data.last_action_report.timestamp - systemTime) < 5000) {
            setToastMessage(data.last_action_report.message);
            const timer = setTimeout(() => setToastMessage(null), 4000);
            return () => clearTimeout(timer);
         }
      }
   }, [data.last_action_report, systemTime]);

   if (data.max_capacity === 0) {
      return <WaterSetupView onSave={actions.updateWaterMaxCapacity} />;
   }

   const percentage = Math.min(100, Math.max(0, (currentLevel / data.max_capacity) * 100));

   let gradientClass = 'from-cyan-400 to-blue-500';
   if (percentage < 20) {
      gradientClass = 'from-orange-400 to-red-500';
   } else if (percentage < 40) {
      gradientClass = 'from-blue-500 to-indigo-600';
   }
   if (isRefilling) {
      gradientClass = 'from-cyan-300 to-blue-400';
   }

   const handleRefill = async () => {
      if (isRefilling) return;
      setIsRefilling(true);
      // Animation duration logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      actions.refillWater();
      setTimeout(() => {
         setIsRefilling(false);
      }, 200);
   };

   const saveCalibration = () => {
      actions.calibrateWater(calibrationValue);
      setIsCalibrating(false);
   };

   const saveConfiguration = () => {
      actions.updateWaterMaxCapacity(newMaxCapacity);
      setIsConfiguring(false);
   };

   const handleDebugRateSave = () => {
      const val = parseFloat(debugRate);
      if (!isNaN(val)) {
         actions.updateModuleData('water', {
            learned_hourly_rate: val,
            current_cycle_rate: val
         });
      }
   };

   const getEnduranceText = () => {
      if (isRefilling) return "正在注水...";
      if (enduranceHours <= 0) return "已耗尽，请换水";
      if (enduranceHours > 24) return `约 ${Math.round(enduranceHours / 24)} 天后见底`;
      return `约 ${Math.round(enduranceHours)} 小时后见底`;
   };

   const displayPercentage = isRefilling ? 110 : percentage;

   // Calculate Human Readable Stats
   const hourlyRateMl = data.current_cycle_rate * 1000;
   // Assume a standard cup is 220ml
   const cupsPerHour = (hourlyRateMl / 220).toFixed(1);

   // Calculate Standard Reference for Chart (1.7L per person per day)
   const memberCount = data.memberCount || 2; // Fallback to 2 if not provided
   const dailyReferenceValue = 1.7 * memberCount;

   return (
      <div className="flex flex-col h-full gap-4 relative">
         {/* Toast Notification */}
         <AnimatePresence>
            {toastMessage && (
               <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="fixed bottom-[100px] left-0 right-0 z-[60] px-4 pointer-events-none flex justify-center"
               >
                  <div className="w-full max-w-md pointer-events-auto">
                     <div className="bg-white/95 backdrop-blur-md border border-wood-200/50 p-4 rounded-[20px] shadow-2xl flex items-center gap-4">
                        <div className="flex-shrink-0 relative">
                           <div className="h-10 w-10 rounded-full bg-wood-200 flex items-center justify-center border-2 border-white shadow-soft text-wood-800">
                              <Cat size={20} strokeWidth={2} />
                           </div>
                           <div className="absolute -bottom-1 -right-1 bg-wood-800 text-wood-50 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm">
                              军军
                           </div>
                        </div>

                        <div className="flex-1">
                           <p className="text-sm font-medium text-wood-900 leading-snug">
                              {toastMessage}
                           </p>
                        </div>

                        <button
                           onClick={() => setToastMessage(null)}
                           className="flex-shrink-0 p-2 text-wood-300 hover:text-wood-500 rounded-full transition-colors"
                        >
                           <X size={16} />
                        </button>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Main Liquid Card */}
         <div className={`relative flex-1 min-h-[450px] w-full rounded-[40px] overflow-hidden shadow-xl border border-white/20 isolate bg-wood-50 shrink-0`}>

            {/* REFILL STREAM EFFECT */}
            <AnimatePresence>
               {isRefilling && <RefillStream />}
            </AnimatePresence>

            {/* Layer 1: Base Content (Dark Theme, visible when liquid is low) */}
            <div className="absolute inset-0 z-10 p-8 flex flex-col justify-between pointer-events-none">
               <div className="pointer-events-auto w-full">
                  <WaterHeaderInfo
                     percentage={isRefilling ? 100 : percentage}
                     currentLevel={isRefilling ? data.max_capacity : currentLevel}
                     maxCapacity={data.max_capacity}
                     enduranceText={getEnduranceText()}
                     theme="dark"
                     onConfigClick={(e) => { e.stopPropagation(); setIsConfiguring(true); }}
                  />
               </div>
            </div>

            {/* Layer 2a: Liquid Visuals (Gradient + Bubbles + Surface) */}
            <motion.div
               className={`absolute bottom-0 left-0 right-0 z-10`}
               initial={{ height: `${percentage}%` }}
               animate={{ height: `${displayPercentage}%` }}
               transition={{
                  type: "spring",
                  stiffness: isRefilling ? 15 : 50,
                  damping: isRefilling ? 10 : 20
               }}
            >
               {/* Wave Animation at the top of the liquid */}
               <div className="absolute -top-5 left-0 right-0 h-10 w-full overflow-hidden z-20 opacity-50">
                  <motion.div
                     animate={{ x: ["0%", "-50%"] }}
                     transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                     className="w-[200%] h-full flex"
                  >
                     <div className={`w-1/2 h-full ${percentage < 20 ? 'text-red-400' : (percentage < 40 ? 'text-indigo-400' : 'text-blue-300')}`}><WavePath /></div>
                     <div className={`w-1/2 h-full ${percentage < 20 ? 'text-red-400' : (percentage < 40 ? 'text-indigo-400' : 'text-blue-300')}`}><WavePath /></div>
                  </motion.div>
               </div>
               <div className="absolute -top-5 left-0 right-0 h-10 w-full overflow-hidden z-10 opacity-30 scale-x-[-1]">
                  <motion.div
                     animate={{ x: ["-50%", "0%"] }}
                     transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                     className="w-[200%] h-full flex"
                  >
                     <div className={`w-1/2 h-full ${percentage < 20 ? 'text-orange-400' : (percentage < 40 ? 'text-blue-400' : 'text-cyan-300')}`}><WavePath /></div>
                     <div className={`w-1/2 h-full ${percentage < 20 ? 'text-orange-400' : (percentage < 40 ? 'text-blue-400' : 'text-cyan-300')}`}><WavePath /></div>
                  </motion.div>
               </div>

               <div className={`absolute inset-0 bg-gradient-to-t ${gradientClass}`} />
               <div className="absolute -top-8 left-0 right-0 h-16 bg-white/30 blur-xl rounded-[100%]" />

               <BubbleParticles />
            </motion.div>

            {/* Layer 2b: Masked Content (Light Theme, visible inside liquid) */}
            <motion.div
               className="absolute inset-0 z-20 pointer-events-none"
               initial={{ clipPath: `inset(${100 - percentage}% 0 0 0)` }}
               animate={{ clipPath: `inset(${100 - displayPercentage}% 0 0 0)` }}
               transition={{
                  type: "spring",
                  stiffness: isRefilling ? 15 : 50,
                  damping: isRefilling ? 10 : 20
               }}
            >
               <div className="h-full w-full p-8 flex flex-col justify-between">
                  <div className="pointer-events-auto w-full">
                     <WaterHeaderInfo
                        percentage={isRefilling ? 100 : percentage}
                        currentLevel={isRefilling ? data.max_capacity : currentLevel}
                        maxCapacity={data.max_capacity}
                        enduranceText={getEnduranceText()}
                        theme="light"
                        onConfigClick={(e) => { e.stopPropagation(); setIsConfiguring(true); }}
                     />
                  </div>
               </div>
            </motion.div>

            {/* Layer 3: Buttons */}
            <div className="absolute inset-0 z-30 p-8 flex flex-col justify-end pointer-events-none">
               <div className="flex items-center gap-3 pointer-events-auto">
                  <button
                     onClick={handleRefill}
                     disabled={isRefilling}
                     className="flex-1 bg-white text-wood-900 h-14 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-80 disabled:scale-100"
                  >
                     {isRefilling ? (
                        <RefreshCw size={20} className="text-blue-500 animate-spin" />
                     ) : (
                        <RefreshCw size={20} className="text-blue-500" />
                     )}
                     {isRefilling ? '注水中...' : '换新水'}
                  </button>
                  <button
                     onClick={() => setIsCalibrating(true)}
                     className="h-14 w-14 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center text-wood-800 active:scale-95 transition-transform shadow-sm"
                  >
                     <SlidersHorizontal size={20} />
                  </button>
               </div>
            </div>
         </div>

         {/* Calibration Panel */}
         <AnimatePresence>
            {isCalibrating && (
               <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white border border-wood-100 p-6 rounded-3xl overflow-hidden shadow-soft shrink-0"
               >
                  <div className="flex justify-between items-center mb-4">
                     <Subheading>手动校准水位</Subheading>
                     <button onClick={() => setIsCalibrating(false)}><X size={18} className="text-wood-400" /></button>
                  </div>
                  <div className="mb-6 px-2">
                     <input
                        type="range"
                        min="0"
                        max={data.max_capacity}
                        step="0.1"
                        value={calibrationValue}
                        onChange={(e) => setCalibrationValue(parseFloat(e.target.value))}
                        className="w-full h-2 bg-wood-100 rounded-lg appearance-none cursor-pointer accent-wood-800"
                     />
                     <div className="text-center mt-2 font-mono text-2xl text-wood-800 font-bold">{calibrationValue.toFixed(1)} L</div>
                     <p className="text-center text-xs text-wood-400 mt-1">拖动滑块至真实剩余量</p>
                  </div>
                  <button onClick={saveCalibration} className="w-full py-3 bg-wood-800 text-wood-50 rounded-xl font-medium">确认校准</button>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Configuration Modal */}
         <AnimatePresence>
            {isConfiguring && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-wood-900/40 backdrop-blur-sm"
               >
                  <motion.div
                     initial={{ scale: 0.9, y: 20 }}
                     animate={{ scale: 1, y: 0 }}
                     className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-xl"
                  >
                     <div className="flex justify-between items-center mb-6">
                        <Subheading>容器设置</Subheading>
                        <button onClick={() => setIsConfiguring(false)}><X size={20} className="text-wood-400" /></button>
                     </div>

                     <div className="mb-6">
                        <label className="text-xs font-bold text-wood-400 uppercase tracking-wider mb-2 block">最大容量 (升)</label>
                        <div className="flex items-center gap-3">
                           <input
                              type="number"
                              value={newMaxCapacity}
                              onChange={(e) => setNewMaxCapacity(parseFloat(e.target.value))}
                              className="flex-1 bg-wood-50 border border-wood-200 rounded-xl p-4 text-xl font-serif font-bold text-wood-900 focus:outline-none focus:border-wood-400"
                           />
                           <span className="text-wood-400 font-medium">L</span>
                        </div>
                        <p className="text-xs text-wood-400 mt-2 leading-relaxed">
                           修改容量将立即重置当前水位为满水状态。请在更换新规格水桶时设置。
                        </p>
                     </div>

                     <div className="flex gap-3">
                        <button onClick={() => setIsConfiguring(false)} className="flex-1 py-3 text-wood-600 font-medium">取消</button>
                        <button onClick={saveConfiguration} className="flex-1 py-3 bg-wood-800 text-wood-50 rounded-xl font-medium">保存并重置</button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Debug Modal */}
         <AnimatePresence>
            {isDebugOpen && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-wood-900/40 backdrop-blur-sm"
               >
                  <motion.div
                     className="bg-white w-full max-w-sm p-6 rounded-3xl shadow-xl h-[80vh] overflow-y-auto"
                  >
                     <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2 border-b border-wood-100">
                        <Subheading>QA 后门调试</Subheading>
                        <button onClick={() => setIsDebugOpen(false)}><X size={20} className="text-wood-400" /></button>
                     </div>

                     <div className="space-y-6">

                        {/* Time Display */}
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                           <div className="flex items-center gap-2 text-indigo-800 font-bold">
                              <Clock size={16} />
                              系统时间
                           </div>
                           <div className="text-right">
                              <div className="font-mono text-sm font-bold text-indigo-900">{new Date(systemTime).toLocaleTimeString()}</div>
                              <div className="font-mono text-[10px] text-indigo-500">{new Date(systemTime).toLocaleDateString()}</div>
                           </div>
                        </div>

                        {/* Inspector */}
                        <div className="bg-wood-50 p-4 rounded-xl space-y-2 border border-wood-100">
                           <div className="text-xs font-bold text-wood-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <Activity size={12} /> 实时数据 (Inspector)
                           </div>
                           <div className="grid grid-cols-2 gap-4 text-xs font-mono text-wood-800">
                              <div>
                                 <span className="text-wood-400 block">有效活跃时长</span>
                                 <span className="text-lg font-bold">{activeHours.toFixed(2)} <span className="text-xs font-normal">h</span></span>
                              </div>
                              <div>
                                 <span className="text-wood-400 block">当前周期流速</span>
                                 <span className="text-lg font-bold">{data.current_cycle_rate.toFixed(3)} <span className="text-xs font-normal">L/h</span></span>
                              </div>
                              <div>
                                 <span className="text-wood-400 block">长期习惯流速</span>
                                 <span className="text-lg font-bold">{data.learned_hourly_rate.toFixed(3)} <span className="text-xs font-normal">L/h</span></span>
                              </div>
                           </div>
                        </div>

                        {/* Time Travel */}
                        <div>
                           <div className="text-xs font-bold text-wood-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <FastForward size={12} /> 时光机 (Time Travel)
                           </div>
                           <div className="grid grid-cols-3 gap-2">
                              <button onClick={() => actions.debugTimeTravel(1)} className="py-2.5 bg-orange-50 text-orange-700 rounded-xl font-bold text-xs border border-orange-100 active:scale-95 transition-transform">+1 小时</button>
                              <button onClick={() => actions.debugTimeTravel(10)} className="py-2.5 bg-orange-50 text-orange-700 rounded-xl font-bold text-xs border border-orange-100 active:scale-95 transition-transform">+10 小时</button>
                              <button onClick={() => actions.debugTimeTravel(24)} className="py-2.5 bg-orange-100 text-orange-800 rounded-xl font-bold text-xs border border-orange-200 active:scale-95 transition-transform">+1 天</button>
                           </div>
                           <button
                              onClick={() => actions.resetDebugTime()}
                              className="mt-2 w-full py-2.5 bg-green-50 text-green-700 rounded-xl font-bold text-xs border border-green-200 active:scale-95 transition-transform"
                           >
                              ↩ 重置为真实时间
                           </button>
                           <p className="text-[10px] text-wood-400 mt-1">* 模拟时间流逝，系统时间将向前移动，水位随之下降。</p>
                        </div>

                        {/* God Mode Config */}
                        <div className="bg-wood-50 p-4 rounded-xl border border-wood-100">
                           <div className="text-xs font-bold text-wood-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                              <Zap size={12} /> 上帝模式 (God Mode)
                           </div>

                           <div className="space-y-4">
                              <div>
                                 <label className="text-xs text-wood-500 block mb-1">强制修改流速 (L/h)</label>
                                 <div className="flex gap-2">
                                    <input
                                       type="number"
                                       step="0.01"
                                       value={debugRate}
                                       onChange={(e) => setDebugRate(e.target.value)}
                                       className="flex-1 bg-white border border-wood-200 rounded-lg px-3 py-2 text-sm font-mono"
                                    />
                                    <button onClick={handleDebugRateSave} className="bg-wood-800 text-white px-3 rounded-lg text-xs font-bold">SET</button>
                                 </div>
                              </div>

                              <div>
                                 <label className="text-xs text-wood-500 block mb-1">强制修改生物钟 (Sleep Window)</label>
                                 <SleepCycleSlider
                                    start={data.sleep_window.start}
                                    end={data.sleep_window.end}
                                    onChange={actions.updateSleepWindow}
                                 />
                              </div>
                           </div>
                        </div>

                        {/* Legacy Scenarios */}
                        <div>
                           <div className="text-xs font-bold text-wood-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <Activity size={12} /> 场景预设
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => { actions.debugWater('LOW'); setIsDebugOpen(false); }} className="py-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-xs border border-red-100">模拟缺水</button>
                              <button onClick={() => { actions.debugWater('FULL'); setIsDebugOpen(false); }} className="py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs border border-blue-100">模拟满水</button>
                              <button onClick={() => { actions.debugWater('TREND_PEAK'); setIsDebugOpen(false); }} className="py-2.5 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs border border-purple-100">生成波动图表</button>
                              <button onClick={() => { actions.debugWater('TREND_EMPTY'); setIsDebugOpen(false); }} className="py-2.5 bg-gray-50 text-gray-700 rounded-xl font-bold text-xs border border-gray-200">清空历史</button>
                           </div>
                        </div>

                        <div className="pt-2 border-t border-wood-100">
                           <button onClick={actions.resetKernel} className="w-full py-3 bg-wood-800 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform">重置所有数据 (Factory Reset)</button>
                        </div>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Stats Card */}
         <div className="bg-white border border-wood-100 p-6 rounded-3xl relative shrink-0">
            <div className="flex items-center gap-2 mb-2">
               <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg"><Waves size={16} /></div>
               <span className="font-medium text-wood-800">饮水趋势</span>

               {/* 容器设置按钮 */}
               <button
                  onClick={() => setIsConfiguring(true)}
                  className="mr-auto flex items-center gap-1 px-2.5 py-1.5 text-wood-400 hover:text-wood-700 hover:bg-wood-50 rounded-lg text-xs font-medium transition-colors"
               >
                  <Edit3 size={13} />
                  容器设置
               </button>
               {/* Debug Button */}
               <button onClick={() => setIsDebugOpen(true)} className="ml-auto p-2 text-wood-300 hover:text-wood-500 opacity-50 hover:opacity-100">
                  <Bug size={14} />
               </button>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
               <span className="text-2xl font-bold text-wood-900">
                  {Math.round(hourlyRateMl)} <span className="text-sm font-normal text-wood-400">ml/h</span>
               </span>
               <span className="text-xs font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                  ≈ {cupsPerHour} 杯/小时
               </span>
            </div>
            <p className="text-xs text-wood-400 mb-2">当前周期流速 (含睡眠消耗修正)</p>
            <TrendChart logs={trendLogs} referenceValue={dailyReferenceValue} />
         </div>
      </div>
   );
};
