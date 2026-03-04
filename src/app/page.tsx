
"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Loader2, Sparkles, ChevronRight, Users, Youtube, TrendingUp, MapPin } from 'lucide-react';
import { getPrayerTimes } from '@/lib/api';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

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
        const pt = await getPrayerTimes(location.city, location.country);
        setPrayerTimes(pt.data);
      } catch (error) {
        console.error("Data fetching error:", error);
      }
    }
    fetchData();
  }, [location]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Header Info */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card/50 backdrop-blur-md p-6 rounded-3xl border border-border shadow-xl">
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

      <div className="space-y-12">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {trendingVideos?.map((video) => (
                <VideoCard key={video.id} video={video} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestVideos?.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: any }) {
  return (
    <Card className="overflow-hidden group cursor-pointer bg-card border-border/50 hover:border-primary transition-all duration-300 shadow-lg hover:shadow-primary/10 rounded-2xl">
      <Link href={`/watch?v=${video.id}`}>
        <div className="relative aspect-video">
          <Image 
            src={video.thumbnailUrl} 
            alt={video.title} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <div className="bg-primary rounded-full w-12 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all shadow-2xl">
              <Play className="text-white fill-white ml-1 w-5 h-5" />
            </div>
          </div>
        </div>
        <CardHeader className="p-5">
          <CardTitle className="font-bold leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors text-base">
            {video.title}
          </CardTitle>
          <div className="flex items-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider space-x-2 pt-2 border-t border-border/30 mt-4">
            <span>{video.viewCount?.toLocaleString() || 0} views</span>
          </div>
        </CardHeader>
      </Link>
    </Card>
  );
}
