import React from 'react';

export const Heading: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h1 className={`font-serif font-semibold text-3xl tracking-tight text-wood-900 ${className}`}>
    {children}
  </h1>
);

export const Subheading: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h2 className={`font-sans font-medium text-lg text-wood-700 ${className}`}>
    {children}
  </h2>
);

export const Text: React.FC<{ children: React.ReactNode; className?: string; size?: 'sm' | 'base' | 'lg' }> = ({ 
  children, 
  className = '', 
  size = 'base' 
}) => {
  const sizes = {
    sm: 'text-sm text-wood-600',
    base: 'text-base text-wood-800',
    lg: 'text-lg text-wood-900',
  };

  return (
    <p className={`font-sans leading-relaxed ${sizes[size]} ${className}`}>
      {children}
    </p>
  );
};