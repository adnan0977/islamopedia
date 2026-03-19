
"use client";

import { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Heart, 
  Zap,
  Info,
  Copy,
  Share2,
  ChevronRight,
  BookOpen,
  Type,
  X,
  Settings,
  Pencil,
  Check,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
    arabic: 'بِسْمِ اللَّهِ، وَالصَّلَاةُ وَالصَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Bismillahi, wassalatu wassalamu \'ala Rasulillahi, Allahummaf-tah li abwaba rahmatik',
    translation: 'In the name of Allah, and prayers and peace be upon the Messenger of Allah. O Allah, open the gates of Your mercy for me.',
    reference: 'Muslim 1/494'
  }
];

const SHARE_BACKGROUNDS = [
  { id: 'sacred', url: PlaceHolderImages.find(img => img.id === 'quran-bg')?.imageUrl || "https://picsum.photos/seed/sacred/1080/1080", label: 'Sacred' },
  { id: 'reflection', url: PlaceHolderImages.find(img => img.id === 'reflection-bg')?.imageUrl || "https://picsum.photos/seed/reflect/1080/1080", label: 'Glow' },
  { id: 'night', url: PlaceHolderImages.find(img => img.id === 'trending-1')?.imageUrl || "https://picsum.photos/seed/night/1080/1080", label: 'Night' }
];

