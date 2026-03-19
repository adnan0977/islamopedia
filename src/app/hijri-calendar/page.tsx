
"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  CalendarDays, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Info,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Minus,
  Plus,
  Settings2,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getHijriCalendar, getCityFromCoords } from '@/lib/api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HijriCalendarPage() {
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [location, setLocation] = useState<{ city: string, country: string } | null>(null);
  const [coords, setCoords] = useState<{ lat: number, lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [hijriAdjustment, setHijriAdjustment] = useState(0);

  // Load persistence
  useEffect(() => {
    const saved = localStorage.getItem('vlognest_azan_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHijriAdjustment(parsed.hijriAdjustment ?? 0);
      } catch (e) {}
    }
  }, []);

  const fetchCalendar = useCallback(async (lat: number, lon: number, adj: number) => {
    setLoading(true);
    try {
      const response = await getHijriCalendar(viewDate.getFullYear(), viewDate.getMonth() + 1, lat, lon, adj);
      setCalendarData(response.data);
      
      if (!location) {
        const cityResponse = await getCityFromCoords(lat, lon);
        setLocation({
          city: cityResponse.city || cityResponse.locality || "Unknown City",
          country: cityResponse.countryName || "Unknown Country"
        });
      }
    } catch (e) {
      setError("Failed to sync calendar data.");
    } finally {
      setLoading(false);
    }
  }, [viewDate, location]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported.");
      setLoading(false);
      return;
    }

    if (coords) {
      fetchCalendar(coords.lat, coords.lon, hijriAdjustment);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setCoords(c);
          fetchCalendar(c.lat, c.lon, hijriAdjustment);
        },
        () => {
          setError("Location access required for accurate Hijri dates.");
          setLoading(false);
        }
      );
    }
  }, [fetchCalendar, hijriAdjustment, coords]);

  const handleAdjust = (val: number) => {
    const newVal = hijriAdjustment + val;
    setHijriAdjustment(newVal);
    // Save to global config
    const saved = localStorage.getItem('vlognest_azan_config');
    let config = saved ? JSON.parse(saved) : {};
    config.hijriAdjustment = newVal;
    localStorage.setItem('vlognest_azan_config', JSON.stringify(config));
  };

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate);
    next.setMonth(viewDate.getMonth() + offset);
    setViewDate(next);
  };

  const isRegionalCommon = location?.country?.toLowerCase() === 'india' || location?.country?.toLowerCase() === 'pakistan';

  const currentHijriMonth = calendarData[0]?.hijri?.month?.en;
  const currentHijriYear = calendarData[0]?.hijri?.year;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-10 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/more')} className="rounded-2xl h-12 w-12 border-zinc-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">Hijri Calendar</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Lunar Node Synchronization</p>
          </div>
        </div>
        
        {location && (
          <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-2xl border border-zinc-100">
            <MapPin className="w-4 h-4 text-zinc-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{location.city}, {location.country}</span>
          </div>
        )}
      </header>

      {error ? (
        <Card className="bg-red-50 border-red-100 text-red-900 rounded-[2rem] p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 mx-auto text-red-500" />
          <p className="font-bold text-sm">{error}</p>
          <Button variant="outline" className="border-red-200 text-red-600 font-bold" onClick={() => window.location.reload()}>Retry Access</Button>
        </Card>
      ) : loading && calendarData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-6">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-zinc-200" />
            <Moon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Aligning Lunar Cycles...</p>
        </div>
      ) : (
        <>
          {/* Helpful guidance for users in India/Pakistan where sightings often differ */}
          {isRegionalCommon && hijriAdjustment === 0 && (
            <div className="bg-zinc-900 text-white p-6 rounded-[2rem] flex items-center justify-between gap-6 shadow-xl animate-in slide-in-from-top duration-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Info className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold">Regional Sighting Detected</p>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">In {location?.country}, the Hijri date often follows local moon sightings. If today's date feels ahead, you can adjust it below.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-9 rounded-xl border-white/20 text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black" onClick={() => handleAdjust(-1)}>
                Shift -1 Day
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 space-y-6">
              <Card className="border-none bg-white shadow-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4 border-b border-zinc-50 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-zinc-900">{viewDate.toLocaleString('default', { month: 'long' })} {viewDate.getFullYear()}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{currentHijriMonth} {currentHijriYear} AH</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} className="rounded-xl h-10 w-10"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => changeMonth(1)} className="rounded-xl h-10 w-10"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-8">
                  <div className="grid grid-cols-7 border-b border-zinc-50">
                    {WEEKDAYS.map(day => (
                      <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-zinc-300">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 mt-2">
                    {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {calendarData.map((day, i) => {
                      const isToday = new Date().toDateString() === new Date(day.gregorian.date).toDateString();
                      return (
                        <div key={i} className={cn(
                          "aspect-square p-1 flex flex-col items-center justify-center relative transition-all group",
                          isToday ? "bg-zinc-900 text-white rounded-2xl shadow-xl z-10 scale-105" : "hover:bg-zinc-50 rounded-2xl"
                        )}>
                          <span className="text-xs sm:text-lg font-bold">{day.gregorian.day}</span>
                          <span className={cn(
                            "text-[8px] sm:text-[10px] font-black uppercase tracking-tighter mt-0.5",
                            isToday ? "text-emerald-400" : "text-zinc-400"
                          )}>
                            {day.hijri.day} {day.hijri.month.en.substring(0, 3)}
                          </span>
                          {day.hijri.holidays.length > 0 && (
                            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-4 space-y-6">
              <Card className="border-none bg-zinc-50 rounded-[2.5rem] shadow-inner overflow-hidden sticky top-24">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-900 rounded-xl">
                      <Settings2 className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-sm font-bold uppercase tracking-widest">Regional Tuning</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Hijri Correction</span>
                      <Badge variant="outline" className="text-[8px] border-zinc-200">Local Sync</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl bg-white shadow-sm" onClick={() => handleAdjust(-1)}><Minus className="h-4 w-4" /></Button>
                      <div className="flex-1 text-center bg-white border border-zinc-200 rounded-xl h-12 flex items-center justify-center font-black text-sm">
                        {hijriAdjustment > 0 ? '+' : ''}{hijriAdjustment} Days
                      </div>
                      <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl bg-white shadow-sm" onClick={() => handleAdjust(1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-[9px] text-zinc-400 leading-relaxed italic">
                      Use this to align the app with your local moon sighting (e.g., set to -1 for India/Pakistan if required).
                    </p>
                  </div>

                  <Separator className="bg-zinc-200/50" />

                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Node</span>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-600">Month</span>
                        <span className="text-xs font-black text-zinc-900">{calendarData[0]?.hijri?.month?.en}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-600">Year</span>
                        <span className="text-xs font-black text-zinc-900">{calendarData[0]?.hijri?.year} AH</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Footer Info */}
      <footer className="pt-8">
        <div className="bg-zinc-900 rounded-[2.5rem] p-8 border border-zinc-800 flex items-start gap-6 shadow-2xl">
          <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
            <ShieldCheck className="w-6 h-6 text-zinc-500" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Methodology Note</p>
            <p className="text-xs font-medium text-zinc-400 leading-relaxed">
              VlogNest utilizes astronomical calculations for default lunar mapping. Because the Hijri calendar is inherently visual and regional, manual adjustments are provided to ensure 100% compliance with your local Sharia committee or moon sighting council.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
