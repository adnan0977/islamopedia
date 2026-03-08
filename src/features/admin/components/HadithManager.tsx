
'use client';

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
  Loader2, 
  CloudDownload,
  FilterX,
  ChevronLeft,
  ChevronRight,
  ExternalLink
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
    setIsSyncing(true);
    try {
      const editionsData = await getAllHadithEditions();
      const batch = writeBatch(db);
      
      let count = 0;
      // The API returns an object where keys are book IDs (e.g. "bukhari")
      // and values have "name" and "collection" (array of language editions)
      Object.entries(editionsData).forEach(([bookId, bookData]: [string, any]) => {
        const commonName = bookData.name;
        
        if (Array.isArray(bookData.collection)) {
          bookData.collection.forEach((item: any) => {
            // Generate a unique ID for this specific language edition
            const docId = `${bookId}-${item.language}`.toLowerCase().replace(/\s+/g, '-');
            const editionRef = doc(db, 'hadith_editions', docId);
            
            batch.set(editionRef, {
              id: docId,
              bookId: bookId,
              collectionName: commonName,
              title: item.name,
              language: item.language,
              textDirection: item.direction,
              sourceLink: item.link,
              sourceLinkMin: item.linkmin,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            count++;
          });
        }
      });

      await batch.commit();
      toast({ title: "Registry Synced", description: `Successfully indexed ${count} language editions.` });
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
            placeholder="Search books or languages..." 
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
              <TableRow className="border-zinc-900 hover:bg-transparent">
                <TableHead className="text-[9px] font-black uppercase tracking-widest py-6 text-zinc-600 pl-8 w-[30%]">Hadith Book</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center w-[20%]">Language</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center w-[15%]">Dir</TableHead>
                <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-zinc-600 pr-8 w-[35%]">Edition ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-zinc-800" /></TableCell></TableRow>
              ) : paginatedEditions.map((edition) => (
                <TableRow key={edition.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-24">
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
                    <span className="text-[9px] font-black text-zinc-600 uppercase bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">{edition.textDirection}</span>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex flex-col items-end gap-1">
                      <code className="text-[9px] font-mono text-zinc-700 bg-zinc-900/50 px-2 py-1 rounded">{edition.id}</code>
                      {edition.sourceLink && (
                        <a href={edition.sourceLink} target="_blank" rel="noopener noreferrer" className="text-[8px] text-zinc-500 hover:text-white flex items-center gap-1 font-bold uppercase tracking-widest">
                          JSON Source <ExternalLink className="w-2 h-2" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && paginatedEditions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
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
                className="rounded-xl border-zinc-800 bg-zinc-950 h-10 font-bold text-white hover:bg-white hover:text-black transition-all"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                className="rounded-xl border-zinc-800 bg-zinc-950 h-10 font-bold text-white hover:bg-white hover:text-black transition-all"
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
