
"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Play, Loader2, ChevronRight, TrendingUp, Clock } from 'lucide-react';
import { getPrayerTimes } from '@/lib/api';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Home() {
  const db = useFirestore();
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [location] = useState({ city: 'London', country: 'UK' });

  // Firestore Queries
  const trendingQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    where('isTrending', '==', true),
    limit(4)
  ), [db]);
  const { data: trendingVideos, isLoading: isTrendingLoading } = useCollection(trendingQuery);

  const speakersQuery = useMemoFirebase(() => query(collection(db, 'speakers'), limit(8)), [db]);
  const { data: speakers } = useCollection(speakersQuery);

  useEffect(() => {
    async function fetchData() {
      try {
        const pt = await getPrayerTimes(location.city, location.country);
        setPrayerTimes(pt.data);
      } catch (error) {
        console.error("Data fetching error:", error);
      }
    }
    fetchData();
  }, [location]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-16 pb-24 md:pb-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 px-6 py-12 md:px-16 md:py-24 text-white shadow-2xl">
        <div className="relative z-10 grid gap-12 md:grid-cols-2 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">
              <Badge variant="secondary" className="bg-primary text-primary-foreground">NEW</Badge>
              <span>Explore Chapter 4: The Path of Wisdom</span>
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Spiritual <br />
              <span className="text-zinc-500">Reflections.</span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-[500px] leading-relaxed">
              A high-performance library of prophetic traditions and deep spiritual insights from leading scholars.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="rounded-full h-14 px-10 gap-3 text-base font-bold shadow-xl shadow-primary/20">
                <Play className="h-5 w-5 fill-current" /> Start Watching
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-14 px-10 bg-transparent text-white border-white/20 hover:bg-white/10 text-base font-bold">
                Browse Hadith
              </Button>
            </div>
          </div>
          
          {prayerTimes && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(prayerTimes.timings)
                .filter(([k]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(k))
                .map(([name, time]) => (
                  <Card key={name} className="bg-white/5 border-white/10 backdrop-blur-sm shadow-inner rounded-2xl overflow-hidden group hover:bg-white/10 transition-all duration-500">
                    <CardHeader className="p-5 flex flex-row items-center justify-between space-y-0">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-zinc-300 transition-colors">{name}</span>
                      <Clock className="h-3.5 w-3.5 text-zinc-600" />
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <span className="text-2xl font-bold tracking-tighter">{time as string}</span>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
        {/* Abstract Gradients */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[500px] w-[500px] rounded-full bg-primary opacity-30 blur-[120px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[500px] w-[500px] rounded-full bg-zinc-500 opacity-10 blur-[120px]" />
      </section>

      {/* Trending Section */}
      <section className="space-y-8">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              Trending Now
            </h2>
            <p className="text-sm text-muted-foreground font-medium">Most watched spiritual insights this week.</p>
          </div>
          <Button variant="ghost" className="gap-2 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400 hover:text-primary transition-all" asChild>
            <Link href="/videos">View Catalog <ChevronRight className="h-4 w-4" /></Link>
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
        
        <div className="flex gap-8 overflow-x-auto pb-8 scrollbar-hide snap-x px-4">
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
            <div className="bg-white/20 backdrop-blur-md rounded-full p-5 scale-75 group-hover:scale-100 transition-all duration-500">
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
