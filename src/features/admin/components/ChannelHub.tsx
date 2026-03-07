
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
  Link2,
  Search,
  CheckCircle2,
  ExternalLink,
  Users,
  AlertCircle,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Video as VideoIcon,
  Database
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { fetchYouTubeChannels, fetchYouTubeChannelByHandle, fetchPlaylistVideos } from '@/services/youtube-server';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const DEFAULT_IDS = `Islamic History Plus,UCsaR6SnAv97_9MI2JPLcyRA,English,Authentic & Research Stories
Islamic History (Official),UC1mNByYnDzhPesq4RF-jGLQ,English,Pivotal Events & Journeys
The Kohistani,https://youtube.com/@thekohistani,Urdu/English,History & Documentary
Islamic Bayan 2026,UCybKAapNVFBeZyn6DJHQaGA,Urdu,Contemporary Sermons & History
Deen Squad,UCU_9S_kA,English,Youth Culture & Reminders
iLovUAllah,@iLovUAllah,English,Motivational & Inspirational
Duroos.org,UCp4Vf-IOn66Xv,Arabic/English,Classical Scholarly Lectures
Masjid Ribat,UCv9u_K37S6v3m,English,Detailed Seerah & History`;

export function ChannelHub({ videos }: { videos: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingVideosFor, setSyncingVideosFor] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  
  const [bulkIds, setBulkBulkIds] = useState(DEFAULT_IDS);
  const [singleId, setSingleId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Edit State
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
    const urlHandleMatches = text.match(/youtube\.com\/(@[\w.-]+)/g) || [];
    const handlesFromUrls = urlHandleMatches.map(m => m.split('/').pop()).filter(Boolean) as string[];
    const urlIdMatches = text.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/g) || [];
    const idsFromUrls = urlIdMatches.map(m => m.split('/').pop()).filter(Boolean) as string[];

    return {
      ids: Array.from(new Set([...idMatches, ...idsFromUrls])),
      handles: Array.from(new Set([...handleMatches, ...handlesFromUrls]))
    };
  };

  const handleSync = async (input: string) => {
    const { ids, handles } = extractSelectors(input);
    if (ids.length === 0 && handles.length === 0) {
      toast({ variant: 'destructive', title: 'No valid input', description: 'Please provide a valid YouTube ID, Handle, or URL.' });
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncStatus('Fetching channel metadata...');
    try {
      let totalSynced = 0;
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
        batch.set(channelRef, {
          ...channel,
          isActive: true,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }, { merge: true });
        totalSynced++;
      });
      await batch.commit();

      toast({ title: 'Sync Complete', description: `Successfully indexed ${totalSynced} channels.` });
      setIsImportDialogOpen(false);
    } catch (error: any) {
      setSyncError(error.message);
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncVideos = async (channel: any) => {
    const MAX_PROCESS_PER_CLICK = 500;
    let uploadsId = channel.uploadsPlaylistId;
    setSyncingVideosFor(channel.id);
    setSyncStatus(`Syncing catalog for ${channel.title}...`);
    setSyncProgress(5);

    try {
      if (!uploadsId) {
        const freshData = await fetchYouTubeChannels([channel.id]);
        if (freshData.length > 0 && freshData[0].uploadsPlaylistId) {
          uploadsId = freshData[0].uploadsPlaylistId;
          updateDocumentNonBlocking(doc(db, 'channels', channel.id), { uploadsPlaylistId: uploadsId });
        }
      }

      const ytVideos = await fetchPlaylistVideos(uploadsId, 5000);
      const existingVideosQ = query(collection(db, 'videos'), where('channelId', '==', channel.id));
      const existingSnap = await getDocs(existingVideosQ);
      const existingIds = new Set(existingSnap.docs.map(d => d.id));
      const missingVideos = ytVideos.filter(v => !existingIds.has(v.id));

      if (missingVideos.length === 0) {
        toast({ title: "Catalog Up to Date" });
        return;
      }

      const subsetToProcess = missingVideos.slice(0, MAX_PROCESS_PER_CLICK);
      const batchSize = 400;
      for (let i = 0; i < subsetToProcess.length; i += batchSize) {
        const chunk = subsetToProcess.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(v => {
          const vRef = doc(db, 'videos', v.id);
          batch.set(vRef, {
            ...v,
            externalUrl: `https://youtube.com/watch?v=${v.id}`,
            isActive: !!channel.isActive,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }, { merge: true });
        });
        await batch.commit();
        setSyncProgress(Math.round(30 + ((i + chunk.length) / subsetToProcess.length) * 70));
      }
      toast({ title: "Sync Successful", description: `Added ${subsetToProcess.length} videos.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
    } finally {
      setSyncingVideosFor(null);
      setSyncStatus('');
      setSyncProgress(0);
    }
  };

  const toggleChannelActivation = async (channelId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    updateDocumentNonBlocking(doc(db, 'channels', channelId), { isActive: newStatus });
    toast({ title: newStatus ? "Activated" : "Deactivated" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search channels..."
            className="bg-zinc-900 border-zinc-800 pl-12 rounded-2xl h-14 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full h-14 px-8 font-bold bg-zinc-900 text-white border border-zinc-800 shadow-lg">
              <Plus className="w-5 h-5 text-emerald-500 mr-2" />
              Add Creators
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] max-w-4xl p-10 outline-none">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Import Creators</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-6">
              <Textarea 
                placeholder="Paste IDs..."
                className="bg-zinc-900 border-zinc-800 h-64 rounded-2xl p-6"
                value={bulkIds}
                onChange={(e) => setBulkBulkIds(e.target.value)}
              />
              <Button className="w-full h-14 bg-zinc-100 text-black font-bold rounded-2xl" onClick={() => handleSync(bulkIds)}>
                Process Import
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-900">
                <TableHead className="py-6 text-zinc-600 pl-6 w-[30%]">Creator Branding</TableHead>
                <TableHead className="text-zinc-600 text-center w-[20%]">Inventory</TableHead>
                <TableHead className="text-zinc-600 text-center w-[20%]">Subs</TableHead>
                <TableHead className="text-right text-zinc-600 pr-6 w-[30%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingChannels ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></TableCell></TableRow>
              ) : filteredChannels?.map((channel) => (
                <TableRow key={channel.id} className="border-zinc-900 h-24 hover:bg-zinc-900/40">
                  <TableCell className="pl-6 max-w-0">
                    <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-zinc-800 bg-black shrink-0">
                        {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                      </div>
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="font-bold text-zinc-100 truncate block w-full text-[11px]" title={channel.title}>{channel.title}</span>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[6px] px-1 py-0 w-fit mt-1 uppercase font-black">
                          {channel.isActive ? 'Active' : 'Off'}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold text-zinc-400">{videos.filter(v => v.channelId === channel.id).length}/{channel.videoCount || 0}</span>
                      <span className="text-[6px] text-zinc-600 font-black uppercase">Local/YT</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-[10px] font-bold text-zinc-400">
                    {channel.subscribersCount > 1000 ? (channel.subscribersCount / 1000).toFixed(1) + 'K' : channel.subscribersCount}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleSyncVideos(channel)} className="h-8 w-8 text-zinc-600 hover:text-emerald-500">
                        <RefreshCw className={cn("w-3.5 h-3.5", syncingVideosFor === channel.id && "animate-spin")} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleChannelActivation(channel.id, !!channel.isActive)} className="h-8 w-8 text-zinc-600">
                        {channel.isActive ? <Power className="w-3.5 h-3.5 text-emerald-500" /> : <PowerOff className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if(confirm("Remove?")) deleteDocumentNonBlocking(doc(db, 'channels', channel.id)); }} className="h-8 w-8 text-zinc-600 hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
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
