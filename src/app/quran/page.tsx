
"use client";

import { useEffect, useState } from 'react';
import { getQuranSurahs, getSurahDetails } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Book, Loader2, PlayCircle, PauseCircle, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function QuranPage() {
  const [surahs, setSurahs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [playingAyat, setPlayingAyat] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      const data = await getQuranSurahs();
      setSurahs(data.data);
      setLoading(false);
    }
    init();
  }, []);

  const selectSurah = async (id: number) => {
    setLoadingDetails(true);
    try {
      const data = await getSurahDetails(id);
      setSelectedSurah({
        info: surahs.find(s => s.number === id),
        ayats: data.data[0].ayahs,
        translation: data.data[1].ayahs,
        audio: data.data[2].ayahs
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredSurahs = surahs.filter(s => 
    s.englishName.toLowerCase().includes(search.toLowerCase()) || 
    s.name.includes(search)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 h-auto md:h-[calc(100vh-120px)] flex flex-col space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          {selectedSurah && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={() => setSelectedSurah(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-accent">Quran Majeed</h1>
            <p className="text-muted-foreground text-xs md:text-sm">Read, listen, and contemplate.</p>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search Surah..." 
            className="pl-10 bg-card border-border h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Surah List */}
        <div className={cn(
          "md:col-span-4 flex flex-col space-y-4 h-full",
          selectedSurah ? "hidden md:flex" : "flex"
        )}>
          <ScrollArea className="flex-1 bg-card rounded-2xl border border-border p-2">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-1">
                {filteredSurahs.map((surah) => (
                  <button
                    key={surah.number}
                    onClick={() => selectSurah(surah.number)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl transition-all hover:bg-secondary text-left group",
                      selectedSurah?.info?.number === surah.number ? "bg-secondary ring-1 ring-primary" : ""
                    )}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center font-bold text-xs border border-border/50 group-hover:border-primary/50">
                        {surah.number}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{surah.englishName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{surah.revelationType} • {surah.numberOfAyahs} Ayahs</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-arabic text-primary">{surah.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Content Viewer */}
        <div className={cn(
          "md:col-span-8 flex flex-col min-h-0 h-full",
          selectedSurah ? "flex" : "hidden md:flex"
        )}>
          <Card className="flex-1 bg-card border-border flex flex-col overflow-hidden shadow-xl rounded-2xl">
            {!selectedSurah ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4 p-8">
                <Book className="w-16 h-16 opacity-20" />
                <p className="text-center text-sm">Select a surah to begin reading.</p>
              </div>
            ) : (
              <>
                <CardHeader className="border-b border-border bg-card/50 p-4 md:p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl md:text-2xl text-accent">{selectedSurah.info.englishName}</CardTitle>
                      <CardDescription className="text-xs md:text-sm">{selectedSurah.info.englishNameTranslation}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl md:text-3xl font-arabic text-primary">{selectedSurah.info.name}</p>
                    </div>
                  </div>
                </CardHeader>
                <ScrollArea className="flex-1 p-4 md:p-6">
                   {loadingDetails ? (
                     <div className="p-12 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="animate-spin text-primary w-8 h-8" />
                        <p className="text-sm text-muted-foreground">Loading verses...</p>
                     </div>
                   ) : (
                     <div className="space-y-10 md:space-y-12">
                       {selectedSurah.ayats.map((ayat: any, idx: number) => (
                         <div key={ayat.number} className="group space-y-6 pb-8 border-b border-border/50 last:border-none">
                            <div className="flex items-start justify-between gap-4">
                               <div className="flex flex-col gap-2">
                                 <Badge variant="outline" className="w-fit h-fit text-[10px]">
                                   {ayat.numberInSurah}
                                 </Badge>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-9 w-9 text-accent hover:bg-accent/10"
                                   onClick={() => {
                                      const audio = new Audio(selectedSurah.audio[idx].audio);
                                      if (playingAyat === ayat.number) {
                                        setPlayingAyat(null);
                                      } else {
                                        setPlayingAyat(ayat.number);
                                        audio.play();
                                        audio.onended = () => setPlayingAyat(null);
                                      }
                                   }}
                                 >
                                   {playingAyat === ayat.number ? <PauseCircle className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
                                 </Button>
                               </div>
                               <p className="flex-1 text-right text-2xl md:text-3xl font-arabic leading-loose text-primary">
                                 {ayat.text}
                               </p>
                            </div>
                            <div className="max-w-2xl bg-secondary/30 p-4 rounded-xl">
                               <p className="text-sm md:text-base text-foreground/80 leading-relaxed italic">
                                 {selectedSurah.translation[idx].text}
                               </p>
                            </div>
                         </div>
                       ))}
                     </div>
                   )}
                </ScrollArea>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
