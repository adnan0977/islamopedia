'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, limit, writeBatch, getDocs, where } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Plus, 
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const channelsQuery = useMemoFirebase(() => query(
    collection(db, 'channels'),
    orderBy('title', 'asc'),
    limit(100)
  ), [db]);
  const { data: linkedChannels, isLoading: isLoadingChannels } = useCollection(channelsQuery);

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
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] border border-zinc-200 shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100 shadow-inner">
              <Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400" />
            </div>
            <h2 className="text-xl sm:text-3xl font-headline font-bold text-zinc-900 tracking-tight">Channel Synchronization</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium">Link and manage authorized YouTube creator feeds for the platform.</p>
        </div>

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="rounded-xl sm:rounded-2xl h-12 sm:h-14 px-6 sm:px-10 font-bold bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl flex items-center gap-3 transition-all active:scale-95 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm uppercase tracking-widest">Link New Creator</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl w-[95vw] bg-white border-zinc-200 text-zinc-900 rounded-2xl sm:rounded-[3rem] p-0 outline-none shadow-2xl overflow-hidden">
            <DialogHeader className="p-6 sm:p-10 border-b border-zinc-100 bg-zinc-50">
              <DialogTitle className="text-xl sm:text-2xl font-headline font-bold">Import Creator Feeds</DialogTitle>
              <DialogDescription className="text-zinc-500 text-xs sm:text-sm mt-1 sm:mt-2">Paste YouTube Channel IDs or Handles below.</DialogDescription>
            </DialogHeader>
            <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
              <Textarea placeholder="UC... or @handle" className="bg-zinc-50 border-zinc-200 h-40 sm:h-56 rounded-xl sm:rounded-[2rem] p-4 sm:p-8 text-zinc-900 font-mono text-xs sm:text-sm shadow-inner focus:ring-zinc-900 focus:bg-white transition-all" value={bulkIds} onChange={(e) => setBulkBulkIds(e.target.value)} />
              <Button 
                className="w-full h-12 sm:h-14 font-bold rounded-xl sm:rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95" 
                onClick={() => handleSync(bulkIds)} 
                disabled={isSyncing}
              >
                {isSyncing ? <Loader2 className="animate-spin h-5 w-5 sm:h-6 sm:w-6 mx-auto" /> : (
                  <>
                    <Link2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm uppercase tracking-widest">Start Ingestion</span>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-white border-zinc-200 text-zinc-900 rounded-2xl sm:rounded-[3rem] p-8 sm:p-12 max-w-md shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl font-headline font-bold">Unlink Creator?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 text-sm sm:text-base mt-2">Stopping synchronization for this channel. Cataloged data will remain in the local feed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <AlertDialogCancel className="bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 rounded-xl h-12 font-bold px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700 rounded-xl h-12 font-bold px-8 shadow-lg shadow-red-500/20">Unlink Feed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="bg-white border-zinc-200 overflow-hidden rounded-2xl sm:rounded-[3rem] shadow-sm">
        <div className="w-full overflow-x-auto">
          <Table className="w-full table-fixed min-w-[800px] sm:min-w-full">
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-100 h-20 sm:h-24">
                <TableHead className="py-6 sm:py-8 text-zinc-400 pl-6 sm:pl-12 w-[35%] text-[10px] font-black uppercase tracking-[0.2em]">Creator Branding</TableHead>
                <TableHead className="text-zinc-400 text-center w-[20%] text-[10px] font-black uppercase tracking-[0.2em]">Inventory</TableHead>
                <TableHead className="text-zinc-400 text-center w-[15%] text-[10px] font-black uppercase tracking-[0.2em]">Subscribers</TableHead>
                <TableHead className="text-right text-zinc-400 pr-6 sm:pr-12 w-[30%] text-[10px] font-black uppercase tracking-[0.2em]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingChannels ? (
                <TableRow><TableCell colSpan={4} className="h-96 text-center"><div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin h-10 w-10 text-zinc-100" /><p className="text-[10px] font-black uppercase text-zinc-300 tracking-[0.2em]">Hydrating creators...</p></div></TableCell></TableRow>
              ) : linkedChannels?.map((channel) => (
                <TableRow key={channel.id} className="border-zinc-100 h-24 sm:h-28 hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="pl-6 sm:pl-12 max-w-0">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50 shrink-0 shadow-sm">
                        {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-zinc-900 truncate block text-xs sm:text-sm leading-tight" title={channel.title}>{channel.title}</span>
                        <Badge className={cn("border-none text-[7px] px-2 py-0 w-fit mt-1 uppercase font-black tracking-widest shadow-sm", channel.isActive ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>{channel.isActive ? 'Active' : 'Paused'}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                      <span className="text-xs sm:text-sm font-bold text-zinc-900">{videos.filter(v => v.channelId === channel.id).length} / {channel.videoCount || 0}</span>
                      <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">Cached</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                      <span className="text-xs sm:text-sm font-bold text-zinc-900">{channel.subscribersCount > 1000 ? (channel.subscribersCount / 1000).toFixed(1) + 'K' : channel.subscribersCount}</span>
                      <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">Verified</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 sm:pr-12">
                    <div className="flex justify-end gap-1.5 sm:gap-3">
                      <Button variant="ghost" size="sm" onClick={() => handleSyncVideos(channel)} className="h-9 sm:h-11 px-3 sm:px-6 text-zinc-400 hover:text-emerald-600 hover:bg-white hover:border-zinc-200 hover:shadow-sm rounded-xl transition-all">
                        <SyncIcon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-3", syncingVideosFor === channel.id && "animate-spin")} />
                        <span className="hidden sm:inline font-bold text-[10px] uppercase tracking-widest">Sync</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleChannelActivation(channel.id, !!channel.isActive)} className="h-9 w-9 sm:h-11 sm:w-11 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:border-zinc-200 hover:shadow-sm rounded-xl transition-all">
                        {channel.isActive ? <PowerOff className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" /> : <Power className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(channel.id)} className="h-9 w-9 sm:h-11 sm:w-11 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
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