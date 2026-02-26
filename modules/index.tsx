
import React from 'react';
import { Droplets, Cat, Snowflake, Box, Sparkles } from 'lucide-react';
import { NestModule } from './types';
import { WaterWidget, WaterDetailView } from './WaterViews';
import { PetWidget, PetDetailView } from './PetViews';
import { FridgeWidget, FridgeDetailView } from './FridgeViews';
import { InventoryWidget, InventoryDetailView } from './InventoryViews';
import { HygieneWidget, HygieneDetailView } from './HygieneViews';

export const MODULE_REGISTRY: Record<string, NestModule> = {
  water: { 
    id: 'water', 
    title: "饮水", 
    icon: <Droplets size={20} />, 
    Widget: WaterWidget, 
    DetailView: WaterDetailView 
  },
  hygiene: { 
    id: 'hygiene', 
    title: "清洁", // Renamed from 护理
    icon: <Sparkles size={20} />, 
    Widget: HygieneWidget, 
    DetailView: HygieneDetailView 
  },
  pet: {
    id: 'pet',
    title: "宠物",
    icon: <Cat size={20} />,
    Widget: PetWidget,
    DetailView: PetDetailView
  },
  fridge: {
    id: 'fridge',
    title: "冰箱",
    icon: <Snowflake size={20} />,
    Widget: FridgeWidget,
    DetailView: FridgeDetailView
  },
  inventory: { 
    id: 'inventory', 
    title: "库存", 
    icon: <Box size={20} />, 
    Widget: InventoryWidget, 
    DetailView: InventoryDetailView 
  }
};

export const MODULE_LIST = Object.values(MODULE_REGISTRY);
