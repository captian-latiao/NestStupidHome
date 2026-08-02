import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-[100dvh] w-full bg-wood-50 text-wood-900 font-sans selection:bg-wood-200 flex items-center justify-center overflow-x-hidden sm:py-8 ${className}`}>
      {/* Ambient Lighting Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-gradient-to-br from-white via-transparent to-wood-200 mix-blend-multiply" />

      {/* Desktop Branding Title (top-left, outside mockup) */}
      <div className="hidden sm:block fixed top-12 left-12 z-20 pointer-events-none select-none">
        <h1 className="flex items-center gap-4">
          <span className="text-wood-800 font-serif font-bold text-4xl tracking-tight drop-shadow-sm">Nest</span>
          <span className="w-8 h-[1px] bg-wood-400/60 mt-1"></span>
          <span className="text-wood-600 font-serif font-medium text-2xl tracking-widest mt-1">笨蛋家居</span>
        </h1>
        <p className="text-wood-400/80 font-serif text-xs tracking-[0.3em] mt-3 ml-1 uppercase">Stupid Home Management</p>
      </div>
      
      {/* Mockup Outer Frame */}
      <div className="relative z-10 w-full max-w-[414px] min-h-[100dvh] bg-sun-light sm:min-h-0 sm:h-[85vh] sm:max-h-[896px] sm:bg-[#1a1818] sm:rounded-[48px] sm:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] sm:transform-gpu flex flex-col sm:border-[8px] sm:border-[#1a1818]">
        
        {/* Notch / Dynamic Island */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-[140px] h-[32px] bg-[#1a1818] rounded-b-[20px] z-[100] pointer-events-none"></div>

        {/* Screen Inner Frame (Scrollable on Desktop) */}
        <div className="relative w-full flex-1 bg-sun-light sm:rounded-[40px] sm:overflow-hidden flex flex-col">
          <div className="w-full flex-1 sm:overflow-y-auto no-scrollbar flex flex-col px-6 py-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};