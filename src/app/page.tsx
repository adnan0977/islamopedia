"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Play, Loader2, ChevronRight, Users, TrendingUp, MapPin, Smartphone, Heart, Quote } from 'lucide-react';
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
    limit(12)
  ), [db]);
  const { data: trendingVideos, isLoading: isTrendingLoading } = useCollection(trendingQuery);

  const recommendedQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    orderBy('publishedAt', 'desc'),
    limit(12)
  ), [db]);
  const { data: recommendedVideos, isLoading: isRecommendedLoading } = useCollection(recommendedQuery);

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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-20 pb-32">
      {/* Header Info */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-950/50 backdrop-blur-md p-8 rounded-[2rem] border border-zinc-900 shadow-2xl">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 text-zinc-500 fill-zinc-500" />
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

      <div className="space-y-24">
        {/* Hadith of the Day */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-headline font-bold flex items-center gap-3 text-zinc-100">
              <Quote className="w-6 h-6 text-zinc-500 fill-zinc-500" />
              Hadith of the Day
            </h2>
            <Link href="/hadith" className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-100 flex items-center gap-2 transition-all">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <Card className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative p-1">
            <div className="bg-zinc-900/20 p-10 md:p-16 text-center space-y-10 rounded-[2.2rem]">
               <p className="text-2xl md:text-4xl font-arabic leading-loose text-zinc-100" dir="rtl">
                 "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ"
               </p>
               <div className="max-w-3xl mx-auto space-y-4">
                 <p className="text-lg md:text-xl text-zinc-400 font-medium italic leading-relaxed">
                   "The best of you are those who learn the Quran and teach it."
                 </p>
                 <div className="flex flex-col items-center gap-1">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Sahih Bukhari</span>
                   <div className="w-12 h-0.5 bg-zinc-800 rounded-full" />
                 </div>
               </div>
            </div>
          </Card>
        </section>

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
            <Carousel opts={{ align: "start", loop: false }} className="w-full">
              <CarouselContent className="-ml-1">
                {trendingVideos?.map((video) => (
                  <CarouselItem key={video.id} className="pl-1 basis-full sm:basis-1/2 lg:basis-1/4">
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

        {/* Recommended & Personalized Feed */}
        <section className="space-y-8 relative">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-3 text-zinc-100">
                <Play className="w-6 h-6 text-zinc-500 fill-zinc-500" />
                Recommended For You
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Curated based on trending spiritual content</p>
            </div>
          </div>
          
          {isRecommendedLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-zinc-800" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {recommendedVideos?.slice(0, 4).map(video => (
                 <VideoCard key={video.id} video={video} />
               ))}
            </div>
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
            <Link href="/speakers" className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-100 flex items-center gap-2 transition-all">
              View Directory <ChevronRight className="w-3 h-3" />
            </Link>
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

        {/* My Favorites Section */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="space-y-1">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-3 text-zinc-100">
                <Heart className="w-6 h-6 text-zinc-500" />
                Saved Favorites
              </h2>
              <p className="text-xs text-zinc-500 font-medium">Your most cherished reflections in one place</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {trendingVideos?.slice(4, 10).map((video, idx) => (
               <Link key={video.id} href={`/watch?v=${video.id}`} className="group space-y-3">
                 <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950">
                    <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                 </div>
                 <h3 className="text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors line-clamp-1 leading-tight">{video.title}</h3>
               </Link>
             ))}
          </div>
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
    <Card className="overflow-hidden group cursor-pointer bg-zinc-950 border-zinc-900 hover:border-zinc-700 transition-all duration-500 shadow-2xl hover:shadow-zinc-500/5 rounded-2xl md:rounded-3xl h-full">
      <Link href={`/watch?v=${video.id}`} className="flex flex-col h-full">
        <div className="relative aspect-video overflow-hidden">
          <Image 
            src={video.thumbnailUrl} 
            alt={video.title} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl w-10 h-10 md:w-14 md:h-14 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-all duration-500 shadow-2xl">
              <Play className="text-zinc-300 fill-zinc-300 ml-0.5 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
        <CardHeader className="p-4 md:p-5 flex-1 flex flex-col justify-between">
          <CardTitle className="font-bold leading-tight line-clamp-2 min-h-[2.5rem] text-zinc-300 group-hover:text-white transition-colors text-xs md:text-sm tracking-tight mb-2 md:mb-4">
            {video.title}
          </CardTitle>
          <div className="flex items-center justify-between text-[8px] md:text-[9px] text-zinc-600 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] pt-2 md:pt-4 border-t border-zinc-900">
            <span className="flex items-center gap-1">
              <Smartphone className="w-2.5 h-2.5" />
              {video.appViewCount?.toLocaleString() || 0}
            </span>
            <span>
              {mounted ? new Date(video.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
            </span>
          </div>
        </CardHeader>
      </Link>
    </Card>
  );
}
