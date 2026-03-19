
"use client";

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Play, Loader2, ChevronRight, TrendingUp, CalendarDays, Volume2, Timer } from 'lucide-react';
import { getPrayerTimes } from '@/lib/api';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRAYER_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export default function Home() {
  const db = useFirestore();
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [location] = useState({ city: 'London', country: 'UK' }); // Default fallback
  const [hijriAdjustment, setHijriAdjustment] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Firestore Queries
  const trendingQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    where('isTrending', '==', true),
    limit(4)
  ), [db]);
  const { data: trendingVideos, isLoading: isTrendingLoading } = useCollection(trendingQuery);

  const speakersQuery = useMemoFirebase(() => query(collection(db, 'speakers'), limit(8)), [db]);
  const { data: speakers } = useCollection(speakersQuery);

  // Load adjustments from settings
  useEffect(() => {
    const saved = localStorage.getItem('vlognest_azan_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHijriAdjustment(parsed.hijriAdjustment ?? 0);
      } catch (e) {}
    }
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        // Use geolocation if available for home page too
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const pt = await getPrayerTimes(location.city, location.country, hijriAdjustment);
            setPrayerTimes(pt.data);
          }, async () => {
            const pt = await getPrayerTimes(location.city, location.country, hijriAdjustment);
            setPrayerTimes(pt.data);
          });
        } else {
          const pt = await getPrayerTimes(location.city, location.country, hijriAdjustment);
          setPrayerTimes(pt.data);
        }
      } catch (error) {
        console.error("Data fetching error:", error);
      }
    }
    fetchData();
  }, [location, hijriAdjustment]);

  // Calculate Current and Next Prayer
  const prayerStatus = useMemo(() => {
    if (!prayerTimes || !prayerTimes.timings) return null;

    const timings = prayerTimes.timings;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();

    const sortedPrayers = PRAYER_KEYS.map(key => {
      const [h, m] = timings[key].split(':').map(Number);
      return { key, label: key, minutes: h * 60 + m, timeStr: timings[key] };
    });

    // Find the current prayer (the last one that has already started)
    let current = sortedPrayers.filter(p => p.minutes <= now).pop();
    // Find the next prayer (the first one that hasn't started yet)
    let next = sortedPrayers.find(p => p.minutes > now);

    // Handle overnight (after Isha, before Fajr)
    if (!current) {
      current = sortedPrayers[sortedPrayers.length - 1]; // Yesterday's Isha
    }
    if (!next) {
      next = sortedPrayers[0]; // Tomorrow's Fajr
    }

    return { current, next };
  }, [prayerTimes, currentTime]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-16 pb-32 lg:pb-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 px-6 py-12 md:px-16 md:py-24 text-white shadow-2xl">
        <div className="relative z-10 grid gap-12 md:grid-cols-2 items-center">
          <div className="space-y-8 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 justify-center md:justify-start">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">
                <Badge variant="secondary" className="bg-primary text-primary-foreground animate-pulse">LIVE</Badge>
                <span>Spiritual Node</span>
              </div>
              {prayerTimes && (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <CalendarDays className="w-3 h-3" />
                  {prayerTimes.date.hijri.day} {prayerTimes.date.hijri.month.en} {prayerTimes.date.hijri.year} AH
                </div>
              )}
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Sacred <br />
              <span className="text-zinc-500">Chronicles.</span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-[500px] leading-relaxed mx-auto md:mx-0">
              A professional-grade library of spiritual reflections and verified prophetic traditions.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
              <Button size="lg" className="rounded-full h-14 px-10 gap-3 text-base font-bold shadow-xl shadow-primary/20" asChild>
                <Link href="/videos"><Play className="h-5 w-5 fill-current" /> Studio Feed</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-14 px-10 bg-transparent text-white border-white/20 hover:bg-white/10 text-base font-bold" asChild>
                <Link href="/hadith">Browse Library</Link>
              </Button>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Live Prayer Status Card */}
            {prayerStatus && (
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 animate-in fade-in zoom-in duration-1000">
                <CardContent className="p-8 flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Current Namaz</span>
                    </div>
                    <h3 className="text-4xl font-black tracking-tighter text-white uppercase">{prayerStatus.current.label}</h3>
                    <p className="text-xs font-medium text-zinc-500">Aligning your heart with the divine pulse.</p>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex items-center justify-end gap-2 text-zinc-500">
                      <Timer className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Next: {prayerStatus.next.label}</span>
                    </div>
                    <span className="text-4xl font-black text-zinc-200 tabular-nums">{prayerStatus.next.timeStr}</span>
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Active Node</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[500px] w-[500px] rounded-full bg-primary opacity-20 blur-[120px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[500px] w-[500px] rounded-full bg-zinc-500 opacity-5 blur-[120px]" />
      </section>

      {/* Trending Section */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-3xl font-bold tracking-tight flex items-center justify-center sm:justify-start gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              Trending Reflection
            </h2>
            <p className="text-sm text-muted-foreground font-medium">Most watched spiritual insights across the global node.</p>
          </div>
          <Button variant="ghost" className="gap-2 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400 hover:text-primary transition-all" asChild>
            <Link href="/videos">Open Full Catalog <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        {isTrendingLoading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-zinc-200" /></div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {trendingVideos?.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>

      {/* Scholars Quick Access */}
      <section className="space-y-10 py-16 px-8 rounded-[3rem] bg-zinc-50 border border-zinc-100 shadow-sm">
        <div className="text-center space-y-3">
          <h2 className="text-4xl font-bold tracking-tight">Our Scholars</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base font-medium">Explore profiles and insights from leading teachers providing depth to modern challenges.</p>
        </div>
        
        <div className="flex gap-8 overflow-x-auto pb-8 snap-x px-4 no-scrollbar">
          {speakers?.map((speaker) => (
            <Link key={speaker.id} href={`/videos?speakerId=${speaker.id}`} className="group shrink-0 snap-center">
              <div className="flex flex-col items-center space-y-5">
                <div className="relative h-32 w-32 md:h-40 md:w-40 overflow-hidden rounded-full border-4 border-white shadow-2xl ring-1 ring-zinc-100 transition-all duration-700 group-hover:scale-105 group-hover:ring-primary/20">
                  <Image 
                    src={speaker.profileImageUrl || 'https://picsum.photos/seed/speaker/400'} 
                    alt={speaker.name} 
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold group-hover:text-primary transition-colors tracking-tight">{speaker.name}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mt-1">Scholar</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Access Modules */}
      <section className="grid gap-8 md:grid-cols-3 pb-16">
        <ModuleCard 
          title="Noble Quran" 
          description="Read, reflect and listen to the Divine word with professional translations."
          badge="SCRIPTURE"
          href="/quran"
          image="https://picsum.photos/seed/quran/800/400"
          dark
        />
        <ModuleCard 
          title="Hadith Library" 
          description="Explore thousands of traditions with authenticity grades from verified sources."
          badge="TRADITIONS"
          href="/hadith"
          image="https://picsum.photos/seed/hadith/800/400"
        />
        <ModuleCard 
          title="Video Catalog" 
          description="Watch curated high-definition spiritual content, lectures, and documentaries."
          badge="VISUALS"
          href="/videos"
          image="https://picsum.photos/seed/video/800/400"
          primary
        />
      </section>
    </div>
  );
}

function VideoCard({ video }: { video: any }) {
  return (
    <Card className="group overflow-hidden rounded-[2rem] border-none bg-white shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
      <Link href={`/watch?v=${video.id}`}>
        <div className="relative aspect-video overflow-hidden">
          <Image 
            src={video.thumbnailUrl} 
            alt={video.title} 
            fill 
            className="object-cover transition-transform duration-1000 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-md rounded-full p-5 scale-75 group-hover:scale-100 transition-all duration-500 shadow-2xl">
              <Play className="h-8 w-8 text-white fill-current" />
            </div>
          </div>
        </div>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold line-clamp-2 leading-snug text-base tracking-tight group-hover:text-primary transition-colors">{video.title}</h3>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] border-t border-zinc-50 pt-4">
            <span>{new Date(video.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <Badge variant="outline" className="text-[8px] border-zinc-100">VIDEO</Badge>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

function ModuleCard({ title, description, badge, href, image, dark, primary }: any) {
  return (
    <Card className={cn(
      "group cursor-pointer overflow-hidden border-none shadow-xl rounded-[2.5rem] flex flex-col h-full",
      dark ? "bg-zinc-950 text-white" : primary ? "bg-primary text-primary-foreground" : "bg-white"
    )}>
      <CardHeader className="relative h-56 p-0 overflow-hidden">
        <Image src={image} alt={title} fill className="object-cover opacity-40 transition-transform duration-1000 group-hover:scale-110" />
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t",
          dark ? "from-zinc-950" : primary ? "from-primary" : "from-white"
        )} />
        <div className="absolute bottom-8 left-8">
          <Badge variant={dark || primary ? "secondary" : "default"} className="mb-3 uppercase tracking-[0.2em] text-[9px] font-black">
            {badge}
          </Badge>
          <CardTitle className="text-3xl font-bold tracking-tight">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-2 flex-1 flex flex-col justify-between">
        <p className={cn(
          "text-sm leading-relaxed mb-8 font-medium",
          dark ? "text-zinc-400" : primary ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {description}
        </p>
        <Button variant={dark || primary ? "secondary" : "default"} className="w-full rounded-2xl h-12 font-bold text-sm shadow-lg" asChild>
          <Link href={href}>Explore Now</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
