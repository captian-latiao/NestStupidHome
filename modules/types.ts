import React from 'react';

// Interface for a pluggable Business Module
export interface NestModule {
  id: string;
  title: string;
  icon: React.ReactNode;
  Widget: React.FC<{ data: any; systemTime: number }>;
  DetailView: React.FC<{ data: any; actions: any; systemTime: number }>;
}
