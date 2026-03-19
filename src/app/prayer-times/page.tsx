
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Globe,
  Bell,
  BellOff,
  Volume2,
  Mic2,
  Settings2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getPrayerTimesByCoords, getCityFromCoords } from '@/lib/api';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useToast } from '@/hooks/use-toast';

const PRAYERS = [
  { key: 'Fajr', label: 'Fajr', description: 'Pre-dawn' },
  { key: 'Sunrise', label: 'Sunrise', description: 'Shuruq' },
  { key: 'Dhuhr', label: 'Dhuhr', description: 'Noon' },
  { key: 'Asr', label: 'Asr', description: 'Afternoon' },
  { key: 'Maghrib', label: 'Maghrib', description: 'Sunset' },
  { key: 'Isha', label: 'Isha', description: 'Night' },
];

const MUEZZINS = [
  { id: 'makkah', name: 'Sheikh Ali Mulla', origin: 'Makkah', url: 'https://www.islamicfinder.org/prayer-times/azan/makkah.mp3' },
  { id: 'madinah', name: 'Masjid an-Nabawi', origin: 'Madinah', url: 'https://www.islamicfinder.org/prayer-times/azan/madina.mp3' },
  { id: 'aqsa', name: 'Al-Aqsa', origin: 'Jerusalem', url: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3' }, // Placeholder fallback
  { id: 'egypt', name: 'Traditional', origin: 'Egypt', url: 'https://www.islamicfinder.org/prayer-times/azan/egypt.mp3' },
];

export default function PrayerTimesPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [timings, setTimings] = useState<any>(null);
  const [dateInfo, setDateInfo] = useState<any>(null);
  const [location, setLocation] = useState<{ city: string, country: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Azan Config State
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [activePrayers, setActivePrayers] = useState<Record<string, boolean>>({
    Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true
  });
  const [selectedMuezzinId, setSelectedMuezzinId] = useState(MUEZZINS[0].id);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('vlognest_azan_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotificationEnabled(parsed.enabled ?? false);
        setActivePrayers(parsed.activePrayers ?? activePrayers);
        setSelectedMuezzinId(parsed.muezzinId ?? MUEZZINS[0].id);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vlognest_azan_config', JSON.stringify({
      enabled: notificationEnabled,
      activePrayers,
      muezzinId: selectedMuezzinId
    }));
    if (notificationEnabled && timings) {
      scheduleNotifications();
    }
  }, [notificationEnabled, activePrayers, selectedMuezzinId, timings]);

  // Check permissions
  useEffect(() => {
    const checkPerms = async () => {
      try {
        const perm = await LocalNotifications.checkPermissions();
        setIsPermissionGranted(perm.display === 'granted');
      } catch (e) {
        // Fallback for non-capacitor
        if ("Notification" in window) {
          setIsPermissionGranted(Notification.permission === 'granted');
        }
      }
    };
    checkPerms();
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      checkAndPlayAzan(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [timings, activePrayers, notificationEnabled, selectedMuezzinId]);

  const checkAndPlayAzan = (now: Date) => {
    if (!timings || !notificationEnabled) return;
    
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    PRAYERS.forEach(p => {
      if (activePrayers[p.key] && timings[p.key] === timeStr && now.getSeconds() === 0) {
        triggerAzanAlert(p.label);
      }
    });
  };

  const triggerAzanAlert = (prayerName: string) => {
    // 1. Play Audio
    const muezzin = MUEZZINS.find(m => m.id === selectedMuezzinId) || MUEZZINS[0];
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(muezzin.url);
    audioRef.current = audio;
    audio.play().catch(e => console.error("Audio playback blocked", e));

    // 2. Browser Notification (UI)
    toast({
      title: `Time for ${prayerName}`,
      description: `The Azan is now playing. Hayya 'alas-Salah.`,
      duration: 10000,
    });
  };

  const scheduleNotifications = async () => {
    try {
      if (!isPermissionGranted) {
        const res = await LocalNotifications.requestPermissions();
        if (res.display !== 'granted') return;
        setIsPermissionGranted(true);
      }

      await LocalNotifications.cancel({ notifications: PRAYERS.map((_, i) => ({ id: i + 100 })) });

      const notifications = PRAYERS.filter(p => activePrayers[p.key]).map((p, i) => {
        const [h, m] = timings[p.key].split(':').map(Number);
        const scheduleDate = new Date();
        scheduleDate.setHours(h, m, 0, 0);
        
        // If time already passed today, schedule for tomorrow
        if (scheduleDate < new Date()) {
          scheduleDate.setDate(scheduleDate.getDate() + 1);
        }

        return {
          title: `Time for ${p.label}`,
          body: `It is now time for ${p.label} prayer in ${location?.city}.`,
          id: i + 100,
          schedule: { at: scheduleDate, repeats: true, every: 'day' as any },
          sound: 'azan.wav', // Needs to be in native resources for custom sound
          extra: { prayer: p.key }
        };
      });

      await LocalNotifications.schedule({ notifications });
    } catch (e) {
      console.warn("Capacitor Notifications not available", e);
    }
  };

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

  useEffect(() => {
    fetchTimings();
  }, [fetchTimings]);

  const getNextPrayer = () => {
    if (!timings) return null;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    const sortedPrayers = PRAYERS.map(p => {
      const [h, m] = timings[p.key].split(':').map(Number);
      return { ...p, timeInMinutes: h * 60 + m };
    });

    const next = sortedPrayers.find(p => p.timeInMinutes > now);
    return next || sortedPrayers[0];
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
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={fetchTimings} 
            disabled={loading}
            className="rounded-xl h-10 w-10 border-zinc-200"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
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

          {/* Azan Notification Configuration */}
          <Card className="border-none bg-zinc-50 rounded-[2rem] shadow-inner overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 rounded-xl">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                  <CardTitle className="text-sm font-bold">Azan Notifications</CardTitle>
                </div>
                <Switch 
                  checked={notificationEnabled} 
                  onCheckedChange={setNotificationEnabled} 
                />
              </div>
            </CardHeader>
            <CardContent className={cn(
              "p-6 pt-4 space-y-6 transition-all duration-500",
              !notificationEnabled && "opacity-40 grayscale pointer-events-none"
            )}>
              {/* Voice Selection */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Mic2 className="w-3 h-3" /> Muezzin Voice
                </Label>
                <Select value={selectedMuezzinId} onValueChange={setSelectedMuezzinId}>
                  <SelectTrigger className="bg-white border-zinc-200 rounded-xl h-12 font-bold shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-zinc-100 shadow-2xl">
                    {MUEZZINS.map(m => (
                      <SelectItem key={m.id} value={m.id} className="font-bold">
                        {m.name} ({m.origin})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Individual Prayer Toggles */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Settings2 className="w-3 h-3" /> Enabled Alerts
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PRAYERS.filter(p => p.key !== 'Sunrise').map(p => (
                    <button
                      key={p.key}
                      onClick={() => setActivePrayers(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                        activePrayers[p.key] 
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-md" 
                          : "bg-white text-zinc-400 border-zinc-200"
                      )}
                    >
                      {activePrayers[p.key] && <Check className="w-3 h-3" />}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {!isPermissionGranted && notificationEnabled && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">
                    System permission required to schedule background notifications on your phone.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timing Grid */}
          <div className="grid gap-3">
            {PRAYERS.map((p) => {
              const isActive = nextPrayer?.key === p.key;
              const isAlertEnabled = activePrayers[p.key];
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
                        {isActive ? <Volume2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-zinc-900">{p.label}</p>
                          {isAlertEnabled && p.key !== 'Sunrise' && (
                            <Bell className="w-3 h-3 text-zinc-300" />
                          )}
                        </div>
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
            Method: Muslim World League (MWL). Azan audio triggers precisely at the computed astronomical time. For background alerts, ensure system notifications are enabled for VlogNest.
          </p>
        </div>
      </footer>
    </div>
  );
}
