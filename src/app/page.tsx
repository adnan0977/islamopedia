"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { aiTodaysAyats, type AiTodaysAyatsOutput } from '@/ai/flows/ai-todays-ayats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Play, BookOpen, Loader2, Sparkles, ChevronRight, Users, Youtube, TrendingUp, MapPin } from 'lucide-react';
import { getPrayerTimes } from '@/lib/api';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function Home() {
  const db = useFirestore();
  const [dailyAyats, setDailyAyats] = useState<AiTodaysAyatsOutput | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [location] = useState({ city: 'London', country: 'UK' });

  // Firestore Queries - Simplified for public access
  const trendingQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    where('isTrending', '==', true),
    limit(4)
  ), [db]);
  const { data: trendingVideos, isLoading: isTrendingLoading } = useCollection(trendingQuery);

  const latestQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    orderBy('publishedAt', 'desc'),
    limit(6)
  ), [db]);
  const { data: latestVideos, isLoading: isLatestLoading } = useCollection(latestQuery);

  const speakersQuery = useMemoFirebase(() => query(collection(db, 'speakers'), limit(12)), [db]);
  const { data: speakers } = useCollection(speakersQuery);

  const channelsQuery = useMemoFirebase(() => query(collection(db, 'channels'), limit(12)), [db]);
  const { data: channels } = useCollection(channelsQuery);

  useEffect(() => {
    async function fetchData() {
      try {
        const ayats = await aiTodaysAyats({ currentDate: new Date().toISOString().split('T')[0] });
        setDailyAyats(ayats);
        
        const pt = await getPrayerTimes(location.city, location.country);
        setPrayerTimes(pt.data);
      } catch (error) {
        console.error("Data fetching error:", error);
      }
    }
    fetchData();
  }, [location]);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 md:pt-8 pb-24 space-y-12">
      {/* Header Info */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card p-6 rounded-3xl border border-border shadow-xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
            VlogNest <Sparkles className="w-5 h-5 text-accent" />
          </h1>
          <div className="flex items-center text-muted-foreground text-sm">
            <MapPin className="w-4 h-4 mr-1.5 text-primary" />
            <span className="font-medium">{location.city}, {location.country}</span>
          </div>
        </div>
        
        {prayerTimes && (
          <div className="flex flex-wrap gap-3">
            {Object.entries(prayerTimes.timings).filter(([k]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(k)).map(([name, time]) => (
              <div key={name} className="flex flex-col items-center bg-secondary/50 backdrop-blur-sm px-4 py-2 rounded-2xl border border-border/50 min-w-[80px]">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">{name}</span>
                <span className="text-sm font-headline font-bold text-accent">{time as string}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-12">
          {/* Trending Now */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Trending Now
              </h2>
              <Link href="/videos" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                See All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {isTrendingLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {trendingVideos?.map((video) => (
                  <VideoCard key={video.id} video={video} size="large" />
                ))}
              </div>
            )}
          </section>

          {/* Scholars / Speakers */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-accent" />
                Featured Scholars
              </h2>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {speakers?.map((speaker) => (
                <Link key={speaker.id} href={`/videos?speakerId=${speaker.id}`} className="flex flex-col items-center space-y-3 shrink-0 group">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all p-1 ring-4 ring-secondary/50 group-hover:ring-primary/20 shadow-lg">
                    <Image 
                      src={speaker.profileImageUrl || 'https://picsum.photos/seed/speaker/200'} 
                      alt={speaker.name} 
                      fill
                      className="rounded-full object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <span className="text-xs font-bold text-center truncate w-24 px-1 group-hover:text-primary transition-colors">{speaker.name}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Latest Videos */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
                <Play className="w-6 h-6 text-green-500" />
                Latest Uploads
              </h2>
              <Link href="/videos" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                See All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {isLatestLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {latestVideos?.map((video) => (
                  <VideoCard key={video.id} video={video} size="small" />
                ))}
              </div>
            )}
          </section>

          {/* Featured Channels */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
                <Youtube className="w-6 h-6 text-red-500" />
                Verified Channels
              </h2>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {channels?.map((channel) => (
                <Link key={channel.id} href={`/videos?channelId=${channel.id}`} className="flex flex-col items-center space-y-3 shrink-0 group">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-border group-hover:border-primary transition-all shadow-md">
                    <Image 
                      src={channel.thumbnailUrl} 
                      alt={channel.title} 
                      fill
                      className="object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-center truncate w-20 px-1 group-hover:text-primary transition-colors uppercase tracking-tight">{channel.title}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar: Today's Ayats */}
        <div className="space-y-8 lg:sticky lg:top-24 h-fit">
          <div className="space-y-2">
            <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-accent" />
              Today's Reflections
            </h2>
            <p className="text-xs text-muted-foreground">AI-selected verses for your spiritual growth.</p>
          </div>
          <ScrollArea className="h-[600px] rounded-3xl border border-border p-5 bg-card/40 backdrop-blur-sm shadow-inner">
            <div className="space-y-5">
              {!dailyAyats ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-sm font-medium">Gathering reflections...</p>
                </div>
              ) : (
                dailyAyats.ayats.map((ayat, i) => (
                  <Card key={i} className="bg-secondary/40 border-border/50 shadow-sm overflow-hidden hover:translate-y-[-4px] transition-all duration-300">
                    <CardHeader className="p-5 pb-0">
                      <Badge variant="outline" className="w-fit h-fit text-accent border-accent/30 text-[10px] font-bold">
                        SURAH {ayat.surahNumber} : AYAT {ayat.ayatNumber}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">
                      <p className="text-right text-xl md:text-2xl font-arabic leading-relaxed text-primary">
                        {ayat.text}
                      </p>
                      <div className="space-y-4">
                        <p className="text-sm italic text-foreground/90 leading-relaxed font-medium">
                          "{ayat.translation}"
                        </p>
                        <div className="pt-4 border-t border-border/20">
                          <p className="text-[10px] text-accent uppercase font-black tracking-widest mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> AI Insight
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {ayat.importanceReason}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video, size = 'large' }: { video: any, size?: 'small' | 'large' }) {
  const isSmall = size === 'small';
  
  return (
    <Card className={cn(
      "overflow-hidden group cursor-pointer bg-card border-border/50 hover:border-primary transition-all duration-300 shadow-lg hover:shadow-primary/10",
      isSmall ? "rounded-xl" : "rounded-2xl"
    )}>
      <Link href={`/watch?v=${video.id}`}>
        <div className="relative aspect-video">
          <Image 
            src={video.thumbnailUrl} 
            alt={video.title} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <div className={cn(
              "bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all shadow-2xl",
              isSmall ? "w-8 h-8" : "w-12 h-12"
            )}>
              <Play className={cn("text-white fill-white ml-0.5", isSmall ? "w-3.5 h-3.5" : "w-5 h-5 ml-1")} />
            </div>
          </div>
        </div>
        <CardHeader className={cn(isSmall ? "p-3" : "p-5")}>
          <CardTitle className={cn(
            "font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors",
            isSmall ? "text-xs min-h-[2rem]" : "text-base min-h-[2.5rem]"
          )}>
            {video.title}
          </CardTitle>
          <div className={cn(
            "flex items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider space-x-2 pt-2 border-t border-border/30",
            isSmall ? "mt-2" : "mt-4"
          )}>
            <span>{video.viewCount?.toLocaleString() || 0} views</span>
          </div>
        </CardHeader>
      </Link>
    </Card>
  );
}