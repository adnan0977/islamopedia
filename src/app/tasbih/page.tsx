"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  Settings2, 
  Vibrate, 
  Volume2, 
  VolumeX, 
  History,
  CheckCircle2,
  Trophy,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const DHIKR_PRESETS = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ ٱللّٰهِ', english: 'SubhanAllah', target: 33 },
  { id: 'alhamdulillah', arabic: 'ٱلْحَمْدُ لِلّٰهِ', english: 'Alhamdulillah', target: 33 },
  { id: 'allahuakbar', arabic: 'ٱللّٰهُ أَكْبَرُ', english: 'Allahu Akbar', target: 34 },
  { id: 'custom', arabic: 'ذِكْر', english: 'General Dhikr', target: 100 },
];

export default function TasbihPage() {
  const router = useRouter();
  
  // State
  const [count, setCount] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [target, setTarget] = useState(33);
  const [selectedDhikr, setSelectedDhikr] = useState(DHIKR_PRESETS[0]);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('vlognest_tasbih_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCount(parsed.count || 0);
        setSessionTotal(parsed.sessionTotal || 0);
        setTarget(parsed.target || 33);
        const dhikr = DHIKR_PRESETS.find(d => d.id === parsed.dhikrId) || DHIKR_PRESETS[0];
        setSelectedDhikr(dhikr);
      } catch (e) {
        console.error("Failed to load tasbih state", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('vlognest_tasbih_state', JSON.stringify({
      count,
      sessionTotal,
      target,
      dhikrId: selectedDhikr.id
    }));
  }, [count, sessionTotal, target, selectedDhikr, isLoaded]);

  const triggerHaptic = useCallback(async (isReset = false, isTargetReached = false) => {
    if (!hapticEnabled) return;

    try {
      // Try Capacitor Haptics first (for native iOS/Android builds)
      if (isReset) {
        await Haptics.notification({ type: ImpactStyle.Heavy as any });
      } else if (isTargetReached) {
        await Haptics.notification({ type: ImpactStyle.Medium as any });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch {
      // Fallback to Web Vibration API (for mobile browsers)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (isReset) {
          navigator.vibrate([100, 50, 100]);
        } else if (isTargetReached) {
          navigator.vibrate(200);
        } else {
          navigator.vibrate(50);
        }
      }
    }
  }, [hapticEnabled]);

  const handleIncrement = useCallback(() => {
    const nextCount = count + 1;
    const isTargetReached = nextCount === target;
    
    // Call triggerHaptic immediately on user interaction
    triggerHaptic(false, isTargetReached);
    
    setCount(nextCount);
    setSessionTotal(prev => prev + 1);
  }, [count, target, triggerHaptic]);

  const handleReset = () => {
    triggerHaptic(true);
    setCount(0);
  };

  const changeDhikr = (id: string) => {
    const dhikr = DHIKR_PRESETS.find(d => d.id === id);
    if (dhikr) {
      setSelectedDhikr(dhikr);
      setTarget(dhikr.target);
      setCount(0);
    }
  };

  const progress = Math.min((count / target) * 100, 100);
  const isComplete = count >= target;

  if (!isLoaded) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg min-h-[90vh] flex flex-col space-y-8 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/more')} className="rounded-2xl h-12 w-12 border-zinc-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">Tasbih</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Digital Counter</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-xl h-10 w-10 transition-colors", hapticEnabled ? "text-zinc-900 bg-zinc-100" : "text-zinc-300")}
            onClick={() => setHapticEnabled(!hapticEnabled)}
          >
            <Zap className={cn("h-4 w-4", hapticEnabled && "fill-zinc-900")} />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-zinc-200" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Counter Area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        {/* Progress Display */}
        <div className="text-center space-y-2">
          <p className="text-4xl font-arabic text-zinc-900 mb-2 leading-relaxed">{selectedDhikr.arabic}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">{selectedDhikr.english}</p>
        </div>

        {/* Tactile Counter Button */}
        <button 
          onClick={handleIncrement}
          className="group relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center transition-all active:scale-95 touch-manipulation outline-none"
        >
          {/* Visual Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              className="fill-none stroke-zinc-50 stroke-[4]"
            />
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              className={cn(
                "fill-none stroke-[6] transition-all duration-500 ease-out",
                isComplete ? "stroke-emerald-500" : "stroke-zinc-900"
              )}
              strokeDasharray="100 100"
              style={{ strokeDashoffset: 100 - progress }}
              pathLength="100"
            />
          </svg>

          {/* Central Counter */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <span className={cn(
              "text-8xl sm:text-9xl font-black tracking-tighter transition-colors duration-500",
              isComplete ? "text-emerald-600" : "text-zinc-900"
            )}>
              {count}
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Target: {target}</span>
              {isComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50" />}
            </div>
          </div>

          {/* Pulse Effect on Complete */}
          {isComplete && (
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
          )}
        </button>

        {/* Quick Target Switcher */}
        <div className="w-full flex justify-center gap-3">
          {DHIKR_PRESETS.map((d) => (
            <button
              key={d.id}
              onClick={() => changeDhikr(d.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                selectedDhikr.id === d.id 
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-lg" 
                  : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-300"
              )}
            >
              {d.english.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Footer */}
      <footer className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-50 border-none rounded-3xl shadow-inner">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-zinc-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Session Total</p>
              <p className="text-xl font-black text-zinc-900">{sessionTotal}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-50 border-none rounded-3xl shadow-inner">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-zinc-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Completions</p>
              <p className="text-xl font-black text-zinc-900">{Math.floor(sessionTotal / 33)}</p>
            </div>
          </CardContent>
        </Card>
      </footer>
    </div>
  );
}
