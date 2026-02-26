
import React, { useState } from 'react';
import { Bug, X, FastForward, Clock, Trash2, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DebugConsole: React.FC<{ systemTime: number; actions: any }> = ({ systemTime, actions }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Trigger Button - Positioned Top Right */}
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 z-40 p-2.5 bg-wood-900/5 backdrop-blur-sm rounded-full text-wood-400 hover:bg-wood-800 hover:text-wood-50 transition-colors active:scale-95"
      >
        <Bug size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-wood-900/20 backdrop-blur-sm p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-wood-100"
            >
              {/* Header */}
              <div className="bg-wood-50/50 p-5 border-b border-wood-100 flex justify-between items-center">
                 <div className="flex items-center gap-2.5 font-bold text-wood-800">
                   <div className="p-2 bg-wood-800 text-wood-50 rounded-lg">
                      <Bug size={16} />
                   </div>
                   <span>开发者控制台</span>
                 </div>
                 <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 bg-wood-100 text-wood-500 rounded-full hover:bg-wood-200 transition-colors"
                 >
                    <X size={18} />
                 </button>
              </div>

              <div className="p-6 space-y-6">
                 {/* System Time Monitor */}
                 <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 text-indigo-100 rotate-12">
                        <Clock size={80} />
                    </div>
                    <div className="flex items-center gap-3 text-indigo-900 font-bold relative z-10">
                        <Clock size={20} className="text-indigo-600" />
                        <div>
                            <div className="text-xs text-indigo-400 uppercase tracking-wider">System Time</div>
                            <span>系统时间</span>
                        </div>
                    </div>
                    <div className="text-right relative z-10">
                        <div className="font-mono text-xl font-bold text-indigo-900 tracking-tight">
                           {new Date(systemTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="font-mono text-xs text-indigo-500 font-medium">
                           {new Date(systemTime).toLocaleDateString()}
                        </div>
                    </div>
                 </div>

                 {/* Time Travel Controls */}
                 <div>
                    <label className="text-xs font-bold text-wood-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FastForward size={14} /> 时间加速 (Time Travel)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                       <button onClick={() => actions.debugTimeTravel(1)} className="py-3 bg-wood-50 text-wood-700 border border-wood-100 rounded-xl font-bold text-xs hover:bg-wood-100 hover:border-wood-200 transition-all active:scale-95">
                          +1 小时
                       </button>
                       <button onClick={() => actions.debugTimeTravel(24)} className="py-3 bg-wood-50 text-wood-700 border border-wood-100 rounded-xl font-bold text-xs hover:bg-wood-100 hover:border-wood-200 transition-all active:scale-95">
                          +1 天
                       </button>
                       <button onClick={() => actions.debugTimeTravel(24 * 7)} className="py-3 bg-wood-50 text-wood-700 border border-wood-100 rounded-xl font-bold text-xs hover:bg-wood-100 hover:border-wood-200 transition-all active:scale-95">
                          +1 周
                       </button>
                    </div>
                 </div>

                 {/* Danger Zone */}
                 <div className="pt-2">
                    <button 
                      onClick={() => { if(confirm('确定要重置所有数据吗？此操作无法撤销。')) actions.resetKernel(); }}
                      className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 hover:border-red-200 transition-all active:scale-95"
                    >
                       <Power size={18} /> 重置系统 (Factory Reset)
                    </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
