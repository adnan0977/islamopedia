
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

      if (allResolvedChannels.length === 0) {
        throw new Error("No channels found. Please verify the IDs/Handles are correct and active.");
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
      setSingleId('');
    } catch (error: any) {
      setSyncError(error.message);
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message || 'Failed to fetch from YouTube.' });
    } finally {
      setIsSyncing(false);
      setSyncStatus('');
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
        setSyncStatus('Resolving missing playlist data...');
        const freshData = await fetchYouTubeChannels([channel.id]);
        if (freshData.length > 0 && freshData[0].uploadsPlaylistId) {
          uploadsId = freshData[0].uploadsPlaylistId;
          updateDocumentNonBlocking(doc(db, 'channels', channel.id), { uploadsPlaylistId: uploadsId });
        }
      }

      if (!uploadsId) throw new Error('Cannot find uploads playlist for this channel.');

      // Fetch a large pool to compare against DB
      setSyncStatus('Fetching video history from YouTube...');
      const ytVideos = await fetchPlaylistVideos(uploadsId, 5000);
      setSyncProgress(30);

      setSyncStatus('Cross-referencing with local database...');
      const existingVideosQ = query(collection(db, 'videos'), where('channelId', '==', channel.id));
      const existingSnap = await getDocs(existingVideosQ);
      const existingIds = new Set(existingSnap.docs.map(d => d.id));

      const missingVideos = ytVideos.filter(v => !existingIds.has(v.id));

      if (missingVideos.length === 0) {
        toast({ title: "Catalog Up to Date", description: "No new videos detected on YouTube." });
        return;
      }

      // We process a subset to avoid long-running actions and timeouts
      const subsetToProcess = missingVideos.slice(0, MAX_PROCESS_PER_CLICK);
      const hasMoreRemaining = missingVideos.length > MAX_PROCESS_PER_CLICK;

      setSyncStatus(`Indexing ${subsetToProcess.length} new videos...`);
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
            isTrending: false,
            appViewCount: 0,
            youtubeViewCount: 0,
            likeCount: 0,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }, { merge: true });
        });
        
        await batch.commit();
        setSyncProgress(Math.round(30 + ((i + chunk.length) / subsetToProcess.length) * 70));
      }

      if (hasMoreRemaining) {
        toast({ 
          title: "Partial Sync Successful", 
          description: `Added ${subsetToProcess.length} videos. ${missingVideos.length - subsetToProcess.length} more remain. Click Sync again to continue.` 
        });
      } else {
        toast({ title: "Sync Successful", description: `Added ${subsetToProcess.length} new videos from ${channel.title}.` });
      }
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
    const channelRef = doc(db, 'channels', channelId);
    updateDocumentNonBlocking(channelRef, { isActive: newStatus, updatedAt: new Date().toISOString() });

    try {
      const videosQ = query(collection(db, 'videos'), where('channelId', '==', channelId));
      const videoSnaps = await getDocs(videosQ);
      
      if (!videoSnaps.empty) {
        const batch = writeBatch(db);
        videoSnaps.forEach(vDoc => {
          batch.update(vDoc.ref, { isActive: newStatus, updatedAt: new Date().toISOString() });
        });
        await batch.commit();
      }
      toast({ title: newStatus ? "Activated" : "Deactivated", description: "Channel and associated videos updated." });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: "Failed to update associated videos." });
    }
  };

  const handleEditSave = () => {
    if (!editingChannel) return;
    updateDocumentNonBlocking(doc(db, 'channels', editingChannel.id), {
      title: editingChannel.title,
      description: editingChannel.description,
      updatedAt: new Date().toISOString()
    });
    setIsEditDialogOpen(false);
    toast({ title: "Channel Updated" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search linked channels..."
            className="bg-zinc-900 border-zinc-800 pl-12 rounded-2xl h-14 text-white focus:ring-zinc-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) setSyncError(null);
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-full h-14 px-8 font-bold bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-3 shadow-lg group">
              <Plus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>Add New Channels</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] max-w-4xl p-0 overflow-hidden outline-none">
            <DialogHeader className="p-10 border-b border-zinc-900 bg-zinc-900/40">
              <DialogTitle className="text-2xl font-bold">Import Creators</DialogTitle>
              <DialogDescription className="text-zinc-500 text-sm mt-2">Paste Channel IDs, Handles, or full URLs.</DialogDescription>
            </DialogHeader>
            
            {syncError && (
              <div className="px-10 pt-6">
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-bold">Sync Error</AlertTitle>
                  <AlertDescription className="text-xs mt-1">{syncError}</AlertDescription>
                </Alert>
              </div>
            )}

            <Tabs defaultValue="bulk" className="w-full">
              <div className="px-10 pt-8">
                <TabsList className="bg-zinc-900 p-1 rounded-2xl h-14 w-full border border-zinc-800">
                  <TabsTrigger value="bulk" className="flex-1 rounded-xl font-bold h-full border border-transparent data-[state=active]:bg-zinc-800 text-white">Bulk Import</TabsTrigger>
                  <TabsTrigger value="single" className="flex-1 rounded-xl font-bold h-full border border-transparent data-[state=active]:bg-zinc-800 text-white">Single Lookup</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-10">
                <TabsContent value="bulk" className="m-0 space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Input List</Label>
                    <Textarea 
                      placeholder="Paste text containing identifiers..."
                      className="bg-zinc-900 border-zinc-800 text-white font-mono text-xs min-h-[250px] rounded-[1.5rem] p-6 focus:ring-zinc-700 resize-none"
                      value={bulkIds}
                      onChange={(e) => setBulkBulkIds(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full h-14 font-bold rounded-2xl text-base flex items-center justify-center gap-2 bg-zinc-100 text-black hover:bg-white shadow-xl"
                    disabled={isSyncing}
                    onClick={() => handleSync(bulkIds)}
                  >
                    {isSyncing ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
                    Process & Sync All Content
                  </Button>
                </TabsContent>

                <TabsContent value="single" className="m-0 space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Identifier or URL</Label>
                    <Input 
                      placeholder="e.g. @TheKohistani"
                      className="bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14 px-6"
                      value={singleId}
                      onChange={(e) => setSingleId(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full h-14 font-bold rounded-2xl text-base flex items-center justify-center gap-2 bg-zinc-100 text-black hover:bg-white shadow-xl" 
                    disabled={isSyncing || !singleId.trim()}
                    onClick={() => handleSync(singleId)}
                  >
                    {isSyncing ? <Loader2 className="animate-spin h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                    Resolve & Link Creator
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="overflow-x-auto scrollbar-hide">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-900 hover:bg-transparent">
                <TableHead className="text-[9px] font-black uppercase tracking-[0.1em] py-6 text-zinc-600 pl-6 w-[180px]">Creator branding</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600 text-center w-24">Inventory</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600 w-24 text-center">Subs</TableHead>
                <TableHead className="text-right text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600 pr-6 w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingChannels ? (
                <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="w-10 h-10 animate-spin text-zinc-800 mx-auto" /></TableCell></TableRow>
              ) : filteredChannels?.length ? (
                filteredChannels.map((channel) => {
                  const videosInDbCount = videos.filter(v => v.channelId === channel.id).length;
                  return (
                    <TableRow key={channel.id} className={cn("hover:bg-zinc-900/40 transition-all border-zinc-900 h-24", !channel.isActive && "opacity-50 grayscale")}>
                      <TableCell className="pl-6 max-w-[180px]">
                        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-zinc-800 bg-black shrink-0">
                            {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                          </div>
                          <div className="flex flex-col min-w-0 overflow-hidden">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-bold text-zinc-100 truncate text-[11px]" title={channel.title}>
                                {channel.title}
                              </span>
                              {channel.isActive && <CheckCircle2 className="w-2.5 h-2.5 text-zinc-600 shrink-0" />}
                            </div>
                            <div className="mt-0.5">
                              {channel.isActive ? (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[6px] font-black uppercase px-1 py-0">Active</Badge>
                              ) : (
                                <Badge variant="outline" className="border-zinc-800 text-zinc-600 text-[6px] font-black uppercase px-1 py-0">Off</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1 text-zinc-400 font-bold text-[9px]">
                            <VideoIcon className="w-2 h-2 text-zinc-600" />
                            <span>{videosInDbCount}/{channel.videoCount || 0}</span>
                          </div>
                          <span className="text-[6px] font-black uppercase text-zinc-600">Local/YT</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1 text-zinc-400 font-bold text-[10px]">
                          <Users className="w-2.5 h-2.5 text-zinc-700" />
                          {channel.subscribersCount > 1000 ? (channel.subscribersCount / 1000).toFixed(1) + 'K' : channel.subscribersCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" size="icon" 
                            disabled={!!syncingVideosFor}
                            className="rounded-lg h-8 w-8 text-zinc-600 hover:text-emerald-500 hover:bg-zinc-900"
                            onClick={() => handleSyncVideos(channel)}
                          >
                            <RefreshCw className={cn("w-3.5 h-3.5", syncingVideosFor === channel.id && "animate-spin")} />
                          </Button>
                          <Button 
                            variant="ghost" size="icon" 
                            className={cn("rounded-lg h-8 w-8 text-zinc-600 hover:bg-zinc-900", channel.isActive ? "text-emerald-500" : "text-zinc-700")}
                            onClick={() => toggleChannelActivation(channel.id, !!channel.isActive)}
                          >
                            {channel.isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          </Button>
                          <Button 
                            variant="ghost" size="icon" 
                            className="rounded-lg h-8 w-8 text-zinc-600 hover:text-white hover:bg-zinc-900"
                            onClick={() => { setEditingChannel(channel); setIsEditDialogOpen(true); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" size="icon" 
                            className="rounded-lg h-8 w-8 text-zinc-600 hover:text-destructive"
                            onClick={() => { if (confirm("Are you sure you want to remove this channel from the registry?")) deleteDocumentNonBlocking(doc(db, 'channels', channel.id)); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={4} className="h-64 text-center">No creators found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Auto-Loader Overlay Dialog */}
      <Dialog open={!!syncingVideosFor || isSyncing}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl p-10 outline-none max-w-md">
          <DialogHeader className="flex flex-col items-center text-center space-y-6">
             <Database className="w-12 h-12 text-white animate-pulse" />
             <DialogTitle className="text-xl font-bold">Synchronizing Content</DialogTitle>
             <DialogDescription className="text-zinc-500 text-sm">{syncStatus || 'Please wait while we update your catalog.'}</DialogDescription>
          </DialogHeader>
          {syncProgress > 0 && (
            <div className="w-full space-y-4 py-6">
                 <Progress value={syncProgress} className="h-2 bg-zinc-900" />
                 <p className="text-center text-[10px] text-zinc-500 uppercase font-black tracking-widest">{syncProgress}% Complete</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-10 outline-none max-w-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-bold">Edit Channel Metadata</DialogTitle></DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-zinc-500 uppercase text-[10px] font-black">Display Title</Label>
              <Input value={editingChannel?.title || ''} onChange={(e) => setEditingChannel({ ...editingChannel, title: e.target.value })} className="bg-zinc-900 border-zinc-800 h-12 rounded-xl text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-500 uppercase text-[10px] font-black">Description</Label>
              <Textarea value={editingChannel?.description || ''} onChange={(e) => setEditingChannel({ ...editingChannel, description: e.target.value })} className="bg-zinc-900 border-zinc-800 rounded-xl min-h-[150px] text-white" />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl font-bold h-12 px-6 border border-zinc-800">Cancel</Button>
            <Button className="rounded-xl h-12 px-8 font-bold bg-zinc-100 text-black" onClick={handleEditSave}>Save Registry Info</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
