"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Loader2, Sparkles, ChevronRight, Users, TrendingUp, MapPin } from 'lucide-react';
import { getPrayerTimes } from '@/lib/api';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function Home() {
  const db = useFirestore();
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [location] = useState({ city: 'London', country: 'UK' });

  // Firestore Queries
  const trendingQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    where('isTrending', '==', true),
    limit(10)
  ), [db]);
  const { data: trendingVideos, isLoading: isTrendingLoading } = useCollection(trendingQuery);

  const latestQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    orderBy('publishedAt', 'desc'),
    limit(10)
  ), [db]);
  const { data: latestVideos, isLoading: isLatestLoading } = useCollection(latestQuery);

  const speakersQuery = useMemoFirebase(() => query(collection(db, 'speakers'), limit(12)), [db]);
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-16 pb-32">
      {/* Header Info */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-950/50 backdrop-blur-md p-8 rounded-[2rem] border border-zinc-900 shadow-2xl">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-zinc-500" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-zinc-100 tracking-tight">
              VlogNest
            </h1>
          </div>
          <div className="flex items-center text-zinc-500 text-sm font-medium">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{location.city}, {location.country}</span>
          </div>
        </div>
        
        {prayerTimes && (
          <div className="flex flex-wrap gap-3">
            {Object.entries(prayerTimes.timings).filter(([k]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(k)).map(([name, time]) => (
              <div key={name} className="flex flex-col items-center bg-zinc-900/40 backdrop-blur-sm px-5 py-3 rounded-2xl border border-zinc-800/50 min-w-[90px] transition-all hover:border-zinc-700">
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-black mb-1.5">{name}</span>
                <span className="text-sm font-headline font-bold text-zinc-300">{time as string}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-20">
        {/* Trending Now Slider */}
        <section className="space-y-8 relative">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-3 text-zinc-100">
                <TrendingUp className="w-6 h-6 text-zinc-500" />
                Trending Now
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Most watched spiritual reflections this week</p>
            </div>
            <Link href="/videos" className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-100 flex items-center gap-2 transition-all group">
              Explore All <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          {isTrendingLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-zinc-800" /></div>
          ) : (
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-2">
                {trendingVideos?.map((video) => (
                  <CarouselItem key={video.id} className="pl-2 basis-1/4">
                    <VideoCard video={video} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="hidden md:flex gap-2 absolute -top-12 right-4">
                <CarouselPrevious className="static translate-y-0 h-10 w-10 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-500" />
                <CarouselNext className="static translate-y-0 h-10 w-10 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-500" />
              </div>
            </Carousel>
          )}
        </section>

        {/* Scholars / Speakers */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-3 text-zinc-100">
                <Users className="w-6 h-6 text-zinc-500" />
                Featured Scholars
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Profiles of leading spiritual teachers</p>
            </div>
          </div>
          <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4">
            {speakers?.map((speaker) => (
              <Link key={speaker.id} href={`/videos?speakerId=${speaker.id}`} className="flex flex-col items-center space-y-4 shrink-0 group">
                <div className="relative w-24 h-24 rounded-3xl overflow-hidden border border-zinc-900 p-1.5 ring-1 ring-zinc-900 group-hover:ring-zinc-600 transition-all duration-500 bg-zinc-950 shadow-2xl">
                  <Image 
                    src={speaker.profileImageUrl || 'https://picsum.photos/seed/speaker/200'} 
                    alt={speaker.name} 
                    fill
                    className="rounded-2xl object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-black text-center truncate w-24 px-1 text-zinc-500 group-hover:text-zinc-100 transition-colors">{speaker.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Latest Videos Slider */}
        <section className="space-y-8 relative">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-3 text-zinc-100">
                <Play className="w-6 h-6 text-zinc-500" />
                Latest Uploads
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Newly cataloged insights and recitations</p>
            </div>
            <Link href="/videos" className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-100 flex items-center gap-2 transition-all group">
              See History <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          {isLatestLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-zinc-800" /></div>
          ) : (
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-2">
                {latestVideos?.map((video) => (
                  <CarouselItem key={video.id} className="pl-2 basis-1/4">
                    <VideoCard video={video} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="hidden md:flex gap-2 absolute -top-12 right-4">
                <CarouselPrevious className="static translate-y-0 h-10 w-10 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-500" />
                <CarouselNext className="static translate-y-0 h-10 w-10 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-500" />
              </div>
            </Carousel>
          )}
        </section>
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: any }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="overflow-hidden group cursor-pointer bg-zinc-950 border-zinc-900 hover:border-zinc-700 transition-all duration-500 shadow-2xl hover:shadow-zinc-500/5 rounded-xl md:rounded-3xl">
      <Link href={`/watch?v=${video.id}`}>
        <div className="relative aspect-video overflow-hidden">
          <Image 
            src={video.thumbnailUrl} 
            alt={video.title} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-lg md:rounded-2xl w-8 h-8 md:w-14 md:h-14 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-all duration-500 shadow-2xl">
              <Play className="text-zinc-300 fill-zinc-300 ml-0.5 w-3 h-3 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
        <CardHeader className="p-2 md:p-5 space-y-2 md:space-y-4">
          <CardTitle className="font-bold leading-tight line-clamp-2 min-h-[1.5rem] md:min-h-[2.5rem] text-zinc-300 group-hover:text-white transition-colors text-[9px] md:text-sm tracking-tight">
            {video.title}
          </CardTitle>
          <div className="flex items-center justify-between text-[7px] md:text-[9px] text-zinc-600 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] pt-1 md:pt-4 border-t border-zinc-900 mt-1 md:mt-2">
            <span className="hidden xs:inline">{video.viewCount?.toLocaleString() || 0} views</span>
            <span className="xs:hidden">{video.viewCount ? (video.viewCount / 1000).toFixed(0) + 'K' : 0}</span>
            <span className="text-zinc-800">•</span>
            <span>
              {mounted ? new Date(video.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
            </span>
          </div>
        </CardHeader>
      </Link>
    </Card>
  );
}
