import React from 'react';
import { Snowflake, Thermometer, Clock } from 'lucide-react';

// --- Fridge Module ---

export const FridgeWidget: React.FC<{ data: any }> = ({ data }) => (
  <div className="flex flex-col h-full justify-center">
    <div className="flex justify-between items-center mb-3">
       <div className="text-center">
          <div className={`text-lg font-bold ${data?.fridgeTemp > 8 ? 'text-red-500' : 'text-wood-700'}`}>{data?.fridgeTemp}°C</div>
          <div className="text-[10px] text-wood-400">冷藏</div>
       </div>
       <div className="w-px h-6 bg-wood-200" />
       <div className="text-center">
          <div className="text-lg font-bold text-blue-500">{data?.freezerTemp}°C</div>
          <div className="text-[10px] text-wood-400">冷冻</div>
       </div>
    </div>
    {data?.expiringCount > 0 && (
      <div className="bg-red-50 text-red-400 text-[10px] px-2 py-1 rounded-full self-start flex items-center gap-1">
         <Clock size={10} /> {data.expiringCount} 临期
      </div>
    )}
  </div>
);

export const FridgeDetailView: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-4">
     <div className="grid grid-cols-2 gap-4">
        <div className={`border p-5 rounded-3xl flex flex-col items-center justify-center ${data?.fridgeTemp > 8 ? 'bg-red-50/50 border-red-100' : 'bg-cyan-50/50 border-cyan-100'}`}>
           <Thermometer size={24} className={data?.fridgeTemp > 8 ? 'text-red-500 mb-2' : 'text-cyan-500 mb-2'} />
           <div className={`text-3xl font-serif font-bold ${data?.fridgeTemp > 8 ? 'text-red-800' : 'text-wood-800'}`}>{data?.fridgeTemp}°C</div>
           <div className="text-cyan-600 text-xs mt-1">冷藏室</div>
        </div>
        <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-3xl flex flex-col items-center justify-center">
           <Snowflake size={24} className="text-blue-500 mb-2" />
           <div className="text-3xl font-serif font-bold text-blue-900">{data?.freezerTemp}°C</div>
           <div className="text-blue-500 text-xs mt-1">冷冻室</div>
        </div>
     </div>
  </div>
);