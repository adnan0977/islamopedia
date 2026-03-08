
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, limit, writeBatch, getDocs, where } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Youtube, 
  RefreshCw, 
  Plus, 
  Search, 
  Power, 
  PowerOff, 
  Trash2,
  RefreshCw as SyncIcon,
  Link2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { fetchYouTubeChannels, fetchYouTubeChannelByHandle, fetchPlaylistVideos } from '@/services/youtube-server';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';

const DEFAULT_IDS = `Islamic History Plus,UCsaR6SnAv97_9MI2JPLcyRA,English,Authentic & Research Stories
Islamic History (Official),UC1mNByYnDzhPesq4RF-jGLQ,English,Pivotal Events & Journeys
The Kohistani,https://youtube.com/@thekohistani,Urdu/English,History & Documentary
Islamic Bayan 2026,UCybKAapNVFBeZyn6DJHQaGA,Urdu,Contemporary Sermons & History`;

export function ChannelHub({ videos }: { videos: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingVideosFor, setSyncingVideosFor] = useState<string | null>(null);
  
  const [bulkIds, setBulkBulkIds] = useState(DEFAULT_IDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const channelsQuery = useMemoFirebase(() => query(
    collection(db, 'channels'),
    orderBy('title', 'asc'),
    limit(100)
  ), [db]);
  const { data: linkedChannels, isLoading: isLoadingChannels } = useCollection(channelsQuery);

  const filteredChannels = linkedChannels?.filter(ch => 
    ch.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extractSelectors = (text: string) => {
    const idMatches = text.match(/UC[a-zA-Z0-9_-]{22}/g) || [];
    const handleMatches = text.match(/@[\w.-]+/g) || [];
    return {
      ids: Array.from(new Set([...idMatches])),
      handles: Array.from(new Set([...handleMatches]))
    };
  };

  const handleSync = async (input: string) => {
    const { ids, handles } = extractSelectors(input);
    if (ids.length === 0 && handles.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid input' });
      return;
    }

    setIsSyncing(true);
    try {
      const allResolvedChannels: any[] = [];
      if (ids.length > 0) {
        for (let i = 0; i < ids.length; i += 50) {
          const chunk = ids.slice(i, i + 50);
          const data = await fetchYouTubeChannels(chunk);
          allResolvedChannels.push(...data);
        }
      }
      if (handles.length > 0) {
        for (const handle of handles) {
          const data = await fetchYouTubeChannelByHandle(handle);
          if (data) allResolvedChannels.push(data);
        }
      }

      const batch = writeBatch(db);
      allResolvedChannels.forEach(channel => {
        const channelRef = doc(db, 'channels', channel.id);
        batch.set(channelRef, { ...channel, isActive: true, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
      toast({ title: 'Import Complete' });
      setIsImportDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncVideos = async (channel: any) => {
    setSyncingVideosFor(channel.id);
    try {
      const uploadsId = channel.uploadsPlaylistId || ('UU' + channel.id.substring(2));
      const ytVideos = await fetchPlaylistVideos(uploadsId, 500);
      const existingVideosQ = query(collection(db, 'videos'), where('channelId', '==', channel.id));
      const existingSnap = await getDocs(existingVideosQ);
      const existingIds = new Set(existingSnap.docs.map(d => d.id));
      const missingVideos = ytVideos.filter(v => !existingIds.has(v.id));

      if (missingVideos.length > 0) {
        const batch = writeBatch(db);
        missingVideos.forEach(v => {
          const vRef = doc(db, 'videos', v.id);
          batch.set(vRef, { ...v, externalUrl: `https://youtube.com/watch?v=${v.id}`, isActive: !!channel.isActive, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() }, { merge: true });
        });
        await batch.commit();
        toast({ title: "Catalog Updated", description: `Added ${missingVideos.length} videos.` });
      } else {
        toast({ title: "Up to Date" });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
    } finally {
      setSyncingVideosFor(null);
    }
  };

  const toggleChannelActivation = (channelId: string, currentStatus: boolean) => {
    updateDocumentNonBlocking(doc(db, 'channels', channelId), { isActive: !currentStatus });
    toast({ title: !currentStatus ? "Activated" : "Deactivated" });
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteDocumentNonBlocking(doc(db, 'channels', deleteConfirmId));
      setDeleteConfirmId(null);
      toast({ title: "Creator Unlinked" });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input placeholder="Search creators..." className="bg-zinc-900 border-zinc-800 pl-12 rounded-2xl h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              className="rounded-xl h-12 px-8 font-bold border-white text-white hover:bg-white hover:text-black shadow-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Link Creator</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-0 outline-none shadow-2xl overflow-hidden">
            <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
              <DialogTitle className="text-xl font-bold">Import Creators</DialogTitle>
              <DialogDescription className="text-zinc-500 text-xs mt-1">Paste YouTube IDs or Handles below.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <Textarea placeholder="UC... or @handle" className="bg-zinc-900 border-zinc-800 h-48 rounded-2xl p-6" value={bulkIds} onChange={(e) => setBulkBulkIds(e.target.value)} />
              <Button 
                variant="outline"
                className="w-full h-12 font-bold rounded-xl border-white text-white hover:bg-white hover:text-black shadow-xl transition-all flex items-center justify-center gap-2" 
                onClick={() => handleSync(bulkIds)} 
                disabled={isSyncing}
              >
                {isSyncing ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : (
                  <>
                    <Link2 className="w-5 h-5" />
                    <span>Start Import</span>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-10 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Unlink Creator?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">Stopping sync for this channel. Local data remains.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold">Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2rem] shadow-2xl">
        <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-900">
                <TableHead className="py-6 text-zinc-600 pl-6 w-[25%] text-[9px] font-black uppercase">Creator Branding</TableHead>
                <TableHead className="text-zinc-600 text-center w-[20%] text-[9px] font-black uppercase">Inventory</TableHead>
                <TableHead className="text-zinc-600 text-center w-[20%] text-[9px] font-black uppercase">Subs</TableHead>
                <TableHead className="text-right text-zinc-600 pr-6 w-[35%] text-[9px] font-black uppercase">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingChannels ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-zinc-800" /></TableCell></TableRow>
              ) : filteredChannels?.map((channel) => (
                <TableRow key={channel.id} className="border-zinc-900 h-24 hover:bg-zinc-900/40">
                  <TableCell className="pl-6 max-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-zinc-800 bg-black shrink-0">
                        {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-zinc-100 truncate block text-[11px]" title={channel.title}>{channel.title}</span>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[6px] px-1 py-0 w-fit mt-1 uppercase font-black">{channel.isActive ? 'Active' : 'Off'}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-[10px] font-bold text-zinc-400">
                    {videos.filter(v => v.channelId === channel.id).length}/{channel.videoCount || 0}
                  </TableCell>
                  <TableCell className="text-center text-[10px] font-bold text-zinc-400">
                    {channel.subscribersCount > 1000 ? (channel.subscribersCount / 1000).toFixed(1) + 'K' : channel.subscribersCount}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleSyncVideos(channel)} className="h-8 w-8 text-zinc-600 hover:text-emerald-500"><SyncIcon className={cn("w-3.5 h-3.5", syncingVideosFor === channel.id && "animate-spin")} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleChannelActivation(channel.id, !!channel.isActive)} className="h-8 w-8 text-zinc-600">{channel.isActive ? <Power className="w-3.5 h-3.5 text-emerald-500" /> : <PowerOff className="w-3.5 h-3.5" />}</Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(channel.id)} className="h-8 w-8 text-zinc-600 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
