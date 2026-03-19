
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, 
  Compass, 
  MapPin, 
  Navigation, 
  RefreshCw,
  Info,
  ShieldCheck,
  AlertTriangle,
  Locate
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

export default function QiblaPage() {
  const router = useRouter();
  
  // State
  const [heading, setHeading] = useState(0); // Compass Heading
  const [qiblaDir, setQiblaDir] = useState<number | null>(null); // Target Qibla Bearing
  const [location, setLocation] = useState<{lat: number, lon: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [requiresPermission, setRequiresPermission] = useState(false);
  const [isHapticEnabled] = useState(true);

  // Refs
  const headingRef = useRef(0);

  // Calculation Logic
  const calculateQibla = useCallback((lat: number, lon: number) => {
    const phi1 = lat * (Math.PI / 180);
    const phi2 = KAABA_LAT * (Math.PI / 180);
    const lambda1 = lon * (Math.PI / 180);
    const lambda2 = KAABA_LON * (Math.PI / 180);

    const y = Math.sin(lambda2 - lambda1);
    const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(lambda2 - lambda1);
    
    let qibla = Math.atan2(y, x) * (180 / Math.PI);
    return (qibla + 360) % 360;
  }, []);

  // Haptic Feedback
  const triggerHaptic = useCallback(async () => {
    if (!isHapticEnabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if ('vibrate' in navigator) navigator.vibrate(20);
    }
  }, [isHapticEnabled]);

  // Orientation Handler
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    let compass = 0;
    
    // iOS Support
    if ((event as any).webkitCompassHeading) {
      compass = (event as any).webkitCompassHeading;
    } 
    // Android / Standard support
    else if (event.alpha !== null) {
      compass = 360 - event.alpha;
    }

    setHeading(compass);
    
    // Logic to vibrate when aligned
    if (qiblaDir !== null) {
      const diff = Math.abs(compass - qiblaDir);
      if (diff < 2 || diff > 358) {
        // Debounced vibration could be added here
      }
    }
  }, [qiblaDir]);

  // Permission Request (iOS)
  const requestPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
          setRequiresPermission(false);
          setIsCalibrating(false);
        }
      } catch (e) {
        setError("Motion sensor access denied.");
      }
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
      setIsCalibrating(false);
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    // 1. Get Location
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lon: longitude });
        setQiblaDir(calculateQibla(latitude, longitude));
      },
      (err) => {
        setError("Please enable location services to calculate Qibla direction.");
      },
      { enableHighAccuracy: true }
    );

    // 2. Check for Orientation Support & Permissions
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setRequiresPermission(true);
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
      // Fallback timer to stop calibration if no event fires
      const timer = setTimeout(() => setIsCalibrating(false), 2000);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [calculateQibla, handleOrientation]);

  const rotation = qiblaDir !== null ? (qiblaDir - heading) : 0;
  const isAligned = qiblaDir !== null && (Math.abs(heading - qiblaDir) < 5 || Math.abs(heading - qiblaDir) > 355);

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg min-h-[90vh] flex flex-col space-y-8 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/more')} className="rounded-2xl h-12 w-12 border-zinc-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">Qibla Finder</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Precision Compass</p>
          </div>
        </div>
        
        <div className="h-10 w-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
          <ShieldCheck className="h-5 w-5 text-zinc-400" />
        </div>
      </header>

      {/* Main Compass Area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        {error ? (
          <Card className="bg-red-50 border-red-100 text-red-900 rounded-[2rem] p-8 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 mx-auto text-red-500" />
            <p className="font-bold text-sm leading-relaxed">{error}</p>
            <Button variant="outline" className="border-red-200 text-red-600 font-bold rounded-xl" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry Access
            </Button>
          </Card>
        ) : requiresPermission ? (
          <div className="text-center space-y-8">
            <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl">
              <Navigation className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-zinc-900">Sensor Access</h2>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">VlogNest requires access to your device's orientation sensors to locate the Qibla.</p>
            </div>
            <Button className="h-14 px-10 rounded-2xl bg-zinc-900 text-white font-bold shadow-xl" onClick={requestPermission}>
              Enable Compass
            </Button>
          </div>
        ) : (
          <>
            {/* Degree Readout */}
            <div className="text-center space-y-1">
              <p className={cn(
                "text-5xl font-black tracking-tighter transition-colors duration-500",
                isAligned ? "text-emerald-600" : "text-zinc-900"
              )}>
                {Math.round(heading)}°
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Heading</p>
            </div>

            {/* Visual Compass */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full border-[12px] border-zinc-50 shadow-inner" />
              
              {/* Target Pointer (Fixed at top, ring rotates) */}
              <div className="absolute -top-4 z-20 flex flex-col items-center">
                <div className="w-1 h-8 bg-zinc-900 rounded-full shadow-lg" />
                <Badge className={cn(
                  "mt-2 text-[8px] font-black uppercase tracking-widest border-none transition-colors",
                  isAligned ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"
                )}>
                  {isAligned ? 'Target Locked' : 'Searching'}
                </Badge>
              </div>

              {/* Rotating Compass Disc */}
              <div 
                className="relative w-full h-full rounded-full transition-transform duration-100 ease-out shadow-2xl"
                style={{ transform: `rotate(${-heading}deg)` }}
              >
                {/* Cardinal Points */}
                <span className="absolute top-6 left-1/2 -translate-x-1/2 font-black text-zinc-900">N</span>
                <span className="absolute bottom-6 left-1/2 -translate-x-1/2 font-black text-zinc-400">S</span>
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-zinc-400">W</span>
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-zinc-400">E</span>

                {/* Qibla Direction Marker */}
                {qiblaDir !== null && (
                  <div 
                    className="absolute inset-0 flex items-start justify-center p-2"
                    style={{ transform: `rotate(${qiblaDir}deg)` }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center shadow-xl rotate-45 border-2 border-white">
                        <Navigation className="w-4 h-4 text-white -rotate-45" />
                      </div>
                      <span className="text-[8px] font-black text-zinc-900 uppercase tracking-widest mt-2">Qibla</span>
                    </div>
                  </div>
                )}

                {/* Tick Marks */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute inset-0 p-1"
                    style={{ transform: `rotate(${i * 30}deg)` }}
                  >
                    <div className="w-0.5 h-3 bg-zinc-100 mx-auto rounded-full" />
                  </div>
                ))}
              </div>

              {/* Inner Decoration */}
              <div className="absolute w-12 h-12 bg-white rounded-full border border-zinc-100 shadow-sm z-10 flex items-center justify-center">
                <div className="w-2 h-2 bg-zinc-900 rounded-full" />
              </div>
            </div>

            {/* Location Data */}
            <div className="w-full space-y-4">
              <div className="flex justify-center gap-2">
                <Card className="bg-zinc-50 border-none rounded-2xl shadow-inner flex-1">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Target Bearing</span>
                    <span className="text-sm font-bold text-zinc-900">{qiblaDir !== null ? Math.round(qiblaDir) : '--'}°</span>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-50 border-none rounded-2xl shadow-inner flex-1">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Status</span>
                    <span className={cn("text-sm font-bold", isAligned ? "text-emerald-600" : "text-zinc-900")}>
                      {isAligned ? 'Aligned' : 'Align Device'}
                    </span>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                <MapPin className="w-3 h-3" />
                {location ? `${location.lat.toFixed(4)}° N, ${location.lon.toFixed(4)}° E` : 'Locating...'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info Footer */}
      <footer className="space-y-4">
        <Card className="bg-zinc-900 border-none rounded-3xl overflow-hidden shadow-2xl">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <Info className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Alignment Guidance</p>
              <p className="text-xs font-medium text-zinc-300 leading-relaxed">
                Hold your device flat and move away from magnetic interference (magnets, metal, or other electronics) for the most accurate direction.
              </p>
            </div>
          </CardContent>
        </Card>
      </footer>
    </div>
  );
}
