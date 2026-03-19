
"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CalendarDays,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getPrayerTimesByCoords, getCityFromCoords } from '@/lib/api';

const PRAYERS = [
  { key: 'Fajr', label: 'Fajr', description: 'Pre-dawn' },
  { key: 'Sunrise', label: 'Sunrise', description: 'Shuruq' },
  { key: 'Dhuhr', label: 'Dhuhr', description: 'Noon' },
  { key: 'Asr', label: 'Asr', description: 'Afternoon' },
  { key: 'Maghrib', label: 'Maghrib', description: 'Sunset' },
  { key: 'Isha', label: 'Isha', description: 'Night' },
];

export default function PrayerTimesPage() {
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [timings, setTimings] = useState<any>(null);
  const [dateInfo, setDateInfo] = useState<any>(null);
  const [location, setLocation] = useState<{ city: string, country: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTimings = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your device.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          
          // Parallel fetch for speed
          const [ptResponse, cityResponse] = await Promise.all([
            getPrayerTimesByCoords(latitude, longitude),
            getCityFromCoords(latitude, longitude)
          ]);

          setTimings(ptResponse.data.timings);
          setDateInfo(ptResponse.data.date);
          setLocation({
            city: cityResponse.city || cityResponse.locality || "Unknown City",
            country: cityResponse.countryName || "Unknown Country"
          });
        } catch (e: any) {
          setError("Failed to fetch accurate timings. Please check your connection.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError("Location access denied. Please enable GPS to see timings for your city.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchTimings();
  }, [fetchTimings]);

  // Determine current/next prayer
  const getNextPrayer = () => {
    if (!timings) return null;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    const sortedPrayers = PRAYERS.map(p => {
      const [h, m] = timings[p.key].split(':').map(Number);
      return { ...p, timeInMinutes: h * 60 + m };
    });

    const next = sortedPrayers.find(p => p.timeInMinutes > now);
    return next || sortedPrayers[0]; // If none after now, next is Fajr tomorrow
  };

  const nextPrayer = getNextPrayer();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl min-h-[90vh] flex flex-col space-y-10 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/more')} className="rounded-2xl h-12 w-12 border-zinc-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">Prayer Times</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Astronomical Precision</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={fetchTimings} 
          disabled={loading}
          className="rounded-xl h-10 w-10 border-zinc-200"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </header>

      {error ? (
        <Card className="bg-red-50 border-red-100 text-red-900 rounded-[2rem] p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 mx-auto text-red-500" />
          <p className="font-bold text-sm leading-relaxed">{error}</p>
          <Button variant="outline" className="border-red-200 text-red-600 font-bold rounded-xl" onClick={fetchTimings}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Location
          </Button>
        </Card>
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-zinc-200" />
            <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-zinc-400" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Syncing with Satellites</p>
            <p className="text-sm font-bold text-zinc-900">Refreshing your location...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Hero: Current Status */}
          <section className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-black uppercase tracking-widest">{location?.city}, {location?.country}</span>
              </div>
              <h2 className="text-6xl font-black tracking-tighter text-zinc-900">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </h2>
              <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-full border border-zinc-100 mt-4">
                <CalendarDays className="w-3 h-3 text-zinc-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {dateInfo?.hijri?.day} {dateInfo?.hijri?.month?.en} {dateInfo?.hijri?.year} AH
                </span>
              </div>
            </div>

            <Card className="bg-zinc-900 border-none rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              <CardContent className="p-8 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Up Next</p>
                  <h3 className="text-3xl font-black text-white">{nextPrayer?.label}</h3>
                  <p className="text-xs font-medium text-zinc-400">{nextPrayer?.description}</p>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-4xl font-black text-white tracking-tight">{timings[nextPrayer?.key!]}</span>
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Approaching</span>
                  </div>
                </div>
              </CardContent>
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            </Card>
          </section>

          {/* Timing Grid */}
          <div className="grid gap-3">
            {PRAYERS.map((p) => {
              const isActive = nextPrayer?.key === p.key;
              return (
                <Card 
                  key={p.key} 
                  className={cn(
                    "border-none rounded-2xl transition-all duration-500",
                    isActive ? "bg-zinc-50 ring-1 ring-zinc-200 shadow-sm" : "bg-white hover:bg-zinc-50/50"
                  )}
                >
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center border transition-colors",
                        isActive ? "bg-zinc-900 border-zinc-900 text-white shadow-lg" : "bg-zinc-50 border-zinc-100 text-zinc-400"
                      )}>
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-900">{p.label}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{p.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "text-lg font-black tracking-tight",
                        isActive ? "text-zinc-900" : "text-zinc-400"
                      )}>
                        {timings[p.key]}
                      </span>
                      <ChevronRight className={cn("h-4 w-4 text-zinc-100", isActive && "text-zinc-300")} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Footer Disclaimer */}
      <footer className="pt-8">
        <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 flex items-start gap-4">
          <ShieldCheck className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
          <p className="text-[10px] font-medium text-zinc-500 leading-relaxed uppercase tracking-wide">
            Method: Muslim World League (MWL). Timings are calculated based on your precise GPS coordinates for maximum accuracy in your current vicinity.
          </p>
        </div>
      </footer>
    </div>
  );
}
