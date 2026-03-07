
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
  Video as VideoIcon
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
    // 1. Extract raw IDs (UC followed by 22 chars)
    const idMatches = text.match(/UC[a-zA-Z0-9_-]{22}/g) || [];
    
    // 2. Extract Handles (@name)
    const handleMatches = text.match(/@[\w.-]+/g) || [];
    
    // 3. Extract Handles from URLs (youtube.com/@handle or youtube.com/channel/UC...)
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
      toast({ variant: 'destructive', title: 'No valid input', description: 'Please provide a valid YouTube ID (UC...), Handle (@...), or URL.' });
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
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
    }
  };

  const handleSyncVideos = async (channel: any) => {
    let uploadsId = channel.uploadsPlaylistId;
    setSyncingVideosFor(channel.id);

    try {
      // If missing playlist ID, attempt to resolve it once from the API
      if (!uploadsId) {
        const freshData = await fetchYouTubeChannels([channel.id]);
        if (freshData.length > 0 && freshData[0].uploadsPlaylistId) {
          uploadsId = freshData[0].uploadsPlaylistId;
          updateDocumentNonBlocking(doc(db, 'channels', channel.id), { uploadsPlaylistId: uploadsId });
        }
      }

      if (!uploadsId) {
        throw new Error('Cannot find uploads playlist for this channel. It may have zero public videos.');
      }

      // Fetch more videos using pagination (up to 500)
      const ytVideos = await fetchPlaylistVideos(uploadsId, 500);
      if (ytVideos.length === 0) {
        toast({ title: "No Videos", description: "No public uploads found for this channel." });
        return;
      }

      const existingVideosQ = query(collection(db, 'videos'), where('channelId', '==', channel.id));
      const existingSnap = await getDocs(existingVideosQ);
      const existingIds = new Set(existingSnap.docs.map(d => d.id));

      const newVideos = ytVideos.filter(v => !existingIds.has(v.id));

      if (newVideos.length === 0) {
        toast({ title: "Up to Date", description: "All latest videos are already in the catalog." });
        return;
      }

      // Firestore batches are limited to 500 operations. 
      // We process in chunks just in case.
      const batchSize = 400;
      for (let i = 0; i < newVideos.length; i += batchSize) {
        const chunk = newVideos.slice(i, i + batchSize);
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
          });
        });
        
        await batch.commit();
      }

      toast({ title: "Sync Successful", description: `Added ${newVideos.length} new videos from ${channel.title}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
    } finally {
      setSyncingVideosFor(null);
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

      toast({ 
        title: newStatus ? "Channel Activated" : "Channel Deactivated", 
        description: `Channel and its ${videoSnaps.size} associated videos updated.` 
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: "Failed to update associated videos." });
    }
  };

  const handleEditSave = () => {
    if (!editingChannel) return;
    const channelRef = doc(db, 'channels', editingChannel.id);
    updateDocumentNonBlocking(channelRef, {
      title: editingChannel.title,
      description: editingChannel.description,
      updatedAt: new Date().toISOString()
    });
    setIsEditDialogOpen(false);
    toast({ title: "Channel Updated", description: "Metadata saved locally." });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
            <Button 
              className="rounded-full h-14 px-8 font-bold bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 flex items-center gap-3 shadow-lg group"
            >
              <Plus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>Add New Channels</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] max-w-4xl p-0 overflow-hidden outline-none shadow-2xl">
            <DialogHeader className="p-10 border-b border-zinc-900 bg-zinc-900/40">
              <DialogTitle className="text-2xl font-bold">Import Creators</DialogTitle>
              <DialogDescription className="text-zinc-500 text-sm mt-2">Paste Channel IDs, Handles, or full URLs to begin indexing.</DialogDescription>
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
                  <TabsTrigger value="bulk" className="flex-1 rounded-xl font-bold h-full border border-transparent data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700 text-white">Bulk Import</TabsTrigger>
                  <TabsTrigger value="single" className="flex-1 rounded-xl font-bold h-full border border-transparent data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700 text-white">Single Lookup</TabsTrigger>
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
                    className="w-full h-14 font-bold rounded-2xl text-base flex items-center justify-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl border border-zinc-800"
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
                      placeholder="e.g. @TheKohistani or https://youtube.com/channel/..."
                      className="bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14 px-6"
                      value={singleId}
                      onChange={(e) => setSingleId(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full h-14 font-bold rounded-2xl text-base flex items-center justify-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl border border-zinc-800" 
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
        <div className="p-8 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <Youtube className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Linked Channels Registry</h3>
          </div>
          <Badge variant="outline" className="border-zinc-800 text-[10px] font-black text-zinc-500 px-3 py-1">
            {linkedChannels?.length || 0} Registered
          </Badge>
        </div>
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] py-6 text-zinc-600 pl-10">Creator branding</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 text-center">Video inventory</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Statistics</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 pr-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingChannels ? (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-zinc-800 mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredChannels?.length ? (
              filteredChannels.map((channel) => {
                const videosInDbCount = videos.filter(v => v.channelId === channel.id).length;
                
                return (
                  <TableRow key={channel.id} className={cn("hover:bg-zinc-900/40 transition-all border-zinc-900 h-24", !channel.isActive && "opacity-50 grayscale")}>
                    <TableCell className="pl-10">
                      <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-zinc-800 bg-black shrink-0 shadow-lg">
                          {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-zinc-100 truncate text-base flex items-center gap-2">
                            {channel.title}
                            {channel.isActive && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 fill-zinc-600" />}
                          </span>
                          <div className="mt-1">
                            {channel.isActive ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black uppercase rounded-sm h-4">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="border-zinc-800 text-zinc-600 text-[8px] font-black uppercase rounded-sm h-4">Deactivated</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs">
                          <VideoIcon className="w-3 h-3 text-zinc-600" />
                          <span>{videosInDbCount} / {channel.videoCount || 0}</span>
                        </div>
                        <span className="text-[8px] font-black uppercase text-zinc-600 tracking-tighter">Indexed / YouTube</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-zinc-400 font-bold text-sm">
                        <Users className="w-4 h-4 text-zinc-700" />
                        {channel.subscribersCount > 1000 ? (channel.subscribersCount / 1000).toFixed(1) + 'K' : channel.subscribersCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-10">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          disabled={syncingVideosFor === channel.id}
                          className="rounded-2xl h-12 w-12 text-zinc-600 hover:text-emerald-500 hover:bg-zinc-900 border border-transparent"
                          onClick={() => handleSyncVideos(channel)}
                          title="Sync All Channel Videos"
                        >
                          <RefreshCw className={cn("w-5 h-5", syncingVideosFor === channel.id && "animate-spin")} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn("rounded-2xl h-12 w-12 text-zinc-600 hover:bg-zinc-900 border border-transparent", channel.isActive ? "text-emerald-500" : "text-zinc-700")}
                          onClick={() => toggleChannelActivation(channel.id, !!channel.isActive)}
                          title={channel.isActive ? "Deactivate Channel" : "Activate Channel"}
                        >
                          {channel.isActive ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-2xl h-12 w-12 text-zinc-600 hover:text-white hover:bg-zinc-900 border border-transparent"
                          onClick={() => {
                            setEditingChannel(channel);
                            setIsEditDialogOpen(true);
                          }}
                          title="Edit Channel Info"
                        >
                          <Pencil className="w-5 h-5" />
                        </Button>
                        <a href={channel.externalUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 text-zinc-600 hover:text-white hover:bg-zinc-900 border border-transparent">
                            <ExternalLink className="w-5 h-5" />
                          </Button>
                        </a>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-2xl h-12 w-12 text-zinc-600 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm("Delete channel registry? Associated videos will remain.")) {
                              deleteDocumentNonBlocking(doc(db, 'channels', channel.id));
                            }
                          }}
                          title="Remove Registry"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                     <Youtube className="w-16 h-16 text-zinc-900" />
                     <p className="text-zinc-600 font-medium">No creators found in your directory.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-10 outline-none max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Edit Channel Metadata</DialogTitle>
            <DialogDescription className="text-zinc-500">Update branding information for this creator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Display Title</Label>
              <Input 
                value={editingChannel?.title || ''}
                onChange={(e) => setEditingChannel({ ...editingChannel, title: e.target.value })}
                className="bg-zinc-900 border-zinc-800 h-12 rounded-xl text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Description</Label>
              <Textarea 
                value={editingChannel?.description || ''}
                onChange={(e) => setEditingChannel({ ...editingChannel, description: e.target.value })}
                className="bg-zinc-900 border-zinc-800 rounded-xl min-h-[150px] text-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl font-bold h-12 px-6 border border-zinc-800">Cancel</Button>
            <Button 
              className="rounded-xl h-12 px-8 font-bold bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800"
              onClick={handleEditSave}
            >
              Save Registry Info
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
