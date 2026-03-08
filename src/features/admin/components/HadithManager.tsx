
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch } from 'firebase/firestore';
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
  Languages
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
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Badge } from '@/components/ui/badge';

export function HadithManager() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegistrySyncing, setIsRegistrySyncing] = useState(false);
  const [isContentSyncing, setIsContentSyncing] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    collectionName: '',
    title: '',
    language: '',
    textDirection: 'ltr',
    isActive: true
  });

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_editions'),
    orderBy('collectionName', 'asc'),
    limit(1000)
  ), [db]);
  const { data: savedEditions, isLoading } = useCollection(editionsQuery);

  const filteredEditions = useMemo(() => {
    if (!savedEditions) return [];
    return savedEditions.filter(e => 
      e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.collectionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.language?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [savedEditions, searchTerm]);

  const paginatedEditions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEditions.slice(start, start + itemsPerPage);
  }, [filteredEditions, currentPage]);

  const totalPages = Math.ceil(filteredEditions.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSyncRegistry = async () => {
    setIsRegistrySyncing(true);
    try {
      const editionsData = await getAllHadithEditions();
      const batch = writeBatch(db);
      
      let count = 0;
      Object.entries(editionsData).forEach(([bookId, bookData]: [string, any]) => {
        const commonName = bookData.name;
        
        if (Array.isArray(bookData.collection)) {
          bookData.collection.forEach((item: any) => {
            const docId = `${bookId}-${item.language}`.toLowerCase().replace(/\s+/g, '-');
            const editionRef = doc(db, 'hadith_editions', docId);
            const existing = savedEditions?.find(e => e.id === docId);

            batch.set(editionRef, {
              id: docId,
              bookId: bookId,
              collectionName: commonName,
              title: item.name,
              language: item.language,
              textDirection: item.direction,
              sourceLink: item.link,
              sourceLinkMin: item.linkmin,
              isActive: existing ? (existing.isActive ?? true) : true,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            count++;
          });
        }
      });

      await batch.commit();
      toast({ title: "Registry Synced", description: `Indexed ${count} language editions.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setIsRegistrySyncing(false);
    }
  };

  const handleSyncContent = async (edition: any) => {
    const syncUrl = edition.sourceLinkMin || edition.sourceLink;
    if (!syncUrl) {
      toast({ variant: "destructive", title: "Sync URL Missing" });
      return;
    }

    setIsContentSyncing(edition.id);
    try {
      const res = await fetch(syncUrl);
      if (!res.ok) throw new Error("Failed to fetch Hadith data.");
      const data = await res.json();
      
      if (!data.hadiths || !Array.isArray(data.hadiths)) {
        throw new Error("Invalid format.");
      }

      const batchSize = 100;
      const hadiths = data.hadiths;
      const limitToSync = hadiths.slice(0, 500); // Demo limit

      const batch = writeBatch(db);
      limitToSync.forEach((h: any) => {
        const contentId = `${edition.id}_h_${h.hadithnumber}`;
        const contentRef = doc(db, 'hadith_data', contentId);
        batch.set(contentRef, {
          ...h,
          editionId: edition.id,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      
      updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.id), {
        lastSyncedAt: new Date().toISOString(),
        hadithCount: hadiths.length
      });

      toast({ title: "Content Synced", description: `Saved ${limitToSync.length} items.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setIsContentSyncing(null);
    }
  };

  const handleToggleStatus = (edition: any) => {
    const newStatus = !edition.isActive;
    updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.id), { isActive: newStatus });
    toast({ title: newStatus ? "Enabled" : "Disabled" });
  };

  const handleOpenEdit = (edition: any) => {
    setEditFormData({
      id: edition.id,
      collectionName: edition.collectionName || '',
      title: edition.title || '',
      language: edition.language || '',
      textDirection: edition.textDirection || 'ltr',
      isActive: edition.isActive !== false
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    updateDocumentNonBlocking(doc(db, 'hadith_editions', editFormData.id), {
      ...editFormData,
      updatedAt: new Date().toISOString()
    });
    setIsEditDialogOpen(false);
    toast({ title: "Updated Successfully" });
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteDocumentNonBlocking(doc(db, 'hadith_editions', deleteConfirmId));
      setDeleteConfirmId(null);
      toast({ title: "Edition Removed" });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search collections..." 
            className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button 
          variant="outline"
          onClick={handleSyncRegistry}
          disabled={isRegistrySyncing}
          className="rounded-full h-14 px-8 font-bold border-white text-white hover:bg-white hover:text-black transition-all active:scale-95 flex items-center gap-2 shadow-lg"
        >
          {isRegistrySyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
          <span>Sync Registry</span>
        </Button>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-900">
                <TableHead className="text-[9px] font-black uppercase tracking-widest py-6 text-zinc-600 pl-8 w-[25%]">Collection</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center w-[15%]">Language</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center w-[15%]">Status</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center w-[15%]">Data</TableHead>
                <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-zinc-600 pr-8 w-[30%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-zinc-800" /></TableCell></TableRow>
              ) : paginatedEditions.map((edition) => (
                <TableRow key={edition.id} className="hover:bg-zinc-900/40 border-zinc-900 h-24">
                  <TableCell className="pl-8 max-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-zinc-100 truncate text-[11px] leading-tight block" title={edition.collectionName}>{edition.collectionName}</span>
                      <span className="text-[8px] text-zinc-600 truncate uppercase mt-0.5 block">{edition.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-bold text-zinc-400 capitalize">{edition.language}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex flex-col items-center">
                      {edition.isActive !== false ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-none rounded-lg text-[7px] font-black uppercase px-1.5 py-0">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="border-zinc-800 text-zinc-700 rounded-lg text-[7px] font-black uppercase px-1.5 py-0">Off</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {edition.lastSyncedAt ? (
                      <Badge className="bg-blue-500/10 text-blue-500 border-none rounded-lg text-[7px] font-black uppercase px-1.5 py-0">Synced</Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-800 text-zinc-700 rounded-lg text-[7px] font-black uppercase px-1.5 py-0">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleSyncContent(edition)} 
                        disabled={isContentSyncing === edition.id || !edition.isActive}
                        className="h-8 w-8 text-zinc-600 hover:text-white"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isContentSyncing === edition.id && "animate-spin")} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(edition)} className="h-8 w-8 text-zinc-600 hover:text-white"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(edition)} className="h-8 w-8 text-zinc-600">
                        {edition.isActive !== false ? <Power className="w-3.5 h-3.5 text-emerald-500" /> : <PowerOff className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(edition.id)} className="h-8 w-8 text-zinc-600 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="bg-zinc-900/30 border-t border-zinc-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                className="rounded-xl border-white text-white hover:bg-white hover:text-black font-bold h-10 px-6 transition-all"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                className="rounded-xl border-white text-white hover:bg-white hover:text-black font-bold h-10 px-6 transition-all"
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-0 outline-none overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
            <DialogTitle className="text-xl font-bold">Edit Registry</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-1">Update Hadith edition metadata.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid gap-2">
              <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Collection Name</Label>
              <Input className="bg-zinc-900 border-zinc-800 h-12 rounded-xl" value={editFormData.collectionName} onChange={(e) => setEditFormData({ ...editFormData, collectionName: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Display Title</Label>
              <Input className="bg-zinc-900 border-zinc-800 h-12 rounded-xl" value={editFormData.title} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} />
            </div>
            <Button 
              variant="outline"
              className="w-full h-14 font-bold rounded-2xl border-white text-white hover:bg-white hover:text-black shadow-xl transition-all flex items-center justify-center gap-2 mt-4" 
              onClick={handleSaveEdit}
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-10 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Remove Registry?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">This will remove the book from your platform catalog.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
