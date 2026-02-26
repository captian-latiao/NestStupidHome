
import React from 'react';
import { Card } from '../ui/Card';
import { PlusCircle, ChevronRight } from 'lucide-react';

interface WidgetSlotProps {
  title: string;
  icon?: React.ReactNode;
  isLoaded?: boolean;
  isPlaceholder?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}

export const WidgetSlot: React.FC<WidgetSlotProps> = ({ title, icon, isLoaded = false, isPlaceholder = false, children, onClick }) => {
  if (!isLoaded) {
    return (
      <div className="h-40 flex flex-col items-center justify-center border-dashed border-2 border-wood-200 rounded-[32px] bg-transparent text-wood-300">
        <div className="mb-2 opacity-50">
          {icon || <PlusCircle size={24} />}
        </div>
        <span className="font-medium text-xs">{title}</span>
      </div>
    );
  }

  if (isPlaceholder) {
    return (
      <div className="h-20 flex items-center bg-white border border-wood-100 rounded-[20px] shadow-sm px-6 gap-4 text-wood-600">
        <div className="text-wood-400 p-2 bg-wood-50 rounded-xl">
          {icon}
        </div>
        <span className="font-bold text-lg font-serif">{title}</span>
      </div>
    );
  }

  // Unified Card Container
  // We remove internal padding here to allow widgets (like Water) to be full-bleed.
  // Each widget is now responsible for its own internal padding/layout logic.
  return (
    <div
      className="relative w-full h-full min-h-[160px] rounded-[32px] bg-white border border-wood-100 shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.98] overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      {/* Shared Header Overlay (Optional, widgets can override/hide this by z-index) */}
      {/* We pass specific props down, but generally we let the children render the header to blend with their background */}
      {children}
    </div>
  );
};
