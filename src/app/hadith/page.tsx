
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { 
  BookOpen, 
  Loader2, 
  ChevronRight, 
  ArrowLeft,
  Search,
  Library,
  Info,
  AlertTriangle,
  Mail,
  Send,
  Hash,
  Database,
  List,
  Share2,
  Copy,
  Download,
  X,
  RefreshCcw,
  Languages,
  Type,
  Palette,
  Check,
  Settings,
  Pencil
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { saveOfflineHadithBooks, saveOfflineHadithIndex } from '@/lib/offline-db';

const ERROR_TYPES = [
  "Mismatched translation",
  "Spelling mistake",
  "Incomplete text",
  "Mistranslation",
  "Other"
];

const SHARE_BACKGROUNDS = [
  { id: 'sacred', url: PlaceHolderImages.find(img => img.id === 'quran-bg')?.imageUrl || "https://picsum.photos/seed/sacred/1080/1080", label: 'Sacred' },
  { id: 'reflection', url: PlaceHolderImages.find(img => img.id === 'reflection-bg')?.imageUrl || "https://picsum.photos/seed/reflect/1080/1080", label: 'Glow' },
  { id: 'night', url: PlaceHolderImages.find(img => img.id === 'trending-1')?.imageUrl || "https://picsum.photos/seed/night/1080/1080", label: 'Night' }
];

export default function HadithPage() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const activeBookId = searchParams.get('book');
  const activeChapterId = searchParams.get('chapter');
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'urdu'>('english');

  // Sync State
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // Reporting State
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedHadith, setSelectedHadith] = useState<any>(null);
  const [reportForm, setReportForm] = useState({
    typeOfError: ERROR_TYPES[0],
    details: '',
    notifyMe: false,
    reporterEmail: ''
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Share State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [hadithToShare, setHadithToShare] = useState<any>(null);
  const [shareConfig, setShareConfig] = useState({
    mode: 'both' as 'arabic' | 'translation' | 'both',
    bg: SHARE_BACKGROUNDS[0].url
  });
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [tempArabic, setTempArabic] = useState('');
  const [tempTranslation, setTempTranslation] = useState('');

  // Query 1: All Books for the directory
  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    orderBy('orderKey', 'asc')
  ), [db]);
  const { data: books, isLoading: isLoadingBooks } = useCollection(booksQuery);

  // Sync effect: When books are loaded from Firestore, save them to IndexedDB
  useEffect(() => {
    if (books && books.length > 0) {
      setIsSyncingOffline(true);
      saveOfflineHadithBooks(books)
        .then(() => {
          setTimeout(() => setIsSyncingOffline(false), 800);
        })
        .catch(err => {
          console.error("Offline sync failed", err);
          setIsSyncingOffline(false);
        });
    }
  }, [books]);

  // Query 2: All Indices for the active book
  const indexQuery = useMemoFirebase(() => (activeBookId ? query(
    collection(db, 'hadith_index'),
    where('bookSlug', '==', activeBookId)
  ) : null), [db, activeBookId]);
  const { data: indices, isLoading: isLoadingIndices } = useCollection(indexQuery);

  // Sync effect: When indices are loaded for a book, save them to IndexedDB
  useEffect(() => {
    if (indices && indices.length > 0) {
      setIsSyncingOffline(true);
      saveOfflineHadithIndex(indices)
        .then(() => {
          setTimeout(() => setIsSyncingOffline(false), 800);
        })
        .catch(err => {
          console.error("Index offline sync failed", err);
          setIsSyncingOffline(false);
        });
    }
  }, [indices]);

  // Query 3: Records for the active chapter
  const recordsQuery = useMemoFirebase(() => (activeBookId && activeChapterId ? query(
    collection(db, 'hadith_data'),
    where('bookSlug', '==', activeBookId),
    where('chapterId', '==', activeChapterId),
    limit(300)
  ) : null), [db, activeBookId, activeChapterId]);
  const { data: allRecords, isLoading: isLoadingRecords } = useCollection(recordsQuery);

  // Merge Arabic and Selected Translation indices
  const bilingualChapters = useMemo(() => {
    if (!indices) return [];
    const arabicIdx = indices.find(i => i.id.endsWith('_arabic'));
    // Find the specific language index requested
    const targetLangIdx = indices.find(i => i.id.endsWith(`_${selectedLanguage}`));
    // Fallback to any other index if target not found
    const fallbackIdx = indices.find(i => !i.id.endsWith('_arabic'));
    
    const sections = arabicIdx?.sections || {};
    return Object.keys(sections).map(num => ({
      number: num,
      arabicName: sections[num],
      translationName: (targetLangIdx?.sections || {})[num] || (fallbackIdx?.sections || {})[num] || `Chapter ${num}`
    })).sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
  }, [indices, selectedLanguage]);

  // Group records by hadithNumber
  const groupedRecords = useMemo(() => {
    if (!allRecords) return [];
    const groups: Record<string, any> = {};
    
    allRecords.forEach(r => {
      const num = r.hadithNumber;
      if (!groups[num]) groups[num] = { num, arabic: null, translation: null };
      
      if (r.editionId.endsWith('_arabic')) {
        groups[num].arabic = r;
      } else if (r.editionId.endsWith(`_${selectedLanguage}`)) {
        groups[num].translation = r;
      }
    });

    return Object.values(groups).sort((a, b) => parseFloat(a.num) - parseFloat(b.num));
  }, [allRecords, selectedLanguage]);

  const navigateTo = (params: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) nextParams.delete(key);
      else nextParams.set(key, value);
    });
    router.push(`/hadith?${nextParams.toString()}`);
  };

  const handleOpenReport = (hadith: any) => {
    setSelectedHadith(hadith);
    setReportForm({
      typeOfError: ERROR_TYPES[0],
      details: '',
      notifyMe: false,
      reporterEmail: ''
    });
    setReportDialogOpen(true);
  };

  const handleOpenShare = (hadith: any) => {
    setHadithToShare(hadith);
    setTempArabic(hadith.arabic?.hadith_text || '');
    setTempTranslation(hadith.translation?.hadith_text || '');
    setIsEditingCard(false);
    setShareDialogOpen(true);
  };

  const handleCopyShareText = () => {
    if (!hadithToShare) return;
    const arabic = tempArabic || hadithToShare.arabic?.hadith_text || '';
    const trans = tempTranslation || hadithToShare.translation?.hadith_text || '';
    
    let text = `Hadith Reflection:\n`;
    if (shareConfig.mode === 'both' || shareConfig.mode === 'arabic') text += `${arabic}\n\n`;
    if (shareConfig.mode === 'both' || shareConfig.mode === 'translation') text += `${trans}\n\n`;
    
    text += `Source: ${activeBookId}\n#${hadithToShare.num}\n\nShared via VlogNest`;
    
    navigator.clipboard.writeText(text.trim());
    toast({ title: "Copied to Clipboard" });
  };

  const handleSubmitReport = async () => {
    if (!selectedHadith) return;
    setIsSubmittingReport(true);
    try {
      const mainRecord = selectedHadith.arabic || selectedHadith.translation;
      await addDoc(collection(db, 'hadith_reports'), {
        hadithId: mainRecord.id,
        bookSlug: activeBookId,
        volume: mainRecord.volume || '',
        chapterId: activeChapterId,
        hadithNumber: selectedHadith.num,
        typeOfError: reportForm.typeOfError,
        details: reportForm.details,
        notifyMe: reportForm.notifyMe,
        reporterEmail: reportForm.reporterEmail,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast({ title: "Report Submitted", description: "Jazakallah for your feedback." });
      setReportDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Submission Failed", description: e.message });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Automated Font Size Logic based on edited or original text
  const getShareFontSize = () => {
    if (!hadithToShare) return { arabic: 'text-2xl', translation: 'text-lg' };
    const arabicLen = tempArabic.length || 0;
    const transLen = tempTranslation.length || 0;
    const totalLen = (shareConfig.mode === 'both' ? (arabicLen + transLen) : shareConfig.mode === 'arabic' ? arabicLen : transLen);

    if (totalLen > 600) return { arabic: 'text-lg', translation: 'text-xs' };
    if (totalLen > 300) return { arabic: 'text-xl', translation: 'text-sm' };
    if (totalLen > 150) return { arabic: 'text-2xl', translation: 'text-base' };
    return { arabic: 'text-4xl', translation: 'text-xl' };
  };

  const fontSizes = getShareFontSize();

  if (isLoadingBooks || isLoadingIndices || (activeChapterId && isLoadingRecords)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Loader2 className="h-12 w-12 animate-spin text-zinc-900" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Opening Library Node...</p>
      </div>
    );
  }

  // View 3: Hadith Reader
  if (activeBookId && activeChapterId) {
    const book = books?.find(b => b.id === activeBookId);

    return (
      <div className="container mx-auto px-4 py-12 space-y-12 max-w-5xl pb-32 lg:pb-12 animate-in fade-in duration-700">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 pb-8 border-b">
          <div className="flex items-center gap-6">
            <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-zinc-200 shadow-sm" onClick={() => navigateTo({ chapter: null })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{book?.bookName}</h1>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Chapter {activeChapterId} • {selectedLanguage.toUpperCase()} FEED</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-50 p-1 rounded-xl border border-zinc-100">
            <Button 
              variant={selectedLanguage === 'english' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-8 px-4 rounded-lg font-bold text-[9px] uppercase tracking-widest", selectedLanguage === 'english' && "bg-zinc-900 text-white shadow-md")}
              onClick={() => setSelectedLanguage('english')}
            >
              English
            </Button>
            <Button 
              variant={selectedLanguage === 'urdu' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-8 px-4 rounded-lg font-bold text-[9px] uppercase tracking-widest", selectedLanguage === 'urdu' && "bg-zinc-900 text-white shadow-md")}
              onClick={() => setSelectedLanguage('urdu')}
            >
              Urdu
            </Button>
          </div>
        </header>

        <div className="space-y-12">
          {groupedRecords.map((group) => {
            const r = group.arabic || group.translation;
            if (!r) return null;

            return (
              <Card key={group.num} className="border-none bg-white shadow-xl rounded-[2.5rem] overflow-hidden group hover:ring-1 hover:ring-zinc-200 transition-all">
                <CardHeader className="p-8 pb-4 border-b border-zinc-50 bg-zinc-50/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-white border border-zinc-200 rounded-xl flex items-center justify-center font-bold text-[10px] text-zinc-400 shadow-sm">
                        #{group.num}
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[8px] font-black uppercase tracking-widest border-zinc-100 py-0.5",
                        (r.status || '').toLowerCase().includes('sahih') ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-zinc-400"
                      )}>
                        {r.status || 'Verified'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 sm:p-12 space-y-12">
                  {group.arabic && (
                    <div className="space-y-8">
                      {group.arabic.narrator_text && (
                        <div className="flex flex-col gap-2 text-right">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">السند</span>
                          <p className="text-sm font-arabic text-zinc-500 italic leading-[2.2]" dir="rtl">{group.arabic.narrator_text}</p>
                        </div>
                      )}
                      <p className="text-right font-arabic leading-[2.8] sm:leading-[2.5] text-zinc-900 text-3xl sm:text-4xl" dir="rtl">
                        {group.arabic.hadith_text}
                      </p>
                    </div>
                  )}

                  {group.translation && (
                    <div className="space-y-6 pt-10 border-t border-dashed border-zinc-100">
                      {group.translation.narrator_text && (
                        <div className="flex flex-col gap-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 flex items-center gap-2">
                            <Info className="w-3 h-3" /> Narrated By
                          </span>
                          <p className="text-sm font-bold text-zinc-500 italic leading-relaxed">{group.translation.narrator_text}</p>
                        </div>
                      )}
                      <p className="text-lg font-medium text-zinc-700 leading-relaxed text-justify">
                        {group.translation.hadith_text}
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-8 pt-4 border-t border-zinc-50 bg-zinc-50/10 flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-zinc-300 overflow-x-auto no-scrollbar">
                    <span className="flex items-center gap-1.5 shrink-0"><Database className="w-3 h-3" /> {activeBookId}</span>
                    <span className="flex items-center gap-1.5 shrink-0"><Hash className="w-3 h-3" /> VOL: {r.volume || '---'}</span>
                    <span className="flex items-center gap-1.5 shrink-0"><List className="w-3 h-3" /> CH: {activeChapterId}</span>
                    <span className="flex items-center gap-1.5 shrink-0"><Info className="w-3 h-3" /> NO: {group.num}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900"
                      onClick={() => handleOpenShare(group)}
                    >
                      <Share2 className="w-3 h-3 mr-1.5" />
                      Share
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleOpenReport(group)}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1.5" />
                      Report
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Share Dialog */}
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-4xl bg-zinc-50 border-none rounded-[3rem] p-0 overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto max-h-[95vh]">
            <div className="flex-1 p-8 sm:p-12 space-y-10 overflow-y-auto">
              <DialogHeader className="flex flex-row items-center justify-between space-y-0 text-left">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-bold tracking-tight">Generate Card</DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400 font-black uppercase tracking-widest">Share Prophetic Wisdom</DialogDescription>
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
                
                <div className="absolute inset-0 p-8 sm:p-12 flex flex-col h-full">
                  <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
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
                  
                  <div className="pt-6 border-t border-white/10 w-full flex items-center justify-between gap-3 shrink-0">
                    <Badge variant="secondary" className="bg-white/10 text-white border-none rounded-full px-3 py-0.5 text-[8px] font-black uppercase tracking-widest">
                      {activeBookId} • #{hadithToShare?.num}
                    </Badge>
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.3em]">VlogNest</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Sidebar */}
            <div className="w-full md:w-96 bg-white border-l border-zinc-100 p-8 sm:p-10 flex flex-col shrink-0 overflow-y-auto">
              {/* Refinement Workbench Inputs (Hidden by default) */}
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
                  {/* Content Selection */}
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

                  {/* Theme Popover */}
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

                  {/* Edit Toggle Button */}
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

                  {/* Copy Button */}
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

                  {/* Download Button */}
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

        {/* Reporting Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent className="max-w-xl bg-white border-zinc-200 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-8 sm:p-10 border-b bg-zinc-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight">Report Content Error</DialogTitle>
                  <DialogDescription className="text-zinc-500 font-medium">Flagging Record #{selectedHadith?.num} for scholarly review.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="p-8 sm:p-10 space-y-8 max-h-[60vh] overflow-y-auto">
              <section className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Type of error: *</Label>
                <RadioGroup 
                  value={reportForm.typeOfError} 
                  onValueChange={(val) => setReportForm({ ...reportForm, typeOfError: val })}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {ERROR_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-3 p-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 hover:bg-white transition-colors cursor-pointer">
                      <RadioGroupItem value={type} id={type} />
                      <Label htmlFor={type} className="text-sm font-bold text-zinc-700 cursor-pointer flex-1">{type}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </section>

              <section className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Additional details:</Label>
                <Textarea 
                  placeholder="Please describe the discrepancy in detail..."
                  className="bg-zinc-50 border-zinc-100 rounded-2xl min-h-[120px] focus-visible:ring-zinc-900 shadow-inner"
                  value={reportForm.details}
                  onChange={(e) => setReportForm({ ...reportForm, details: e.target.value })}
                />
              </section>

              <section className="space-y-6 pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl text-white shadow-xl">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <Label className="text-sm font-bold">Email me when corrected</Label>
                  </div>
                  <Switch checked={reportForm.notifyMe} onCheckedChange={(val) => setReportForm({ ...reportForm, notifyMe: val })} />
                </div>

                {reportForm.notifyMe && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Your Email Address</Label>
                    <Input 
                      type="email" 
                      placeholder="you@example.com"
                      className="bg-white border-zinc-200 h-12 rounded-xl font-bold shadow-sm"
                      value={reportForm.reporterEmail}
                      onChange={(e) => setReportForm({ ...reportForm, reporterEmail: e.target.value })}
                    />
                  </div>
                )}
              </section>
            </div>

            <DialogFooter className="p-8 sm:p-10 bg-zinc-50 border-t gap-3">
              <Button variant="ghost" onClick={() => setReportDialogOpen(false)} className="h-12 px-6 font-bold text-zinc-400 hover:text-zinc-900">Cancel</Button>
              <Button 
                className="h-12 px-10 rounded-xl bg-zinc-900 text-white font-bold shadow-xl active:scale-95 transition-all gap-2"
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // View 2: Bilingual Index
  if (activeBookId) {
    const book = books?.find(b => b.id === activeBookId);
    return (
      <div className="container mx-auto px-4 py-12 space-y-12 max-w-6xl pb-32 lg:pb-12 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b">
          <div className="flex items-center gap-6">
            <Button variant="outline" size="icon" className="rounded-2xl h-14 w-14 border-zinc-200 shadow-sm" onClick={() => navigateTo({ book: null })}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">{book?.bookName}</h1>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Bilingual Structural Index</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-100 shadow-inner">
            <Button 
              variant={selectedLanguage === 'english' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest", selectedLanguage === 'english' && "bg-zinc-900 text-white shadow-lg")}
              onClick={() => setSelectedLanguage('english')}
            >
              English
            </Button>
            <Button 
              variant={selectedLanguage === 'urdu' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest", selectedLanguage === 'urdu' && "bg-zinc-900 text-white shadow-lg")}
              onClick={() => setSelectedLanguage('urdu')}
            >
              Urdu
            </Button>
          </div>
        </header>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {bilingualChapters.map((ch) => (
            <Card 
              key={ch.number} 
              className="group cursor-pointer border-none bg-white shadow-sm ring-1 ring-zinc-100 hover:ring-zinc-900 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 rounded-[2rem] overflow-hidden"
              onClick={() => navigateTo({ chapter: ch.number })}
            >
              <CardContent className="p-8 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center font-black text-xs text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-inner">
                    {ch.number}
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-200 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                </div>
                
                <div className="space-y-4">
                  <div className="text-right">
                    <h3 className="font-arabic text-xl text-zinc-900 leading-loose truncate" dir="rtl">{ch.arabicName}</h3>
                  </div>
                  <div className="pt-4 border-t border-dashed border-zinc-100">
                    <p className={cn(
                      "text-[11px] font-bold text-zinc-400 uppercase tracking-widest line-clamp-2 leading-relaxed",
                      selectedLanguage === 'urdu' && "font-arabic text-right text-base tracking-normal normal-case text-zinc-600"
                    )} dir={selectedLanguage === 'urdu' ? 'rtl' : 'ltr'}>
                      {ch.translationName}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // View 1: Books Directory
  return (
    <div className="container mx-auto px-4 py-12 space-y-16 max-w-7xl pb-32 lg:pb-16 animate-in fade-in duration-700">
      {/* Offline Sync Loader Overlay */}
      {isSyncingOffline && (
        <div className="fixed top-24 right-8 z-[60] animate-in slide-in-from-right duration-500">
          <Card className="bg-zinc-900 border-none text-white shadow-2xl rounded-2xl overflow-hidden p-4 flex items-center gap-4">
            <RefreshCcw className="w-5 h-5 text-emerald-400 animate-spin" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Local Cache</span>
              <span className="text-xs font-bold">Data getting Synced...</span>
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 text-white rounded-2xl shadow-xl">
              <Library className="h-8 w-8" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900">Hadith Library</h1>
          </div>
          <p className="text-zinc-500 max-w-2xl text-lg font-medium leading-relaxed">Authentic collections of Prophetic traditions from verified primary sources, indexed for spiritual research.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300" />
          <Input placeholder="Search collections..." className="pl-14 rounded-[1.5rem] bg-zinc-50 border-zinc-100 h-16 font-bold text-base focus-visible:ring-zinc-900 shadow-inner" />
        </div>
      </div>

      <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {books?.map((book) => (
          <Card 
            key={book.id} 
            className="aspect-square group cursor-pointer border-none bg-zinc-50/50 transition-all hover:bg-white hover:ring-1 hover:ring-zinc-900 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center p-8 text-center rounded-[3rem] relative overflow-hidden shadow-inner" 
            onClick={() => navigateTo({ book: book.id })}
          >
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-white rounded-[2rem] flex items-center justify-center border border-zinc-100 shadow-sm group-hover:scale-110 group-hover:border-zinc-900/10 transition-all duration-700 mb-6 sm:mb-8">
              <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-900" />
            </div>
            <h3 className="text-xs sm:text-sm font-black tracking-tight line-clamp-2 leading-tight px-2 group-hover:text-zinc-900 transition-colors uppercase">
              {book.bookName}
            </h3>
            
            <div className="mt-4 sm:mt-6 px-4 py-1.5 bg-white rounded-full border border-zinc-100 shadow-sm">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                {book.totalHadiths?.toLocaleString() || '---'} Shards
              </span>
            </div>

            <div className="absolute top-6 right-6">
               <ChevronRight className="h-5 w-5 text-zinc-200 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-700" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
