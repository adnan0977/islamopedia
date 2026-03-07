
"use client";

import { cn, toArabicNumerals } from '@/lib/utils';

export const AYAT_FRAMES = [
  { id: 'royal-ornate', name: 'Royal Ornate', path: 'M50 2 L54 12 C58 10 62 10 66 14 L72 6 L78 16 C82 16 86 18 88 22 L98 20 L94 30 C96 34 98 38 98 42 L100 50 L98 58 C98 62 96 66 94 70 L98 80 L88 78 C86 82 82 84 78 84 L72 94 L66 86 C62 90 58 90 54 88 L50 98 L46 88 C42 90 38 90 34 86 L28 94 L22 84 C18 84 14 82 12 78 L2 80 L6 70 C4 66 2 62 2 58 L0 50 L2 42 C2 38 4 34 6 30 L2 20 L12 22 C14 18 18 16 22 16 L28 6 L34 14 C38 10 42 10 46 12 Z' },
  { id: 'ornate-star', name: 'Traditional Star', path: 'M50 0 L58 15 L75 8 L70 25 L85 25 L75 40 L90 50 L75 60 L85 75 L70 75 L75 92 L58 85 L50 100 L42 85 L25 92 L30 75 L15 75 L25 60 L10 50 L25 40 L15 25 L30 25 L25 8 L42 15 Z' },
  { id: 'moroccan', name: 'Moroccan Star', path: 'M50 5 L60 25 L80 25 L70 45 L80 65 L60 65 L50 85 L40 65 L20 65 L30 45 L20 25 L40 25 Z' },
  { id: 'geometric-gate', name: 'Geometric Gate', path: 'M25 5 H75 V25 L95 50 L75 75 V95 H25 V75 L5 50 L25 25 Z' },
  { id: 'diamond', name: 'Elegant Diamond', path: 'M50 5 L95 50 L50 95 L5 50 Z' },
  { id: 'circle', name: 'Simple Circle', path: 'M50 10 A40 40 0 1 1 50 90 A40 40 0 1 1 50 10' },
];

interface AyatFrameProps {
  number: number | string;
  frameId?: string;
  customPath?: string;
  customImageUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AyatFrame({ number, frameId = 'ornate-star', customPath, customImageUrl, size = "md", className }: AyatFrameProps) {
  const staticFrame = AYAT_FRAMES.find(f => f.id === frameId);
  
  const isImage = !!customImageUrl;
  const pathData = staticFrame ? staticFrame.path : (customPath || (AYAT_FRAMES.find(f => f.id === 'ornate-star')?.path || AYAT_FRAMES[0].path));
  
  const dimensions = {
    sm: "w-[24px] h-[24px]",
    md: "w-[32px] h-[32px]",
    lg: "w-[40px] h-[40px]"
  };
  
  const fontSizes = {
    sm: "text-[8px]",
    md: "text-[10px]",
    lg: "text-[12px]"
  };

  return (
    <span className={cn("relative inline-flex items-center justify-center shrink-0 align-middle", dimensions[size], className)}>
      {isImage ? (
        <img 
          src={customImageUrl} 
          alt="" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
        />
      ) : (
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full text-zinc-900 fill-zinc-900/50 stroke-zinc-700 transition-all duration-500"
          strokeWidth="3"
        >
          <path d={pathData} fillRule="evenodd" />
        </svg>
      )}
      <span className={cn("relative z-10 font-bold font-arabic text-zinc-300 transition-colors leading-none pt-0.5", fontSizes[size])}>
        {toArabicNumerals(number)}
      </span>
    </span>
  );
}
