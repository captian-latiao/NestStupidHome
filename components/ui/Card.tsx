import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, active = false }) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        rounded-3xl
        transition-all duration-300 ease-out
        ${active 
          ? 'bg-wood-800 text-wood-50 shadow-lg scale-[1.02]' 
          : 'bg-white text-wood-900 shadow-soft hover:shadow-md border border-wood-100/50'
        }
        ${onClick ? 'cursor-pointer active:scale-95' : ''}
        ${className}
      `}
    >
      {/* Subtle Grain Texture (CSS-only approximation) */}
      {!active && (
         <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] pointer-events-none mix-blend-multiply" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};