
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch, where } from 'firebase/firestore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Quote, 
  Search, 
  Loader2, 
  CloudDownload,
  FilterX,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Eye,
  ArrowLeft,
  Database
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { getAllHadithEditions } from '@/lib/api';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

type HadithViewMode = 'registry' | 'content';

export function HadithManager() {
  const db = useFirestore();
  const { toast } = useToast();
  
  // State Management
  const [viewMode, setViewMode] = useState<HadithViewMode>('registry');
  const [selectedEdition, setSelectedEdition] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  
  // Operation States
  const [isRegistrySyncing, setIsRegistrySyncing] = useState(false);
  const [isContentSyncing, setIsContentSyncing] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Dialog States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHadithItemDialogOpen, setIsHadithItemDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteItemConfirmId, setDeleteItemConfirmId] = useState<string | null>(null);

  const [editFormData, setEditFormData] = useState({
    id: '',
    collectionName: '',
    title: '',
    language: '',
    textDirection: 'ltr',
    isActive: true
  });

  const [hadithItemFormData, setHadithItemFormData] = useState({
    id: '',
    hadithnumber: '',
    text: '',
    text_en: ''
  });

  // 1. Registry Query
  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_editions'),
    orderBy('collectionName', 'asc'),
    limit(1000)
  ), [db]);
  const { data: savedEditions, isLoading: isRegistryLoading } = useCollection(editionsQuery);

  // 2. Content Query (Deep Inspector)
  const contentQuery = useMemoFirebase(() => {
    if (viewMode !== 'content' || !selectedEdition) return null;
    return query(
      collection(db, 'hadith_data'),
      where('editionId', '==', selectedEdition.id),
      orderBy('hadithnumber', 'asc'),
      limit(1000)
    );
  }, [db, viewMode, selectedEdition]);
  const { data: hadithItems, isLoading: isContentLoading } = useCollection(contentQuery);

  // Filtering & Pagination Logic
  const filteredEditions = useMemo(() => {
    if (!savedEditions) return [];
    return savedEditions.filter(e => 
      e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.collectionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.language?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [savedEditions, searchTerm]);

  const filteredHadithItems = useMemo(() => {
    if (!hadithItems) return [];
    return hadithItems.filter(h => 
      h.text?.toLowerCase().includes(contentSearch.toLowerCase()) ||
      h.text_en?.toLowerCase().includes(contentSearch.toLowerCase()) ||
      String(h.hadithnumber).includes(contentSearch)
    );
  }, [hadithItems, contentSearch]);

  const paginatedData = useMemo(() => {
    const data = viewMode === 'registry' ? filteredEditions : filteredHadithItems;
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [viewMode, filteredEditions, filteredHadithItems, currentPage]);

  const totalPages = Math.ceil((viewMode === 'registry' ? filteredEditions.length : filteredHadithItems.length) / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, contentSearch, viewMode]);

  // Registry Operations
  const handleSyncRegistry = async () => {
    setIsRegistrySyncing(true);
    try {
      const editionsData = await getAllHadithEditions();
      const batch = writeBatch(db);
      let count = 0;
      
      // Keep track of unique books to update hadith_books
      const uniqueBooks = new Map();

      Object.entries(editionsData).forEach(([bookId, bookData]: [string, any]) => {
        if (Array.isArray(bookData.collection)) {
          // Save book metadata
          uniqueBooks.set(bookId, {
            id: bookId,
            name: bookData.name,
            editionCount: bookData.collection.length
          });

          bookData.collection.forEach((item: any) => {
            const docId = `${bookId}-${item.language}`.toLowerCase().replace(/\s+/g, '-');
            const editionRef = doc(db, 'hadith_editions', docId);
            batch.set(editionRef, {
              id: docId,
              bookId: bookId,
              collectionName: bookData.name,
              title: item.name,
              language: item.language,
              textDirection: item.direction,
              sourceLink: item.link,
              sourceLinkMin: item.linkmin,
              isActive: true,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            count++;
          });
        }
      });

      // Commit books to hadith_books
      uniqueBooks.forEach((bookData, bookId) => {
        const bookRef = doc(db, 'hadith_books', bookId);
        batch.set(bookRef, {
          ...bookData,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Registry Synced", description: `Indexed ${count} editions across ${uniqueBooks.size} books.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setIsRegistrySyncing(false);
    }
  };

  const handleSyncContent = async (edition: any) => {
    const syncUrl = edition.sourceLinkMin || edition.sourceLink;
    if (!syncUrl) return toast({ variant: "destructive", title: "Source missing" });

    setIsContentSyncing(edition.id);
    try {
      const res = await fetch(syncUrl);
      const data = await res.json();
      const batch = writeBatch(db);
      const items = data.hadiths.slice(0, 500); 
      items.forEach((h: any) => {
        const ref = doc(db, 'hadith_data', `${edition.id}_h_${h.hadithnumber}`);
        batch.set(ref, { ...h, editionId: edition.id, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
      updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.id), { 
        lastSyncedAt: new Date().toISOString(),
        hadithCount: data.hadiths.length 
      });
      toast({ title: "Content Synced", description: `Persisted ${items.length} items.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Error", description: e.message });
    } finally {
      setIsContentSyncing(null);
    }
  };

  // Item Operations
  const handleOpenEditHadith = (hadith: any) => {
    setHadithItemFormData({
      id: hadith.id,
      hadithnumber: hadith.hadithnumber || '',
      text: hadith.text || '',
      text_en: hadith.text_en || ''
    });
    setIsHadithItemDialogOpen(true);
  };

  const handleSaveHadithItem = () => {
    const ref = doc(db, 'hadith_data', hadithItemFormData.id);
    setDocumentNonBlocking(ref, {
      ...hadithItemFormData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    setIsHadithItemDialogOpen(false);
    toast({ title: "Hadith Updated" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {viewMode === 'content' && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setViewMode('registry')}
              className="rounded-xl border-white text-white hover:bg-white hover:text-black transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input 
              placeholder={viewMode === 'registry' ? "Search registry..." : "Search within edition..."} 
              className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14"
              value={viewMode === 'registry' ? searchTerm : contentSearch}
              onChange={(e) => viewMode === 'registry' ? setSearchTerm(e.target.value) : setContentSearch(e.target.value)}
            />
          </div>
        </div>

        {viewMode === 'registry' ? (
          <Button 
            variant="outline"
            onClick={handleSyncRegistry}
            disabled={isRegistrySyncing}
            className="rounded-full h-14 px-8 font-bold border-white text-white hover:bg-white hover:text-black transition-all active:scale-95 flex items-center gap-2 shadow-lg"
          >
            {isRegistrySyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
            <span>Sync External Registry</span>
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="h-14 px-6 rounded-2xl border-zinc-800 text-zinc-400 font-bold bg-zinc-900/50 flex gap-2">
              <Database className="w-4 h-4" />
              {selectedEdition?.collectionName}
            </Badge>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-900">
                {viewMode === 'registry' ? (
                  <>
                    <TableHead className="text-[9px] font-black uppercase py-6 text-zinc-600 pl-8 w-[30%]">Collection</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-zinc-600 text-center w-[15%]">Language</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-zinc-600 text-center w-[15%]">Status</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-zinc-600 text-center w-[15%]">Data</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase text-zinc-600 pr-8 w-[25%]">Actions</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="text-[9px] font-black uppercase py-6 text-zinc-600 pl-8 w-[10%]">No.</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-zinc-600 w-[40%]">Arabic Text</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-zinc-600 w-[30%]">Translation</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase text-zinc-600 pr-8 w-[20%]">Actions</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(viewMode === 'registry' ? isRegistryLoading : isContentLoading) ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-zinc-800" /></TableCell></TableRow>
              ) : paginatedData.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-zinc-900/40 border-zinc-900 h-24 transition-colors">
                  {viewMode === 'registry' ? (
                    <>
                      <TableCell className="pl-8 max-w-0">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-zinc-100 truncate text-[11px] block">{item.collectionName}</span>
                          <span className="text-[8px] text-zinc-600 truncate uppercase mt-0.5 block">{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-[10px] font-bold text-zinc-400 capitalize">{item.language}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("border-none text-[7px] font-black px-1.5 py-0", item.isActive !== false ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                          {item.isActive !== false ? 'ACTIVE' : 'OFF'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.lastSyncedAt ? (
                          <Badge className="bg-blue-500/10 text-blue-500 border-none text-[7px] font-black px-1.5 py-0">SYNCED</Badge>
                        ) : (
                          <Badge variant="outline" className="border-zinc-800 text-zinc-700 text-[7px] font-black px-1.5 py-0">PENDING</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedEdition(item); setViewMode('content'); }} title="Inspect Data" className="h-8 w-8 text-zinc-600 hover:text-white"><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleSyncContent(item)} disabled={isContentSyncing === item.id || !item.isActive} className="h-8 w-8 text-zinc-600 hover:text-emerald-500"><RefreshCw className={cn("w-3.5 h-3.5", isContentSyncing === item.id && "animate-spin")} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditFormData(item); setIsEditDialogOpen(true); }} className="h-8 w-8 text-zinc-600 hover:text-white"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => updateDocumentNonBlocking(doc(db, 'hadith_editions', item.id), { isActive: !item.isActive })} className="h-8 w-8 text-zinc-600">
                            {item.isActive !== false ? <Power className="w-3.5 h-3.5 text-emerald-500" /> : <PowerOff className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(item.id)} className="h-8 w-8 text-zinc-600 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="pl-8 text-[10px] font-bold text-zinc-500">{item.hadithnumber}</TableCell>
                      <TableCell className="max-w-0">
                        <p className="text-[11px] font-arabic text-zinc-200 line-clamp-2 leading-relaxed" dir="rtl">{item.text}</p>
                      </TableCell>
                      <TableCell className="max-w-0">
                        <p className="text-[10px] text-zinc-500 line-clamp-2 italic">{item.text_en || 'No translation'}</p>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditHadith(item)} className="h-8 w-8 text-zinc-600 hover:text-white"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteItemConfirmId(item.id)} className="h-8 w-8 text-zinc-600 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="bg-zinc-900/30 border-t border-zinc-900 p-6 flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="rounded-xl border-white text-white font-bold h-10 px-6 hover:bg-white hover:text-black transition-all" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button 
                variant="outline" 
                className="rounded-xl border-white text-white font-bold h-10 px-6 hover:bg-white hover:text-black transition-all" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Item Editor Dialog */}
      <Dialog open={isHadithItemDialogOpen} onOpenChange={setIsHadithItemDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-0 outline-none overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
            <DialogTitle className="text-xl font-bold">Edit Hadith Item</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-1">Refine the sacred text and its translation.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Hadith Number</Label>
              <Input className="bg-zinc-900 border-zinc-800 h-12 rounded-xl" value={hadithItemFormData.hadithnumber} readOnly />
            </div>
            <div className="grid gap-2">
              <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Arabic Text</Label>
              <Textarea className="bg-zinc-900 border-zinc-800 min-h-[120px] rounded-xl font-arabic text-right leading-relaxed" value={hadithItemFormData.text} onChange={(e) => setHadithItemFormData({ ...hadithItemFormData, text: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">English Translation</Label>
              <Textarea className="bg-zinc-900 border-zinc-800 min-h-[120px] rounded-xl text-xs" value={hadithItemFormData.text_en} onChange={(e) => setHadithItemFormData({ ...hadithItemFormData, text_en: e.target.value })} />
            </div>
          </div>
          <div className="p-8 bg-zinc-900/20 border-t border-zinc-900 flex justify-end">
            <Button variant="outline" className="rounded-xl border-white text-white hover:bg-white hover:text-black font-bold h-12 px-10 transition-all flex items-center gap-2" onClick={handleSaveHadithItem}>
              <Save className="w-4 h-4" /> Save Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deletion Confirmations */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-10 max-w-md">
          <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold">Remove Registry?</AlertDialogTitle><AlertDialogDescription className="text-zinc-500">This removes the edition from the platform registry.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteDocumentNonBlocking(doc(db, 'hadith_editions', deleteConfirmId!)); setDeleteConfirmId(null); }} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteItemConfirmId} onOpenChange={(o) => !o && setDeleteItemConfirmId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-10 max-w-md">
          <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold">Delete Item?</AlertDialogTitle><AlertDialogDescription className="text-zinc-500">Permanently remove this specific Hadith entry.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteDocumentNonBlocking(doc(db, 'hadith_data', deleteItemConfirmId!)); setDeleteItemConfirmId(null); }} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
