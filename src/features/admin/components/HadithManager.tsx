'use client';

"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, writeBatch } from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
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
import { 
  Quote, 
  Search, 
  RefreshCw, 
  Loader2, 
  CloudDownload,
  FilterX,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllHadithEditions } from '@/lib/api';
import { cn } from '@/lib/utils';

export function HadithManager() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_editions'),
    orderBy('title', 'asc'),
    limit(500)
  ), [db]);
  const { data: savedEditions, isLoading } = useCollection(editionsQuery);

  const filteredEditions = useMemo(() => {
    if (!savedEditions) return [];
    return savedEditions.filter(e => 
      e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.collectionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    setIsSyncing(true);
    try {
      const editionsData = await getAllHadithEditions();
      const batch = writeBatch(db);
      
      // The API returns a map of editions
      Object.entries(editionsData).forEach(([key, value]: [string, any]) => {
        const editionRef = doc(db, 'hadith_editions', key);
        batch.set(editionRef, {
          id: key,
          collectionName: value.name,
          title: value.title,
          language: value.language,
          textDirection: value.direction,
          publisher: value.publisher || 'Unknown',
          category: value.category || 'N/A',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Registry Synced", description: "Successfully updated Hadith editions from source." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search editions..." 
            className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button 
          variant="outline"
          onClick={handleSyncRegistry}
          disabled={isSyncing}
          className="rounded-full h-14 px-8 font-bold border-white text-white hover:bg-white hover:text-black transition-all active:scale-95 flex items-center gap-2 shadow-lg"
        >
          {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
          <span>Sync External Registry</span>
        </Button>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-900">
                <TableHead className="text-[9px] font-black uppercase tracking-widest py-6 text-zinc-600 pl-8 w-[30%]">Edition Title</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center w-[20%]">Language</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center w-[20%]">Direction</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center w-[15%]">Category</TableHead>
                <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-zinc-600 pr-8 w-[15%]">ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-zinc-800" /></TableCell></TableRow>
              ) : paginatedEditions.map((edition) => (
                <TableRow key={edition.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-24">
                  <TableCell className="pl-8 max-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-zinc-100 truncate text-[11px] leading-tight block" title={edition.title}>{edition.title}</span>
                      <span className="text-[8px] text-zinc-600 truncate uppercase mt-0.5 block">{edition.collectionName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-bold text-zinc-400 capitalize">{edition.language}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[9px] font-black text-zinc-600 uppercase bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">{edition.textDirection}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-[10px] font-bold text-zinc-500 capitalize">{edition.category}</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <code className="text-[9px] font-mono text-zinc-700 bg-zinc-900/50 px-2 py-1 rounded">{edition.id}</code>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && paginatedEditions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                       <Quote className="w-12 h-12 text-zinc-900" />
                       <p className="text-zinc-600 font-medium">No editions indexed. Use the sync button to populate.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="bg-zinc-900/30 border-t border-zinc-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-400">Showing {paginatedEditions.length} of {filteredEditions.length}</span>
              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                className="rounded-xl border-zinc-800 bg-zinc-950 h-10 font-bold text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                className="rounded-xl border-zinc-800 bg-zinc-950 h-10 font-bold text-white"
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
