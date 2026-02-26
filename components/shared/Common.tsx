import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, User } from 'lucide-react';
import { WaterLog } from '../../types';

// --- Trend Chart (Curved Area Chart) ---

type ChartPoint = [number, number, number, string];

interface TrendChartProps {
  logs: WaterLog[];
  referenceValue?: number; // Optional horizontal reference line
}

export const TrendChart: React.FC<TrendChartProps> = ({ logs, referenceValue }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  // Ref needed to calculate client rects if we wanted fancy stuff, 
  // but here we mainly use it for structure.
  const containerRef = useRef<HTMLDivElement>(null);

  if (!logs || logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-[120px] w-full mt-4 border-2 border-dashed border-wood-100 rounded-xl">
        <span className="text-xs text-wood-300">暂无饮水数据</span>
      </div>
    );
  }

  // Configuration
  const height = 150; 
  const width = 300; // Virtual width for calculation
  const paddingX = 20; 
  const paddingTop = 20;
  const paddingBottom = 20; 
  
  const chartHeight = height - paddingTop - paddingBottom;

  // Data Processing
  // Ensure we cover the reference value in the scale
  const maxValueInData = Math.max(...logs.map(l => l.daily_consumption_liters), 2.5);
  const maxVal = Math.max(maxValueInData, referenceValue || 0) * 1.2;
  
  const points = useMemo<ChartPoint[]>(() => {
    return logs.map((log, i) => {
      // Distribute points evenly within the chart area width
      const x = paddingX + (i / (logs.length - 1)) * (width - 2 * paddingX);
      // Invert Y axis (0 at bottom of chart area)
      const y = (height - paddingBottom) - (log.daily_consumption_liters / maxVal) * chartHeight;
      return [x, y, log.daily_consumption_liters, log.date]; 
    });
  }, [logs, maxVal, chartHeight]);

  // Reference Line Calculation
  const refY = referenceValue 
     ? (height - paddingBottom) - (referenceValue / maxVal) * chartHeight
     : null;

  // Path Generation
  const pathData = useMemo(() => {
    if (points.length < 2) return "";
    
    let d = `M ${points[0][0]},${points[0][1]}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const cpX1 = p1[0] + (p2[0] - p1[0]) / 2;
      const cpY1 = p1[1];
      const cpX2 = p1[0] + (p2[0] - p1[0]) / 2;
      const cpY2 = p2[1];
      
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }, [points]);

  const areaPath = `${pathData} L ${points[points.length - 1][0]} ${height - paddingBottom} L ${points[0][0]} ${height - paddingBottom} Z`;

  // Hit Area Calculation
  const hitAreas = useMemo(() => {
      return points.map((p, i) => {
          let startX = 0;
          let endX = width;
          
          if (i === 0) {
              startX = 0;
              endX = (points[0][0] + points[1][0]) / 2;
          } else if (i === points.length - 1) {
              startX = (points[i-1][0] + points[i][0]) / 2;
              endX = width;
          } else {
              startX = (points[i-1][0] + points[i][0]) / 2;
              endX = (points[i][0] + points[i+1][0]) / 2;
          }
          
          return { x: startX, width: endX - startX, index: i };
      });
  }, [points]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[180px] select-none touch-none mt-2 group"
      onMouseLeave={() => setHoverIndex(null)}
    >
      {/* SVG Layer */}
      <div className="absolute inset-0 bottom-[20px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Reference Line */}
          {refY !== null && (
             <line 
                x1={paddingX} 
                y1={refY} 
                x2={width - paddingX} 
                y2={refY} 
                stroke="#9CA3AF" 
                strokeWidth="1" 
                strokeDasharray="4 4" 
                opacity="0.5"
                vectorEffect="non-scaling-stroke"
             />
          )}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#trendGradient)" />
          
          {/* Stroke Line */}
          <path 
            d={pathData} 
            fill="none" 
            stroke="#3B82F6" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            vectorEffect="non-scaling-stroke" 
          />
          
          {/* Vertical Hover Line (SVG part) */}
          {hoverIndex !== null && points[hoverIndex] && (
            <line 
                x1={points[hoverIndex][0]} 
                y1={points[hoverIndex][1]} 
                x2={points[hoverIndex][0]} 
                y2={height - paddingBottom} 
                stroke="#3B82F6" 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
                opacity="0.6" 
                vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Invisible Hit Areas (Overlay inside SVG to map correctly) */}
          {hitAreas.map((area) => (
              <rect 
                  key={area.index}
                  x={area.x}
                  y={0}
                  width={area.width}
                  height={height}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(area.index)}
                  onTouchStart={() => setHoverIndex(area.index)}
              />
          ))}
        </svg>
      </div>
      
      {/* HTML Layer: Labels, Indicators, Reference Text (Prevents distortion) */}
      <div className="absolute inset-0 bottom-[20px] pointer-events-none">
          {/* Reference Label */}
          {refY !== null && (
             <div 
               className="absolute right-0 text-[9px] text-gray-400 bg-white/50 px-1 rounded transform translate-x-1 -translate-y-1/2"
               style={{ top: `${(refY / height) * 100}%` }}
             >
                标准
             </div>
          )}

          {/* Hover Circle Indicator (HTML to stay circular) */}
          {hoverIndex !== null && points[hoverIndex] && (
             <div 
                className="absolute w-3 h-3 bg-white border-[3px] border-blue-600 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
                style={{ 
                   left: `${(points[hoverIndex][0] / width) * 100}%`,
                   top: `${(points[hoverIndex][1] / height) * 100}%`
                }}
             />
          )}
          
          {/* Hover Value Text (Directly on chart) */}
          {hoverIndex !== null && points[hoverIndex] && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute transform -translate-x-1/2 -translate-y-full"
              style={{ 
                 left: `${(points[hoverIndex][0] / width) * 100}%`,
                 top: `${(points[hoverIndex][1] / height) * 100}%`,
                 marginTop: '-8px'
              }}
            >
               <div className="bg-wood-800 text-wood-50 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                  {points[hoverIndex][2].toFixed(1)} L
               </div>
            </motion.div>
          )}
      </div>

      {/* X-Axis HTML Labels */}
      <div className="absolute bottom-0 left-0 right-0 h-[20px] pointer-events-none">
         {points.map((p, i) => (
            <div 
              key={i}
              className={`absolute top-0 transform -translate-x-1/2 text-[10px] font-sans transition-all duration-200 ${hoverIndex === i ? 'font-bold text-blue-600 scale-110' : 'text-wood-400'}`}
              style={{ left: `${(p[0] / width) * 100}%` }}
            >
              {p[3].split('-')[2]}
            </div>
         ))}
      </div>
    </div>
  );
};

// --- Wave SVG for Liquid Effect (Seamless Loop) ---

export const WavePath = () => (
  <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full block fill-current">
    <path d="M0 10 C 20 5 30 5 50 10 C 70 15 80 15 100 10 V 20 H 0 Z" />
  </svg>
);

// --- Sleep Cycle Slider ---
export const SleepCycleSlider: React.FC<{ start: number; end: number; onChange: (s: number, e: number) => void }> = ({ start, end, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const hour = Math.round((x / rect.width) * 24) % 24;

    if (isDragging === 'start') {
      if (hour !== start) onChange(hour, end);
    } else {
      if (hour !== end) onChange(start, hour);
    }
  }, [isDragging, onChange, start, end]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onEnd = () => setIsDragging(null);

    if (isDragging) {
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchend', onEnd);
      window.addEventListener('mouseup', onEnd);
    }
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('mouseup', onEnd);
    };
  }, [isDragging, handleMove]);

  const step = 100 / 24;
  const startPos = (start / 24) * 100;
  const endPos = (end / 24) * 100;

  const renderSleepBlock = () => {
    if (start < end) {
      return (
        <div 
          className="absolute top-0 bottom-0 bg-indigo-500/20 rounded-md"
          style={{ left: `${startPos}%`, width: `${endPos - startPos}%` }} 
        />
      );
    } else {
      return (
        <>
          <div className="absolute top-0 bottom-0 bg-indigo-500/20 rounded-l-md" style={{ left: `${startPos}%`, right: 0 }} />
          <div className="absolute top-0 bottom-0 bg-indigo-500/20 rounded-r-md" style={{ left: 0, width: `${endPos}%` }} />
        </>
      );
    }
  };

  return (
    <div className="pt-8 pb-4 px-2 select-none touch-none">
       <div className="relative h-12" ref={containerRef}>
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-3 bg-wood-100 rounded-full overflow-hidden">
             {Array.from({length: 25}).map((_, i) => (
               <div key={i} className={`absolute top-0 bottom-0 w-px ${i % 6 === 0 ? 'bg-wood-300' : 'bg-transparent'}`} style={{ left: `${(i/24)*100}%` }} />
             ))}
             {renderSleepBlock()}
          </div>
          
          <div className="absolute top-8 left-0 text-[10px] text-wood-400 transform -translate-x-1/2">00:00</div>
          <div className="absolute top-8 left-1/2 text-[10px] text-wood-400 transform -translate-x-1/2">12:00</div>
          <div className="absolute top-8 right-0 text-[10px] text-wood-400 transform translate-x-1/2">24:00</div>

          {/* Start Handle */}
          <div 
             className="absolute top-1/2 -translate-y-1/2 -ml-4 w-8 h-8 z-10 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
             style={{ left: `${startPos}%` }}
             onMouseDown={() => setIsDragging('start')}
             onTouchStart={() => setIsDragging('start')}
          >
             <div className="w-full h-full bg-indigo-500 rounded-full shadow-md border-2 border-white flex items-center justify-center text-white">
                <Moon size={14} fill="currentColor" />
             </div>
             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap opacity-100">
               {start.toString().padStart(2, '0')}:00
             </div>
          </div>

          {/* End Handle */}
          <div 
             className="absolute top-1/2 -translate-y-1/2 -ml-4 w-8 h-8 z-10 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
             style={{ left: `${endPos}%` }}
             onMouseDown={() => setIsDragging('end')}
             onTouchStart={() => setIsDragging('end')}
          >
             <div className="w-full h-full bg-orange-400 rounded-full shadow-md border-2 border-white flex items-center justify-center text-white">
                <Sun size={14} fill="currentColor" />
             </div>
             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap opacity-100">
               {end.toString().padStart(2, '0')}:00
             </div>
          </div>
       </div>
       
       <div className="text-center mt-2 text-xs text-wood-400">
          时长: <span className="font-bold text-indigo-600">{start < end ? end - start : (24 - start) + end}</span> 小时
       </div>
    </div>
  );
};

// --- Avatar ---
export const Avatar: React.FC<{ url?: string; size?: string; className?: string }> = ({ url, size = "h-12 w-12", className = "" }) => {
  const isImage = url?.startsWith('data:') || url?.startsWith('http');
  const fallbackClass = url?.startsWith('bg-') ? url : 'bg-wood-200';
  
  return (
    <div className={`${size} rounded-full flex items-center justify-center border-2 border-wood-50 shadow-inner overflow-hidden relative ${!isImage ? fallbackClass : 'bg-wood-100'} ${className}`}>
      {isImage ? (
        <img src={url} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <User size={size.includes('20') ? 36 : 20} className="text-wood-600/50" />
      )}
    </div>
  );
};

// --- Bubble Particles ---
export const BubbleParticles = () => (
  <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: '100%' }}
        animate={{ 
          opacity: [0, 0.6, 0], 
          y: '-10%',
          x: Math.random() * 40 - 20 
        }}
        transition={{ 
          duration: 3 + Math.random() * 3, 
          repeat: Infinity,
          delay: Math.random() * 2,
          ease: "easeOut" 
        }}
        className="absolute bottom-0 bg-white/20 rounded-full"
        style={{
          left: `${5 + Math.random() * 90}%`,
          width: 4 + Math.random() * 6,
          height: 4 + Math.random() * 6,
        }}
      />
    ))}
  </div>
);