
"use client";

import { cn, toArabicNumerals } from '@/lib/utils';

export const AYAT_FRAMES = [
  { id: 'royal-ornate', name: 'Royal Ornate', path: 'M50 2 L54 12 C58 10 62 10 66 14 L72 6 L78 16 C82 16 86 18 88 22 L98 20 L94 30 C96 34 98 38 98 42 L100 50 L98 58 C98 62 96 66 94 70 L98 80 L88 78 C86 82 82 84 78 84 L72 94 L66 86 C62 90 58 90 54 88 L50 98 L46 88 C42 90 38 90 34 86 L28 94 L22 84 C18 84 14 82 12 78 L2 80 L6 70 C4 66 2 62 2 58 L0 50 L2 42 C2 38 4 34 6 30 L2 20 L12 22 C14 18 18 16 22 16 L28 6 L34 14 C38 10 42 10 46 12 Z' },
  { id: 'star', name: 'Traditional Star', path: 'M50 5 L62 38 L95 50 L62 62 L50 95 L38 62 L5 50 L38 38 Z' },
  { id: 'vintage-shield', name: 'Vintage Shield', path: 'M50 5 C75 5 95 25 95 50 C95 75 75 95 50 95 C25 95 5 75 5 50 C5 25 25 5 50 5 M50 15 C35 15 25 30 25 50 C25 70 35 85 50 85 C65 85 75 70 75 50 C75 30 65 15 50 15' },
  { id: 'moroccan', name: 'Moroccan Star', path: 'M50 5 L60 25 L80 25 L70 45 L80 65 L60 65 L50 85 L40 65 L20 65 L30 45 L20 25 L40 25 Z' },
  { id: 'geometric-gate', name: 'Geometric Gate', path: 'M25 5 H75 V25 L95 50 L75 75 V95 H25 V75 L5 50 L25 25 Z' },
  { id: 'diamond', name: 'Elegant Diamond', path: 'M50 5 L95 50 L50 95 L5 50 Z' },
  { id: 'circle', name: 'Simple Circle', path: 'M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10' },
  { id: 'hexagon', name: 'Classic Hexagon', path: 'M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z' },
];

interface AyatFrameProps {
  number: number | string;
  frameId?: string;
  customPath?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AyatFrame({ number, frameId = 'royal-ornate', customPath, size = "md", className }: AyatFrameProps) {
  // Logic: 
  // 1. If frameId is found in static AYAT_FRAMES, use its path.
  // 2. Else if customPath is provided, use it.
  // 3. Fallback to Royal Ornate.
  
  const staticFrame = AYAT_FRAMES.find(f => f.id === frameId);
  const pathData = staticFrame ? staticFrame.path : (customPath || AYAT_FRAMES[0].path);
  
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
        strokeWidth="2.5"
      >
        <path d={pathData} fillRule="evenodd" />
      </svg>
      <span className={cn("relative z-10 font-black font-sans text-zinc-400 transition-colors", fontSizes[size])}>
        {toArabicNumerals(number)}
      </span>
    </div>
  );
}
