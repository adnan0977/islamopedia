"use client";

import { 
  Clock, 
  Compass, 
  BookOpen, 
  Bell, 
  CalendarDays, 
  MessageCircle, 
  Calculator, 
  Activity, 
  MapPin, 
  Moon, 
  Tv, 
  BrainCircuit, 
  Users, 
  Settings,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const features = [
  { id: 'prayer', label: 'Precise Prayer Times', description: 'Location-based timings including Imsak and Shuruq.', icon: Clock, category: 'Essentials', href: '/prayer-times' },
  { id: 'qibla', label: 'Qibla Finder', description: 'Digital compass to locate the direction of the Kaaba.', icon: Compass, category: 'Essentials', href: '/qibla' },
  { id: 'quran', label: 'The Holy Quran', description: 'Arabic script with multi-language translations and audio.', icon: BookOpen, category: 'Scripture', href: '/quran' },
  { id: 'azan', label: 'Azan Notifications', description: 'Customizable alerts with various Muezzin voices.', icon: Bell, category: 'Essentials', href: '/prayer-times' },
  { id: 'hijri', label: 'Hijri Calendar', description: 'Lunar calendar highlighting important Islamic dates.', icon: CalendarDays, category: 'Tools', href: '/hijri-calendar' },
  { id: 'duas', label: 'Duas & Adhkar', description: 'Categorized library of supplications for daily activities.', icon: MessageCircle, category: 'Spiritual', href: '/duas' },
  { id: 'zakat', label: 'Zakat Calculator', description: 'Calculate annual charity based on assets and savings.', icon: Calculator, category: 'Tools', href: '/zakat' },
  { id: 'tasbih', label: 'Tasbih Counter', description: 'Digital counter for dhikr with haptic feedback.', icon: Activity, category: 'Spiritual', href: '/tasbih' },
  { id: 'halal', label: 'Halal & Mosque Locator', description: 'Find nearby Halal restaurants and Masjids.', icon: MapPin, category: 'Community' },
  { id: 'ramadan', label: 'Ramadan Planner', description: 'Fasting trackers, Suhoor/Iftar timings, and progress.', icon: Moon, category: 'Tools' },
  { id: 'live', label: 'Live Streams', description: 'Direct video feeds from Makkah and Madinah.', icon: Tv, category: 'Community', href: '/live' },
  { id: 'quiz', label: 'Knowledge Quizzes', description: 'Gamified modules to test Islamic history and Fiqh.', icon: BrainCircuit, category: 'Learning' },
  { id: 'qa', label: 'Community Q&A', description: 'Ask questions or access a database of reputable fatwas.', icon: Users, category: 'Community' },
  { id: 'settings', label: 'Accessibility & Display', description: 'Dark mode and adjustable font sizes for better reading.', icon: Settings, category: 'System', href: '/display-settings' },
];

export default function MorePage() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-12 max-w-6xl pb-32 lg:pb-12 animate-in fade-in duration-700">
      <header className="space-y-4 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-4">
          <div className="p-3 bg-zinc-900 text-white rounded-2xl shadow-xl">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-zinc-900 uppercase">Core Essentials</h1>
        </div>
        <p className="text-zinc-500 max-w-2xl text-lg font-medium leading-relaxed">
          Explore the foundational tools and spiritual resources designed for a professional Islamic lifestyle.
        </p>
      </header>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: any }) {
  const CardWrapper = feature.href ? Link : 'div';
  const Icon = feature.icon;

  return (
    <CardWrapper href={feature.href || '#'}>
      <Card className={cn(
        "group border border-zinc-100 bg-white shadow-sm hover:border-zinc-900 hover:shadow-xl transition-all duration-500 rounded-[1.5rem] overflow-hidden h-full flex flex-col",
        !feature.href && "cursor-default opacity-80"
      )}>
        <CardContent className="p-4 sm:p-8 space-y-4 flex-1 flex flex-col">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-inner">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            {feature.href ? (
              <ChevronRight className="h-4 w-4 text-zinc-200 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
            ) : (
              <Badge variant="secondary" className="text-[7px] font-black uppercase tracking-widest bg-zinc-50 text-zinc-400">Roadmap</Badge>
            )}
          </div>
          
          <div className="space-y-1 sm:space-y-2 flex-1">
            <h3 className="text-sm sm:text-lg font-bold tracking-tight text-zinc-900 leading-tight">{feature.label}</h3>
            <p className="text-[10px] sm:text-sm text-zinc-500 font-medium leading-relaxed line-clamp-2">
              {feature.description}
            </p>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-dashed border-zinc-100 mt-auto">
            <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-zinc-300">
              {feature.category}
            </span>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}