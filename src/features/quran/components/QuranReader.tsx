
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, BookOpen, LayoutList, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { AyatFrame } from '@/components/quran/AyatFrame';

export function QuranReader() {
  const db = useFirestore();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'ayat' | 'page'>('page');
  const [loadingContent, setLoadingContent] = useState(false);
  const [quranData, setQuranData] = useState<{ arabic: any[], trans: any[] }>({ arabic: [], trans: [] });
  const [selectedEdition, setSelectedEdition] = useState('en.sahih');

  const editionsRef = useMemoFirebase(() => collection(db, 'quran_editions'), [db]);
  const { data: editions } = useCollection(editionsRef);

  // Fetch global settings for Ayat Frame style
  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'app_config'), [db]);
  const { data: settings } = useDoc(settingsRef);
  const ayatFrameId = settings?.ayatFrameId || 'royal-ornate';
  const customAyatFramePath = settings?.customAyatFramePath;
  const frameImageUrl = settings?.frameImageUrl;

  useEffect(() => {
    async function fetchPage() {
      setLoadingContent(true);
      try {
        const q = query(collection(db, 'quran'), where('pages', 'array-contains', currentPage));
        const snapshots = await getDocs(q);
        const pageArabic: any[] = [];
        const pageTrans: any[] = [];

        snapshots.forEach(doc => {
          const s = doc.data();
          s.ayats.forEach((a: any) => {
            if (a.page === currentPage) {
              if (s.editionId === 'quran-uthmani') pageArabic.push({ ...a, surah: { number: s.surahNumber, name: s.name, englishName: s.englishName } });
              if (s.editionId === selectedEdition) pageTrans.push(a);
            }
          });
        });
        
        // Ensure sorting by ayat number if they came from different surahs on same page
        pageArabic.sort((a, b) => (a.numberInSurah - b.numberInSurah));
        
        setQuranData({ arabic: pageArabic, trans: pageTrans });
      } catch (e) { console.error(e); } finally { setLoadingContent(false); }
    }
    fetchPage();
  }, [currentPage, selectedEdition, db]);

  const groupedAyats = useMemo(() => {
    const groups: any[] = [];
    quranData.arabic.forEach((ayat, idx) => {
      const last = groups[groups.length - 1];
      if (!last || last.surah.number !== ayat.surah.number) {
        groups.push({ surah: ayat.surah, ayats: [{ ...ayat, trans: quranData.trans[idx]?.translationText }] });
      } else {
        last.ayats.push({ ...ayat, trans: quranData.trans[idx]?.translationText });
      }
    });
    return groups;
  }, [quranData]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-120px)] flex flex-col space-y-6">
      <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="flex items-center gap-4">
          <AyatFrame 
            number={groupedAyats[0]?.surah.number || 1} 
            frameId={ayatFrameId} 
            customPath={customAyatFramePath} 
            customImageUrl={frameImageUrl}
            size="md" 
          />
          <h1 className="text-3xl font-headline font-bold text-white">{groupedAyats[0]?.surah.englishName || 'Quran Reader'}</h1>
          <Badge className="bg-zinc-900 border-zinc-800 text-zinc-500 font-black uppercase tracking-widest">Page {currentPage}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage <= 1}><ChevronLeft/></Button>
          <span className="text-xs font-black text-zinc-600 px-4">{currentPage} / 6٠٤</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentPage(prev => Math.min(604, prev + 1))} disabled={currentPage >= 604}><ChevronRight/></Button>
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'ayat' ? 'page' : 'ayat')} className="ml-4">
            {viewMode === 'ayat' ? <BookOpen className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <Card className="flex-1 bg-zinc-950 border-zinc-900 overflow-hidden shadow-2xl rounded-3xl">
        {loadingContent ? (
          <div className="flex items-center justify-center h-full py-20">
            <Loader2 className="animate-spin text-zinc-500 w-12 h-12" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-10 md:p-20">
              {viewMode === 'ayat' ? (
                <div className="space-y-16">
                  {groupedAyats.map(group => (
                    <div key={group.surah.number} className="space-y-12">
                      <div className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-800 border-b border-zinc-900 pb-2">SURAH {group.surah.number}</div>
                      {group.ayats.map((a: any) => (
                        <div key={a.number} className="flex gap-8 group">
                          <div className="w-12 pt-2 shrink-0">
                            <AyatFrame 
                              number={a.numberInSurah} 
                              frameId={ayatFrameId} 
                              customPath={customAyatFramePath} 
                              customImageUrl={frameImageUrl}
                            />
                          </div>
                          <div className="flex-1 space-y-8">
                            <p className="text-right text-4xl md:text-6xl font-arabic leading-[2] text-zinc-100" dir="rtl">
                              {a.text}
                            </p>
                            {a.trans && (
                              <p className="text-zinc-500 text-xl font-medium border-l-2 border-zinc-900 pl-8 italic">
                                {a.trans}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-right font-arabic leading-[3] text-4xl md:text-7xl text-zinc-100" style={{ direction: 'rtl' }}>
                  {quranData.arabic.map(a => (
                    <span key={a.number} className="hover:text-white transition-colors">
                      {a.text} 
                      <span className="inline-flex mx-2">
                        <AyatFrame 
                          number={a.numberInSurah} 
                          size="lg" 
                          frameId={ayatFrameId} 
                          customPath={customAyatFramePath} 
                          customImageUrl={frameImageUrl}
                        />
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
