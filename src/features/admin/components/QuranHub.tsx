
"use client";

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
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
  Languages,
  PlusCircle,
  Power,
  PowerOff,
  CloudDownload
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
import { getAllAlQuranEditions, getFullQuran } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toArabicNumerals, cn } from '@/lib/utils';

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
      const payload = await getFullQuran(editionId);
      if (!payload?.data?.surahs) {
        throw new Error(`Failed to fetch edition ${editionId} from API.`);
      }

      setSyncStatus('saving');
      const surahs = payload.data.surahs;
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
      updateDocumentNonBlocking(editionRef, { dataSync: 'yes' });
      
      setSyncStatus('success');
      toast({ title: "Synchronization Complete", description: `Successfully indexed ${editionId}.` });
    } catch (e: any) {
      setSyncStatus('error');
      toast({ variant: "destructive", title: "Sync Failed", description: e.message || "An unexpected error occurred." });
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
              <p className="text-[10px] uppercase font-black tracking-widest text-amber-500/50">Required for platform operations</p>
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

  const fetchAndSeedRegistry = async () => {
    setLoading(true);
    try {
      const payload = await getAllAlQuranEditions();
      const availableList = payload.data || [];
      setAvailable(availableList);

      const batch = writeBatch(db);
      availableList.forEach((item: any) => {
        const docRef = doc(db, 'quran_editions', item.identifier);
        batch.set(docRef, {
          id: item.identifier,
          name: item.name,
          language: languageNameMap[item.language] || item.language.toUpperCase(),
          languageCode: item.language,
          type: item.type,
          format: item.format,
          isActive: editions.some(e => e.id === item.identifier && e.isActive) || item.identifier === 'quran-uthmani',
          dataSync: editions.find(e => e.id === item.identifier)?.dataSync || 'no',
          isDefault: item.identifier === 'quran-uthmani'
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Registry Seeded", description: `Successfully stored ${availableList.length} editions in database.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Seed Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleActivation = (editionId: string, currentStatus: boolean) => {
    const editionRef = doc(db, 'quran_editions', editionId);
    updateDocumentNonBlocking(editionRef, { isActive: !currentStatus });
    toast({ 
      title: !currentStatus ? "Edition Activated" : "Edition Deactivated",
      description: !currentStatus ? "This edition is now ready for synchronization." : "This edition is no longer active."
    });
  };

  // Filter current directory
  const [dirSearch, setDirSearch] = useState('');
  const filteredEditions = editions.filter(e => 
    e.name.toLowerCase().includes(dirSearch.toLowerCase()) || 
    e.id.toLowerCase().includes(dirSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-950 p-8 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-2">
          <h3 className="font-bold text-xl text-white">Platform Registry</h3>
          <p className="text-sm text-zinc-500 font-medium">Manage all indexed Quranic translations and recitations.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={fetchAndSeedRegistry} disabled={loading} className="rounded-xl h-11 px-6 font-bold border-zinc-800 text-zinc-400 hover:bg-zinc-900">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CloudDownload className="w-4 h-4 mr-2" />}
            Sync Registry from Cloud
          </Button>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 px-6 font-bold bg-white text-black hover:bg-zinc-200 flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> Browse Full Library
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[850px] p-0 h-[85vh] flex flex-col rounded-3xl overflow-hidden fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_100px_rgba(0,0,0,1)]">
              <DialogHeader className="p-8 border-b border-zinc-800 shrink-0 space-y-4 text-left">
                <DialogTitle className="text-white font-bold text-2xl">Global Quranic Library</DialogTitle>
                <DialogDescription className="text-zinc-500 text-sm">
                  Filter and activate specific editions for your platform's synchronized feed.
                </DialogDescription>
                <div className="flex flex-col md:flex-row gap-4 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input 
                      placeholder="Search by name, ID or author..." 
                      className="pl-10 bg-zinc-900 border-zinc-800 text-white rounded-xl h-12"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-hidden relative bg-black/20">
                <ScrollArea className="h-full">
                  <div className="p-8 grid gap-4 pb-24">
                    {editions.length > 0 ? editions.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-6 bg-zinc-900/30 rounded-2xl border border-zinc-900/50 hover:border-zinc-800 transition-all group">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-zinc-100 font-bold text-base">{item.name}</span>
                            <Badge variant="outline" className="text-[8px] border-zinc-800 text-zinc-600 uppercase tracking-widest px-2">{item.type}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                            <span>{item.language}</span>
                            <span>•</span>
                            <span className="font-mono">{item.id}</span>
                          </div>
                        </div>
                        <Button 
                          variant={item.isActive ? "outline" : "secondary"} 
                          className={cn("rounded-xl font-bold min-w-[120px] h-10 transition-all", item.isActive ? "border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5" : "")} 
                          onClick={() => toggleActivation(item.id, !!item.isActive)}
                        >
                          {item.isActive ? 'Active' : 'Activate'}
                        </Button>
                      </div>
                    )) : (
                      <div className="text-center py-24 bg-zinc-900/20 rounded-[2rem] border-2 border-dashed border-zinc-900">
                        <Database className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
                        <p className="text-zinc-600 font-medium">Registry is empty. Click "Sync Registry from Cloud" first.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <Input 
          placeholder="Filter your local directory..." 
          className="pl-12 bg-zinc-950 border-zinc-900 text-white rounded-2xl h-14"
          value={dirSearch}
          onChange={(e) => setDirSearch(e.target.value)}
        />
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-3xl shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-zinc-500 pl-8">Edition Detail</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Language</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Platform Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEditions.slice(0, 50).map((t) => (
              <TableRow key={t.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-24">
                <TableCell className="pl-8">
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-100">{t.name}</span>
                    <span className="text-[9px] font-mono text-zinc-700 uppercase">{t.id}</span>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-500 font-medium text-xs">{t.language}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {t.isActive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none rounded-lg text-[9px] font-black uppercase">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-800 text-zinc-700 rounded-lg text-[9px] font-black uppercase">Inactive</Badge>
                    )}
                    {t.dataSync === 'yes' ? (
                      <Badge className="bg-blue-500/10 text-blue-500 border-none rounded-lg text-[9px] font-black uppercase">Synced</Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/10 text-amber-500/50 rounded-lg text-[9px] font-black uppercase">Pending Sync</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right pr-8 space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => toggleActivation(t.id, !!t.isActive)} 
                    className={cn("rounded-xl h-10 w-10", t.isActive ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10")}
                    title={t.isActive ? "Deactivate" : "Activate"}
                  >
                    {t.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteDocumentNonBlocking(doc(db, 'quran_editions', t.id))} 
                    className="text-destructive hover:bg-destructive/10 rounded-xl h-10 w-10"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredEditions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-60 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                     <BookOpen className="w-12 h-12 text-zinc-900" />
                     <p className="text-zinc-600 font-medium">No editions found. Pull the registry from the cloud to begin.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {filteredEditions.length > 50 && (
        <p className="text-center text-[10px] text-zinc-600 font-black uppercase tracking-widest pt-4">Showing first 50 results. Use search to find others.</p>
      )}
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
  const activeEditions = editions.filter(e => e.isActive);

  return (
    <div className="space-y-6">
      {!isStandardSynced && (
        <Card className="bg-amber-500/5 border-amber-500/20 p-8 rounded-3xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="space-y-2 text-center md:text-left">
                <h4 className="font-bold text-white">Standard Base Initialization</h4>
                <p className="text-sm text-zinc-500">Sync the Uthmani script before indexing translations.</p>
             </div>
             <Button 
                onClick={handleStandardSync}
                disabled={syncing}
                className="bg-amber-500 text-black hover:bg-amber-400 font-bold rounded-xl h-12 px-8"
              >
                <Download className="mr-2 h-4 w-4" /> Sync Arabic Base
             </Button>
          </div>
        </Card>
      )}

      <Card className="bg-zinc-950 border-zinc-900 p-10 rounded-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row gap-8 items-end">
          <div className="flex-1 space-y-4 w-full">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Active Edition</Label>
            <Select value={selectedEdition} onValueChange={setSelectedEdition}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl h-14 text-white">
                <SelectValue placeholder="Select an active translation..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                {activeEditions.map((t) => (
                  <SelectItem key={t.id} value={t.id} disabled={t.dataSync === 'yes'}>
                    {t.name} {t.dataSync === 'yes' ? ' (Done)' : ''}
                  </SelectItem>
                ))}
                {activeEditions.length === 0 && (
                  <div className="p-4 text-center text-xs text-zinc-600">No active translations found.</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button 
            className="bg-white text-black hover:bg-zinc-200 rounded-xl h-14 px-10 font-bold w-full md:w-auto transition-transform active:scale-95" 
            onClick={() => performSync(selectedEdition)} 
            disabled={syncing || !selectedEdition}
          >
            <Download className="mr-2 w-5 h-5" /> Start Full Sync
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
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Browse Edition</Label>
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
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Filter By</Label>
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
        <CardHeader className="bg-zinc-900/50 flex flex-row justify-between items-center py-4 px-8 border-b border-zinc-900">
          <div className="flex items-center gap-2">
             <Database className="w-4 h-4 text-zinc-600" />
             <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">Synchronized Content</CardTitle>
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
                <p className="text-zinc-600 font-medium">Please synchronize the selected edition to view content.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
