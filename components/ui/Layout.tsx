import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen w-full bg-sun-light text-wood-900 font-sans selection:bg-wood-200 ${className}`}>
      {/* Ambient Lighting Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40 bg-gradient-to-br from-white via-transparent to-wood-100 mix-blend-multiply" />
      
      {/* Content Container */}
      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col px-6 py-8 md:max-w-2xl lg:max-w-4xl">
        {children}
      </div>
    </div>
  );
};