"use client";

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Tv, 
  MapPin, 
  Clock, 
  Info, 
  ShieldCheck, 
  ChevronRight,
  Loader2,
  ExternalLink,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const STREAMS = [
  {
    id: 'makkah',
    label: 'Makkah Al-Mukarramah',
    subLabel: 'Masjid Al-Haram',
    youtubeId: 'MA_5PZ_Ssqo', // Standard Saudi Quran Live ID
    description: 'Direct 24/7 broadcast from the Holy Kaaba, featuring the complete recitation of the Noble Quran.'
  },
  {
    id: 'madinah',
    label: 'Madinah Al-Munawwarah',
    subLabel: 'Masjid An-Nabawi',
    youtubeId: '_f_8Z5_Z_8o', // Standard Saudi Sunnah Live ID
    description: 'Live feed from the Prophets Mosque, broadcasting the Prophetic traditions and daily congregational prayers.'
  }
];

export default function LiveStreamsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('makkah');
  const [saudiTime, setSaudiTime] = useState('');

  // Update Saudi Time (UTC+3)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const saudi = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
      setSaudiTime(saudi.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-10 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/more')} className="rounded-2xl h-12 w-12 border-zinc-200 shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">Live Streams</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Global Spiritual Nodes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Saudi Arabia Time</span>
            <span className="text-lg font-black text-zinc-900 tracking-tighter tabular-nums">{saudiTime || '--:--:--'}</span>
          </div>
          <div className="h-12 w-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-xl">
            <Clock className="w-6 h-6 text-white" />
          </div>
        </div>
      </header>

      <Tabs defaultValue="makkah" className="w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            <TabsList className="flex flex-col h-auto bg-zinc-50 p-2 rounded-[2rem] border border-zinc-100 shadow-inner w-full">
              {STREAMS.map((stream) => (
                <TabsTrigger 
                  key={stream.id} 
                  value={stream.id}
                  className="w-full justify-start px-6 py-4 rounded-2xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-zinc-900 text-zinc-400 font-bold transition-all gap-4 mb-1 last:mb-0"
                >
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center border transition-colors",
                    activeTab === stream.id ? "bg-zinc-900 border-zinc-900 text-white" : "bg-zinc-100 border-zinc-200"
                  )}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm">{stream.label.split(' ')[0]}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{stream.subLabel}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            <Card className="border-none bg-zinc-900 text-white rounded-[2rem] overflow-hidden shadow-2xl">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Info className="w-4 h-4 text-zinc-400" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Broadcast Info</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                  {STREAMS.find(s => s.id === activeTab)?.description}
                </p>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Signal Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Live 4K</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Theatre */}
          <div className="flex-1 space-y-6">
            {STREAMS.map((stream) => (
              <TabsContent key={stream.id} value={stream.id} className="m-0 focus-visible:outline-none">
                <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden bg-black shadow-2xl ring-1 ring-zinc-900">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${stream.youtubeId}?autoplay=1&modestbranding=1&rel=0`}
                    title={stream.label}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  
                  {/* Subtle Branding Overlay */}
                  <div className="absolute top-6 left-6 pointer-events-none">
                    <Badge className="bg-black/40 backdrop-blur-md border border-white/10 text-white font-black px-4 py-1.5 rounded-full uppercase tracking-widest text-[9px] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      Direct Studio Feed
                    </Badge>
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">{stream.label}</h2>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">{stream.subLabel} • Official Broadcast</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl h-11 font-bold gap-2 border-zinc-200">
                      <Volume2 className="w-4 h-4" /> Audio Primary
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-xl h-11 w-11 border-zinc-200" asChild>
                      <a href={`https://youtube.com/watch?v=${stream.youtubeId}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </div>
        </div>
      </Tabs>

      {/* Footer Info */}
      <footer className="pt-8">
        <div className="bg-zinc-50 rounded-[2.5rem] p-8 border border-zinc-100 flex items-start gap-6 shadow-inner">
          <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shrink-0 border border-zinc-200 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-zinc-400" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Platform Reliability</p>
            <p className="text-xs font-medium text-zinc-400 leading-relaxed max-w-3xl">
              Live feeds are provided by official Saudi media channels. In the event of a broadcast interruption, the platform will automatically attempt to reconnect to the primary satellite uplink. Some geographical restrictions may apply based on YouTube's regional policy.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