export default function DuasPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Share State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [duaToShare, setDuaToShare] = useState<any>(null);
  const [shareConfig, setShareConfig] = useState({
    mode: 'both' as 'arabic' | 'translation' | 'both',
    bg: SHARE_BACKGROUNDS[0].url
  });
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [tempArabic, setTempArabic] = useState('');
  const [tempTranslation, setTempTranslation] = useState('');

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

  const handleOpenShare = (dua: any) => {
    setDuaToShare(dua);
    setTempArabic(dua.arabic || '');
    setTempTranslation(dua.translation || '');
    setIsEditingCard(false);
    setShareDialogOpen(true);
  };

  const handleCopyShareText = () => {
    if (!duaToShare) return;
    const arabic = tempArabic || duaToShare.arabic || '';
    const trans = tempTranslation || duaToShare.translation || '';
    
    let text = `Dua Reflection:\n`;
    if (shareConfig.mode === 'both' || shareConfig.mode === 'arabic') text += `${arabic}\n\n`;
    if (shareConfig.mode === 'both' || shareConfig.mode === 'translation') text += `${trans}\n\n`;
    
    text += `Source: VlogNest Library\n\nShared via VlogNest`;
    
    navigator.clipboard.writeText(text.trim());
    toast({ title: "Copied to Clipboard" });
  };

  const getShareFontSize = () => {
    if (!duaToShare) return { arabic: 'text-2xl', translation: 'text-lg' };
    const arabicLen = tempArabic.length || 0;
    const transLen = tempTranslation.length || 0;
    const totalLen = (shareConfig.mode === 'both' ? (arabicLen + transLen) : shareConfig.mode === 'arabic' ? arabicLen : transLen);

    if (totalLen > 600) return { arabic: 'text-lg', translation: 'text-xs' };
    if (totalLen > 300) return { arabic: 'text-xl', translation: 'text-sm' };
    if (totalLen > 150) return { arabic: 'text-2xl', translation: 'text-base' };
    return { arabic: 'text-4xl', translation: 'text-xl' };
  };

  const fontSizes = getShareFontSize();

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
                <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-zinc-300 hover:text-zinc-900" onClick={() => handleOpenShare(dua)}>
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

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-4xl bg-zinc-50 border-none rounded-[3rem] p-0 overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto max-h-[95vh]">
          <div className="flex-1 p-8 sm:p-12 space-y-10 overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between space-y-0 text-left">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold tracking-tight">Generate Card</DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 font-black uppercase tracking-widest">Share Prophetic Dua</DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShareDialogOpen(false)} className="rounded-full h-10 w-10 md:hidden">
                <X className="w-5 h-5" />
              </Button>
            </DialogHeader>

            {/* The Square Visual Card */}
            <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white transition-all duration-1000 mx-auto max-w-[500px]">
              <Image 
                src={shareConfig.bg} 
                alt="Background" 
                fill 
                className="object-cover transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[1px]" />
              
              <div className="absolute inset-0 p-4 sm:p-6 flex flex-col h-full">
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2">
                  {(shareConfig.mode === 'both' || shareConfig.mode === 'arabic') && (
                    <p className={cn("font-arabic text-white leading-[2.5] drop-shadow-2xl", fontSizes.arabic)} dir="rtl">
                      {tempArabic}
                    </p>
                  )}
                  {(shareConfig.mode === 'both' || shareConfig.mode === 'translation') && (
                    <p className={cn("text-zinc-200 font-medium leading-relaxed max-w-md line-clamp-[12] italic", fontSizes.translation)}>
                      "{tempTranslation}"
                    </p>
                  )}
                </div>
                
                <div className="pt-3 border-t border-white/10 w-full flex items-center justify-between gap-3 shrink-0">
                  <Badge variant="secondary" className="bg-white/10 text-white border-none rounded-full px-3 py-0.5 text-[8px] font-black uppercase tracking-widest">
                    {duaToShare?.title}
                  </Badge>
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em]">VlogNest</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="w-full md:w-96 bg-white border-l border-zinc-100 p-8 sm:p-10 flex flex-col shrink-0 overflow-y-auto">
            {isEditingCard && (
              <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-3">
                  <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Refine Original</Label>
                  <Textarea 
                    value={tempArabic} 
                    onChange={(e) => setTempArabic(e.target.value)}
                    className="font-arabic text-right min-h-[120px] bg-zinc-50 border-zinc-100 rounded-xl text-lg p-4 leading-[2.2]"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Refine Translation</Label>
                  <Textarea 
                    value={tempTranslation} 
                    onChange={(e) => setTempTranslation(e.target.value)}
                    className="min-h-[120px] bg-zinc-50 border-zinc-100 rounded-xl text-sm p-4 leading-relaxed"
                  />
                </div>
              </div>
            )}

            <div className="flex-1" />
            
            <section className="space-y-6 mt-auto">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Workbench Controls</h3>
              </div>
              
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Content</Label>
                  <Select 
                    value={shareConfig.mode} 
                    onValueChange={(val: any) => setShareConfig({ ...shareConfig, mode: val })}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl border-zinc-200 font-bold bg-zinc-50/50 px-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                      <SelectItem value="both" className="font-bold">Original & Trans</SelectItem>
                      <SelectItem value="arabic" className="font-bold">Arabic Script</SelectItem>
                      <SelectItem value="translation" className="font-bold">Translation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-2">
                  <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Theme</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-11 rounded-xl border-zinc-200 font-bold justify-start gap-2 overflow-hidden bg-zinc-50/50 px-2">
                        <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 border border-zinc-100">
                          <Image src={shareConfig.bg} alt="Current" width={20} height={20} className="object-cover" />
                        </div>
                        <span className="flex-1 text-left truncate text-[10px]">
                          {SHARE_BACKGROUNDS.find(bg => bg.url === shareConfig.bg)?.label || 'Theme'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 rounded-[1.5rem] border-zinc-100 shadow-2xl" align="end" sideOffset={10}>
                      <div className="grid grid-cols-1 gap-2">
                        {SHARE_BACKGROUNDS.map((bg) => (
                          <button 
                            key={bg.id}
                            onClick={() => setShareConfig({ ...shareConfig, bg: bg.url })}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-zinc-50 w-full text-left",
                              shareConfig.bg === bg.url ? "bg-zinc-50 ring-1 ring-zinc-900/5" : ""
                            )}
                          >
                            <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 border border-zinc-100">
                              <Image src={bg.url} alt={bg.label} fill className="object-cover" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[11px] font-bold text-zinc-900">{bg.label}</p>
                              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Background</p>
                            </div>
                            {shareConfig.bg === bg.url && <Check className="w-4 h-4 text-zinc-900" />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Button 
                    variant={isEditingCard ? "default" : "outline"}
                    size="icon"
                    className={cn("h-11 w-11 rounded-xl border-zinc-200 transition-all shadow-sm", isEditingCard && "bg-zinc-900 text-white")}
                    onClick={() => setIsEditingCard(!isEditingCard)}
                    title="Refine Text"
                  >
                    <Pencil className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Button 
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-xl border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 active:scale-95 transition-all"
                    onClick={handleCopyShareText}
                    title="Copy Text"
                  >
                    <Copy className="w-5 h-5 text-zinc-600" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Button 
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-xl border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 active:scale-95 transition-all"
                    title="Download Card"
                  >
                    <Download className="w-5 h-5 text-zinc-600" />
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

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
