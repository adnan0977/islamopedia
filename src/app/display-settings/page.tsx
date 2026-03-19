"use client";

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sun, 
  Moon, 
  Monitor, 
  Type, 
  RotateCcw,
  Check,
  ShieldCheck,
  Layout,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function DisplaySettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [fontSize, setFontSize] = useState(100); // 100%
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('vlognest_display_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setTheme(config.theme || 'system');
        setFontSize(config.fontSize || 100);
      } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  // Apply Changes
  useEffect(() => {
    if (!isLoaded) return;

    const config = { theme, fontSize };
    localStorage.setItem('vlognest_display_config', JSON.stringify(config));

    const html = document.documentElement;
    
    // Theme Logic
    if (theme === 'dark') {
      html.classList.add('dark');
    } else if (theme === 'light') {
      html.classList.remove('dark');
    } else if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) html.classList.add('dark');
      else html.classList.remove('dark');
    }

    // Font Size Logic
    html.style.setProperty('--root-font-size', `${fontSize}%`);

  }, [theme, fontSize, isLoaded]);

  const handleReset = () => {
    setTheme('system');
    setFontSize(100);
    toast({ title: "Visuals Reset", description: "Default settings have been restored." });
  };

  if (!isLoaded) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-10 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/more')} className="rounded-2xl h-12 w-12 border-zinc-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">Accessibility & Display</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Interface Calibration</p>
          </div>
        </div>
        
        <Button variant="ghost" onClick={handleReset} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 gap-2">
          <RotateCcw className="w-3.5 h-3.5" />
          Restore Defaults
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="md:col-span-7 space-y-8">
          {/* Theme Selector */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 dark:bg-zinc-100 rounded-xl">
                <Layout className="w-4 h-4 text-white dark:text-black" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Visual Theme</h2>
            </div>

            <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8">
                <RadioGroup 
                  value={theme} 
                  onValueChange={(val: any) => setTheme(val)}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor }
                  ].map((t) => (
                    <div key={t.id} className="relative">
                      <RadioGroupItem value={t.id} id={t.id} className="peer sr-only" />
                      <Label
                        htmlFor={t.id}
                        className={cn(
                          "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer",
                          theme === t.id 
                            ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-black shadow-xl" 
                            : "bg-zinc-50 border-zinc-50 text-zinc-400 dark:bg-zinc-800 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                        )}
                      >
                        <t.icon className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                        {theme === t.id && <Check className="w-3 h-3 absolute top-3 right-3" />}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </section>

          {/* Font Scaling */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 dark:bg-zinc-100 rounded-xl">
                <Type className="w-4 h-4 text-white dark:text-black" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Reading Comfort</h2>
            </div>

            <Card className="border-none bg-white dark:bg-zinc-900 shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8 space-y-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Scaling Intensity</span>
                    <Badge variant="outline" className="text-[10px] font-bold border-zinc-200 dark:border-zinc-800">
                      {fontSize}% Magnitude
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-xs font-bold text-zinc-400">Small</span>
                    <Slider 
                      value={[fontSize]} 
                      min={80} 
                      max={150} 
                      step={5}
                      onValueChange={([val]) => setFontSize(val)}
                      className="flex-1"
                    />
                    <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Large</span>
                  </div>
                  <p className="text-[9px] text-zinc-400 italic leading-relaxed">
                    Adjusting this scales the entire application interface relative to your device's default. Higher values improve legibility for long reading sessions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Preview Column */}
        <div className="md:col-span-5">
          <section className="sticky top-24 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <Info className="w-4 h-4 text-zinc-400" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Legibility Preview</h2>
            </div>

            <Card className="border-none bg-zinc-900 dark:bg-black text-white rounded-[2.5rem] overflow-hidden shadow-2xl">
              <CardHeader className="p-10 pb-6 border-b border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Live Context</span>
                  <Badge className="bg-white/10 text-zinc-400 border-none px-3 py-0.5 rounded-full text-[8px] font-black uppercase">Sample Node</Badge>
                </div>
                <CardTitle className="text-xl font-bold tracking-tight">How it will look</CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-6">
                  {/* Sample Arabic */}
                  <p className="text-right font-arabic text-3xl sm:text-4xl text-white leading-[2.2] border-b border-white/5 pb-6" dir="rtl">
                    إِنَّ مَعَ الْعُسْرِ يُسْرًا
                  </p>
                  
                  {/* Sample Text */}
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-zinc-400 leading-relaxed">
                      "Verily, with every hardship comes ease. Our platform is designed to prioritize the sacred word through professional typography."
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic">
                      This preview updates in real-time as you adjust the scales above. The entire "Studio" system will adapt to these settings.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-10 pt-0">
                <Button className="w-full h-14 rounded-2xl bg-white text-zinc-900 font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                  Example Interaction
                </Button>
              </CardFooter>
            </Card>

            <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800 flex items-start gap-4">
              <ShieldCheck className="w-5 h-5 text-zinc-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Node Sync</p>
                <p className="text-xs font-medium text-zinc-400 leading-relaxed">
                  Display preferences are stored in the local node and synchronized across sessions.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
