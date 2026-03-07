
"use client";

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Trash2, 
  Loader2, 
  Search, 
  Download, 
  AlertCircle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Database,
  Languages
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getAvailableTranslations, getFullQuran } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toArabicNumerals } from '@/lib/utils';

interface QuranHubProps {
  editions: any[];
  syncing: boolean;
  setSyncing: (val: boolean) => void;
  setProgress: (val: number) => void;
  setSyncStatus: (val: any) => void;
}

const languageNameMap: Record<string, string> = {
  ar: 'Arabic', en: 'English', ur: 'Urdu', fr: 'French', es: 'Spanish', de: 'German', id: 'Indonesian', tr: 'Turkish',
  zh: 'Chinese', ru: 'Russian', fa: 'Persian', bn: 'Bengali', hi: 'Hindi', ml: 'Malayalam', ta: 'Tamil', te: 'Telugu',
};

export function QuranHub({ editions, syncing, setSyncing, setProgress, setSyncStatus }: QuranHubProps) {
  const db = useFirestore();
  const { toast } = useToast();

  const standardEdition = editions.find(e => e.id === 'quran-uthmani');
  const isStandardSynced = standardEdition?.dataSync === 'yes';

  const handleStandardSync = async () => {
    await performSync('quran-uthmani');
  };

  const performSync = async (editionId: string) => {
    if (!editionId) return;
    
    setSyncing(true);
    setSyncStatus('fetching');
    setProgress(0);
    
    try {
      const isArabic = editionId === 'quran-uthmani';
      
      // Fetch data from API
      const payload = await getFullQuran(editionId);
      if (!payload?.data?.surahs) {
        throw new Error(`Failed to fetch edition ${editionId} from API.`);
      }

      setSyncStatus('saving');
      const surahs = payload.data.surahs;

      // Process Surah by Surah
      const batchSize = 5; 
      for (let i = 0; i < surahs.length; i += batchSize) {
        const chunk = surahs.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        chunk.forEach((s: any) => {
          const sNum = s.number;
          const surahId = `${editionId}_surah_${sNum}`;
          
          const ayats = s.ayahs.map((a: any) => ({
            number: a.number,
            numberInSurah: a.numberInSurah,
            text: a.text,
            translationText: isArabic ? null : a.text,
            page: a.page,
            juz: a.juz
          }));

          batch.set(doc(db, 'quran', surahId), {
            id: surahId, 
            editionId: editionId, 
            surahNumber: sNum, 
            name: s.name, 
            englishName: s.englishName, 
            ayats, 
            pages: Array.from(new Set(ayats.map((a: any) => a.page))), 
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
        
        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / surahs.length) * 100));
      }

      const editionRef = doc(db, 'quran_editions', editionId);
      const editionMetadata = isArabic ? {
        id: 'quran-uthmani',
        name: 'Standard Arabic (Uthmani)',
        language: 'Arabic',
        languageCode: 'ar',
        isActive: true,
        isDefault: true,
        dataSync: 'yes'
      } : {
        dataSync: 'yes'
      };

      await setDoc(editionRef, editionMetadata, { merge: true });

      setSyncStatus('success');
      toast({ 
        title: "Synchronization Complete", 
        description: `Successfully indexed ${editionId} surahs.` 
      });
    } catch (e: any) {
      console.error("Sync Error:", e);
      setSyncStatus('error');
      toast({ 
        variant: "destructive", 
        title: "Sync Failed", 
        description: e.message || "An unexpected error occurred during database sync." 
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!isStandardSynced && !syncing && (
        <Alert className="bg-amber-500/10 border-amber-500/50 text-amber-200 rounded-3xl p-6">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertTitle className="font-bold text-lg mb-2">Standard Quran Missing</AlertTitle>
          <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-amber-200/70 text-sm">
                The foundational Arabic Uthmani text has not been synchronized. 
              </p>
              <p className="text-[10px] uppercase font-black tracking-widest text-amber-500/50">Required for display</p>
            </div>
            <Button 
              onClick={handleStandardSync}
              className="bg-amber-500 text-black hover:bg-amber-400 font-bold rounded-xl h-11 px-6 shrink-0"
            >
              <Download className="mr-2 h-4 w-4" /> Sync Standard Arabic
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isStandardSynced && (
         <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Standard Arabic Text Ready</span>
         </div>
      )}

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="bg-zinc-900/50 p-1 rounded-2xl h-12 border border-zinc-800 mb-8">
          <TabsTrigger value="directory" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Edition Directory</TabsTrigger>
          <TabsTrigger value="sync" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Database Sync</TabsTrigger>
          <TabsTrigger value="viewer" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Full Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <EditionDirectory editions={editions} />
        </TabsContent>
        <TabsContent value="sync">
          <SyncTool 
            editions={editions} 
            syncing={syncing} 
            performSync={performSync}
            handleStandardSync={handleStandardSync}
            isStandardSynced={isStandardSynced}
          />
        </TabsContent>
        <TabsContent value="viewer">
          <FullQuranViewer editions={editions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditionDirectory({ editions }: { editions: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<any[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');

  const fetchAvailable = async () => {
    setLoading(true);
    try {
      const data = await getAvailableTranslations();
      setAvailable(data.data || []);
    } catch (e) {
      toast({ variant: "destructive", title: "API Error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openAdd && available.length === 0) fetchAvailable();
  }, [openAdd, available.length]);

  const toggleEdition = (edition: any) => {
    const existing = editions.find(t => t.id === edition.identifier);
    if (existing) {
      deleteDocumentNonBlocking(doc(db, 'quran_editions', edition.identifier));
      toast({ title: "Edition Deactivated" });
    } else {
      setDoc(doc(db, 'quran_editions', edition.identifier), {
        id: edition.identifier,
        name: edition.name,
        language: languageNameMap[edition.language] || edition.language.toUpperCase(),
        languageCode: edition.language,
        isActive: true,
        isDefault: editions.length === 0,
        dataSync: 'no'
      }, { merge: true });
      toast({ title: "Edition Activated" });
    }
  };

  const uniqueLanguages = Array.from(new Set(available.map(a => a.language))).sort();

  const filteredAvailable = available.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.identifier.toLowerCase().includes(search.toLowerCase());
    const matchesLang = selectedLanguage === 'all' || a.language === selectedLanguage;
    return matchesSearch && matchesLang;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white">Edition Directory</h3>
          <p className="text-xs text-zinc-500 font-medium">Manage translation editions available for sync.</p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-11 px-6 font-bold bg-white text-black hover:bg-zinc-200">
              Browse API Editions
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[750px] p-0 h-[85vh] flex flex-col rounded-3xl">
            <DialogHeader className="p-8 border-b border-zinc-800 shrink-0 space-y-4 text-left">
              <DialogTitle className="text-white font-bold text-xl">Available Editions</DialogTitle>
              <DialogDescription className="text-zinc-500 text-sm">
                Browse and activate new translations from the global repository.
              </DialogDescription>
              <div className="flex flex-col md:flex-row gap-4 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input 
                    placeholder="Search by name or ID..." 
                    className="pl-10 bg-zinc-900 border-zinc-800 text-white rounded-xl h-11"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-56">
                   <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white h-11 rounded-xl">
                         <div className="flex items-center gap-2">
                            <Languages className="w-4 h-4 text-zinc-500" />
                            <SelectValue placeholder="All Languages" />
                         </div>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800 text-white max-h-60">
                         <SelectItem value="all">All Languages</SelectItem>
                         {uniqueLanguages.map(lang => (
                           <SelectItem key={lang} value={lang}>
                             {languageNameMap[lang] || lang.toUpperCase()}
                           </SelectItem>
                         ))}
                      </SelectContent>
                   </Select>
                </div>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 p-8">
              <div className="grid gap-3">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="animate-spin text-zinc-500 w-8 h-8" />
                    <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Querying Cloud Registry...</p>
                  </div>
                ) : filteredAvailable.length > 0 ? (
                  filteredAvailable.map((item) => {
                    const isActivated = editions.some(t => t.id === item.identifier);
                    return (
                      <div key={item.identifier} className="flex items-center justify-between p-5 bg-zinc-900/40 rounded-2xl border border-zinc-900/50 hover:border-zinc-800 transition-colors">
                        <div className="flex flex-col space-y-1">
                          <span className="text-zinc-200 font-bold text-sm">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-600 text-[9px] uppercase font-black tracking-widest">{languageNameMap[item.language] || item.language}</span>
                            <span className="text-zinc-800 text-[9px]">•</span>
                            <span className="text-zinc-600 text-[9px] font-mono">{item.identifier}</span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isActivated ? "destructive" : "secondary"} 
                          className="rounded-xl font-bold min-w-[110px] h-9" 
                          onClick={() => toggleEdition(item)}
                        >
                          {isActivated ? <Trash2 className="w-4 h-4" /> : 'Activate'}
                        </Button>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-20 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-900">
                    <p className="text-zinc-600 font-medium">No translations match your search.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-3xl shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-zinc-500 pl-8">Edition Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Language</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Synced</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editions.map((t) => (
              <TableRow key={t.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-20">
                <TableCell className="font-bold text-white pl-8">{t.name}</TableCell>
                <TableCell className="text-zinc-500 font-medium">{t.language}</TableCell>
                <TableCell>
                  {t.dataSync === 'yes' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none rounded-lg text-[9px] font-black uppercase">Synced</Badge>
                  ) : (
                    <Badge variant="outline" className="border-zinc-800 text-zinc-600 rounded-lg text-[9px] font-black uppercase">Pending Sync</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right pr-8">
                  <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, 'quran_editions', t.id))} className="text-destructive hover:bg-destructive/10 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {editions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                     <BookOpen className="w-8 h-8 text-zinc-900" />
                     <p className="text-zinc-600 font-medium">Your edition directory is empty.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SyncTool({ editions, syncing, performSync, handleStandardSync, isStandardSynced }: { 
  editions: any[], 
  syncing: boolean, 
  performSync: (id: string) => Promise<void>,
  handleStandardSync: () => Promise<void>,
  isStandardSynced: boolean
}) {
  const [selectedEdition, setSelectedEdition] = useState('');

  return (
    <div className="space-y-6">
      {!isStandardSynced && (
        <Card className="bg-amber-500/5 border-amber-500/20 p-8 rounded-3xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="space-y-2 text-center md:text-left">
                <h4 className="font-bold text-white">Initialize Base Quran</h4>
                <p className="text-sm text-zinc-500">The Arabic Uthmani text is required before translations can be effectively synced.</p>
             </div>
             <Button 
                onClick={handleStandardSync}
                disabled={syncing}
                className="bg-amber-500 text-black hover:bg-amber-400 font-bold rounded-xl h-12 px-8"
              >
                <Download className="mr-2 h-4 w-4" /> Sync Standard Base
             </Button>
          </div>
        </Card>
      )}

      <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-4 w-full">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Select Sync Target</Label>
            <Select value={selectedEdition} onValueChange={setSelectedEdition}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                <SelectValue placeholder="Choose an edition to sync..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                {editions.map((t) => (
                  <SelectItem key={t.id} value={t.id} disabled={t.dataSync === 'yes'}>
                    {t.name} {t.dataSync === 'yes' ? ' (Synced)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            className="bg-white text-black hover:bg-zinc-200 rounded-xl h-12 px-8 font-bold w-full md:w-auto" 
            onClick={() => performSync(selectedEdition)} 
            disabled={syncing || !selectedEdition}
          >
            <Download className="mr-2 w-4 h-4" /> Start Indexing
          </Button>
        </div>
      </Card>
    </div>
  );
}

function FullQuranViewer({ editions }: { editions: any[] }) {
  const db = useFirestore();
  const [filterMode, setFilterMode] = useState<'surah' | 'page'>('surah');
  const [surahNum, setSurahNum] = useState(1);
  const [pageNum, setPageNum] = useState(1);
  const [selectedEdition, setSelectedEdition] = useState('quran-uthmani');
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchContent() {
      if (!selectedEdition) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'quran'),
          where('editionId', '==', selectedEdition),
          filterMode === 'surah' 
            ? where('surahNumber', '==', surahNum) 
            : where('pages', 'array-contains', pageNum)
        );
        const docs = await getDocs(q);
        const results = docs.docs.map(d => d.data());
        setContent(results);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [db, selectedEdition, filterMode, surahNum, pageNum]);

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-3xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Browser Edition</Label>
            <Select value={selectedEdition} onValueChange={setSelectedEdition}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                {editions.filter(e => e.dataSync === 'yes').map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Filter Method</Label>
            <RadioGroup 
              defaultValue="surah" 
              className="flex gap-4 h-12 items-center bg-zinc-900/50 px-4 rounded-xl border border-zinc-900"
              onValueChange={(val) => setFilterMode(val as 'surah' | 'page')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="surah" id="r1" className="border-zinc-700" />
                <Label htmlFor="r1" className="text-xs font-bold text-zinc-400">Surah</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="page" id="r2" className="border-zinc-700" />
                <Label htmlFor="r2" className="text-xs font-bold text-zinc-400">Page</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-3 h-12">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl bg-zinc-900"
              onClick={() => filterMode === 'surah' ? setSurahNum(prev => Math.max(1, prev - 1)) : setPageNum(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 text-center bg-zinc-900 h-full flex items-center justify-center rounded-xl font-bold text-white min-w-[100px]">
              {filterMode === 'surah' ? `Surah ${surahNum}` : `Page ${pageNum}`}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl bg-zinc-900"
              onClick={() => filterMode === 'surah' ? setSurahNum(prev => Math.min(114, prev + 1)) : setPageNum(prev => Math.min(604, prev + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-3xl shadow-2xl h-[600px] flex flex-col">
        <CardHeader className="bg-zinc-900/50 flex flex-row justify-between items-center py-4">
          <div className="flex items-center gap-2">
             <Database className="w-4 h-4 text-zinc-600" />
             <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">Database Snapshot</CardTitle>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-8 space-y-12">
            {content.length > 0 ? content.map((surah) => (
              <div key={surah.id} className="space-y-8">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-xs font-bold text-white">
                      {surah.surahNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-white">{surah.englishName}</h4>
                      <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Edition: {surah.editionId}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-arabic text-zinc-400">{surah.name}</span>
                </div>
                
                <div className="space-y-6">
                  {surah.ayats.map((ayat: any) => (
                    <div key={ayat.number} className="flex gap-6 group">
                      <div className="w-12 pt-2 shrink-0">
                         <span className="text-[10px] font-black text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                           {toArabicNumerals(ayat.numberInSurah)}
                         </span>
                      </div>
                      <div className="flex-1 space-y-4">
                        <p className="text-right text-3xl font-arabic leading-relaxed text-zinc-200" dir="rtl">
                          {ayat.text}
                        </p>
                        {ayat.translationText && (
                          <p className="text-sm text-zinc-500 font-medium leading-relaxed italic border-l border-zinc-900 pl-4">
                            {ayat.translationText}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <BookOpen className="w-12 h-12 text-zinc-900" />
                <p className="text-zinc-600 font-medium">No records found. Please ensure this edition is synchronized.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
