
"use client";

import { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Sun, 
  Moon, 
  ShieldCheck, 
  HandsPray, 
  Heart, 
  Zap,
  Info,
  Copy,
  Share2,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  { id: 'all', label: 'All Duas', icon: BookOpen },
  { id: 'morning', label: 'Morning & Evening', icon: Sun },
  { id: 'sleep', label: 'Sleep & Protection', icon: Moon },
  { id: 'prayer', label: 'Prayer Essentials', icon: Zap },
  { id: 'life', label: 'Daily Life', icon: Heart },
];

const DUAS = [
  {
    id: 'm-1',
    category: 'morning',
    title: 'Morning Remembrance',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Asbahna wa-asbahal-mulku lillahi wal-hamdu lillahi, la ilaha illallahu wahdahu la sharika lahu',
    translation: 'We have reached the morning and at this very time unto Allah belongs all sovereignty, and all praise is for Allah. There is no God but Allah, alone, without partner.',
    reference: 'Muslim 4/2088'
  },
  {
    id: 's-1',
    category: 'sleep',
    title: 'Before Sleeping',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa-ahya',
    translation: 'In Your name, O Allah, I die and I live.',
    reference: 'Al-Bukhari 11/113'
  },
  {
    id: 'p-1',
    category: 'prayer',
    title: 'Opening Supplication',
    arabic: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَهَ غَيْرُكَ',
    transliteration: 'Subhanakal-lahumma wa bihamdika, wa tabarakas-muka wa ta\'ala jadduka, wa la ilaha ghayruka',
    translation: 'Glory is to You O Allah, and all praise. Blessed is Your name and Exalted is Your majesty. There is no God but You.',
    reference: 'Abu Dawud, Ibn Majah'
  },
  {
    id: 'l-1',
    category: 'life',
    title: 'Before Eating',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    translation: 'In the name of Allah.',
    reference: 'Abu Dawud 3/347'
  },
  {
    id: 'l-2',
    category: 'life',
    title: 'Entering the Masjid',
    arabic: 'بِسْمِ اللَّهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Bismillahi, wassalatu wassalamu \'ala Rasulillahi, Allahummaf-tah li abwaba rahmatik',
    translation: 'In the name of Allah, and prayers and peace be upon the Messenger of Allah. O Allah, open the gates of Your mercy for me.',
    reference: 'Muslim 1/494'
  }
];

export default function DuasPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredDuas = DUAS.filter(dua => {
    const matchesSearch = dua.title.toLowerCase().includes(search.toLowerCase()) || 
                         dua.translation.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || dua.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to Clipboard" });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-10 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/more')} className="rounded-2xl h-12 w-12 border-zinc-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">Duas & Adhkars</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Fortress of the Muslim</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300" />
          <Input 
            placeholder="Search supplications..." 
            className="pl-11 rounded-2xl bg-zinc-50 border-zinc-100 h-12 font-bold focus-visible:ring-zinc-900 shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Category Toggles */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-3 border shadow-sm",
              activeCategory === cat.id 
                ? "bg-zinc-900 text-white border-zinc-900 shadow-xl" 
                : "bg-white text-zinc-400 border-zinc-100 hover:border-zinc-300"
            )}
          >
            <cat.icon className={cn("w-4 h-4", activeCategory === cat.id && "fill-white/10")} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Duas Feed */}
      <div className="space-y-8">
        {filteredDuas.length > 0 ? filteredDuas.map((dua) => (
          <Card key={dua.id} className="border-none bg-white shadow-xl rounded-[2.5rem] overflow-hidden group">
            <CardHeader className="p-8 pb-4 bg-zinc-50/50 border-b border-zinc-100 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-zinc-200 text-zinc-400">
                  {dua.category}
                </Badge>
                <CardTitle className="text-lg font-bold tracking-tight text-zinc-900">{dua.title}</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-zinc-300 hover:text-zinc-900" onClick={() => handleCopy(`${dua.arabic}\n\n${dua.translation}`)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-zinc-300 hover:text-zinc-900">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 sm:p-12 space-y-10">
              {/* Arabic */}
              <div className="text-right">
                <p className="font-arabic text-3xl sm:text-5xl text-zinc-900 leading-[2.5] sm:leading-[2.2]" dir="rtl">
                  {dua.arabic}
                </p>
              </div>

              {/* Transliteration & Translation */}
              <div className="space-y-6 pt-8 border-t border-dashed border-zinc-100">
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 flex items-center gap-2">
                    <Type className="w-3 h-3" /> Transliteration
                  </span>
                  <p className="text-sm font-medium text-zinc-500 italic leading-relaxed">
                    {dua.transliteration}
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Translation
                  </span>
                  <p className="text-lg font-bold text-zinc-700 leading-relaxed">
                    {dua.translation}
                  </p>
                </div>
              </div>

              {/* Reference */}
              <div className="pt-6 border-t border-zinc-50 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> {dua.reference}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-200">VlogNest Library</span>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="py-20 text-center bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-100">
            <BookOpen className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">No matching supplications found</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="pt-10">
        <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 flex items-start gap-6 shadow-2xl">
          <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
            <Info className="w-6 h-6 text-zinc-500" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Scholarly Accuracy</p>
            <p className="text-xs font-medium text-zinc-400 leading-relaxed">
              Our library is based on the verified records of Hisnul Muslim. We recommend consulting with local scholars for deeper linguistic and spiritual context.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
