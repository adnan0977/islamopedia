
"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { aiTodaysAyats, type AiTodaysAyatsOutput } from '@/ai/flows/ai-todays-ayats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Play, Heart, TrendingUp, MapPin, BookOpen, Loader2 } from 'lucide-react';
import { getPrayerTimes } from '@/lib/api';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const [dailyAyats, setDailyAyats] = useState<AiTodaysAyatsOutput | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [location, setLocation] = useState({ city: 'London', country: 'UK' });

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

  const trendingVideos = [
    { id: 1, title: 'Epic Mountain Adventure', views: '1.2M', time: '2 days ago', img: PlaceHolderImages[1] },
    { id: 2, title: 'The Future of AI Technology', views: '850K', time: '5 hours ago', img: PlaceHolderImages[2] },
    { id: 3, title: 'Secret Vegan Recipes', views: '420K', time: '1 week ago', img: PlaceHolderImages[3] },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-8 md:space-y-12 pb-24 md:pb-8">
      {/* Header Info */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-5 md:p-6 rounded-2xl border border-border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-primary">VlogNest</h1>
          <div className="flex items-center text-muted-foreground text-xs md:text-sm">
            <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            <span>{location.city}, {location.country}</span>
          </div>
        </div>
        
        {prayerTimes && (
          <div className="flex flex-wrap gap-2 md:gap-3">
            {Object.entries(prayerTimes.timings).filter(([k]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(k)).map(([name, time]) => (
              <div key={name} className="flex flex-col items-center bg-secondary px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-border">
                <span className="text-[8px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{name}</span>
                <span className="text-xs md:text-sm font-headline font-semibold text-accent">{time as string}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured / AI Indexing simulated */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-headline font-bold flex items-center">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 mr-2 text-primary" />
              Trending Now
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trendingVideos.map((video) => (
              <Card key={video.id} className="overflow-hidden group cursor-pointer bg-card border-none hover:ring-2 hover:ring-primary transition-all shadow-lg">
                <div className="relative aspect-video">
                  <Image 
                    src={video.img.imageUrl} 
                    alt={video.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    data-ai-hint={video.img.imageHint}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all shadow-lg">
                      <Play className="text-white fill-white ml-1 w-4 h-4 md:w-5 md:h-5" />
                    </div>
                  </div>
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-base md:text-lg leading-tight line-clamp-2">{video.title}</CardTitle>
                  <div className="flex items-center text-[10px] md:text-xs text-muted-foreground space-x-2 mt-2">
                    <span>{video.views} views</span>
                    <span>•</span>
                    <span>{video.time}</span>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Today's Ayats Section */}
        <div className="space-y-6">
          <h2 className="text-xl md:text-2xl font-headline font-bold flex items-center">
            <BookOpen className="w-5 h-5 md:w-6 md:h-6 mr-2 text-accent" />
            Today's Reflections
          </h2>
          <ScrollArea className="h-[400px] md:h-[500px] rounded-2xl border border-border p-4 bg-card/50">
            <div className="space-y-4">
              {!dailyAyats ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs">Gathering reflections...</p>
                </div>
              ) : (
                dailyAyats.ayats.map((ayat, i) => (
                  <Card key={i} className="bg-secondary border-none shadow-sm overflow-hidden hover:translate-y-[-2px] transition-transform">
                    <CardHeader className="p-4 pb-0">
                      <Badge variant="outline" className="w-fit text-accent border-accent/30 text-[10px]">
                        {ayat.surahNumber}:{ayat.ayatNumber}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <p className="text-right text-lg md:text-xl font-arabic leading-relaxed text-primary">
                        {ayat.text}
                      </p>
                      <p className="text-xs md:text-sm italic text-muted-foreground leading-relaxed">
                        "{ayat.translation}"
                      </p>
                      <div className="pt-2 border-t border-border/10">
                        <p className="text-[8px] md:text-[10px] text-accent uppercase font-bold mb-1">AI Insight</p>
                        <p className="text-[10px] md:text-xs text-foreground/80 leading-relaxed">
                          {ayat.importanceReason}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </section>

      {/* Favorites Display */}
      <section className="space-y-6">
        <h2 className="text-xl md:text-2xl font-headline font-bold flex items-center">
          <Heart className="w-5 h-5 md:w-6 md:h-6 mr-2 text-destructive" />
          Your Favorites
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
           {Array.from({length: 6}).map((_, i) => (
             <div key={i} className="flex flex-col items-center space-y-2 group cursor-pointer">
               <div className="relative w-full aspect-square rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all p-1">
                 <Image 
                   src={`https://picsum.photos/seed/fav${i}/200`} 
                   alt="Channel" 
                   width={200} 
                   height={200} 
                   className="rounded-full object-cover"
                 />
               </div>
               <span className="text-[10px] md:text-xs font-medium text-center truncate w-full px-2">Vlogger {i+1}</span>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
}
