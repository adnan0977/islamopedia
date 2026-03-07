
"use client";

import { cn, toArabicNumerals } from '@/lib/utils';

export const AYAT_FRAMES = [
  { id: 'star', name: 'Traditional Star', path: 'M50 5 L62 38 L95 50 L62 62 L50 95 L38 62 L5 50 L38 38 Z' },
  { id: 'diamond', name: 'Elegant Diamond', path: 'M50 5 L95 50 L50 95 L5 50 Z' },
  { id: 'circle', name: 'Simple Circle', path: 'M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10' },
  { id: 'hexagon', name: 'Classic Hexagon', path: 'M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z' },
  { id: 'square-ornate', name: 'Ornate Square', path: 'M20 20 L50 5 L80 20 L95 50 L80 80 L50 95 L20 80 L5 50 Z' },
];

interface AyatFrameProps {
  number: number | string;
  frameId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AyatFrame({ number, frameId = 'star', size = "md", className }: AyatFrameProps) {
  const frame = AYAT_FRAMES.find(f => f.id === frameId) || AYAT_FRAMES[0];
  
  const dimensions = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14"
  };
  
  const fontSizes = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-xs"
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 align-middle", dimensions[size], className)}>
      <svg 
        viewBox="0 0 100 100" 
        className="absolute inset-0 w-full h-full text-zinc-800 fill-zinc-900/30 stroke-zinc-700 transition-all duration-500"
        strokeWidth="3"
      >
        <path d={frame.path} />
      </svg>
      <span className={cn("relative z-10 font-black font-sans text-zinc-400 transition-colors", fontSizes[size])}>
        {toArabicNumerals(number)}
      </span>
    </div>
  );
}
