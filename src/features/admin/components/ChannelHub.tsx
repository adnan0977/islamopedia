
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, query, orderBy, limit, writeBatch } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  AlertCircle
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { fetchYouTubeChannels, fetchYouTubeChannelByHandle } from '@/services/youtube-server';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DEFAULT_IDS = `Islamic History Plus,UCsaR6SnAv97_9MI2JPLcyRA,English,Authentic & Research Stories
Islamic History (Official),UC1mNByYnDzhPesq4RF-jGLQ,English,Pivotal Events & Journeys
The Kohistani,https://youtube.com/@thekohistani,Urdu/English,History & Documentary
Islamic Bayan 2026,UCybKAapNVFBeZyn6DJHQaGA,Urdu,Contemporary Sermons & History
Deen Squad,UCU_9S_kA,English,Youth Culture & Reminders
iLovUAllah,@iLovUAllah,English,Motivational & Inspirational
Duroos.org,UCp4Vf-IOn66Xv,Arabic/English,Classical Scholarly Lectures
Masjid Ribat,UCv9u_K37S6v3m,English,Detailed Seerah & History`;

export function ChannelHub() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [bulkIds, setBulkBulkIds] = useState(DEFAULT_IDS);
  const [singleId, setSingleId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const channelsQuery = useMemoFirebase(() => query(
    collection(db, 'channels'),
    orderBy('title', 'asc'),
    limit(100)
  ), [db]);
  const { data: linkedChannels, isLoading: isLoadingChannels } = useCollection(channelsQuery);

  const filteredChannels = linkedChannels?.filter(ch => 
    ch.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ch.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extractSelectors = (text: string) => {
    const idMatches = text.match(/UC[a-zA-Z0-9_-]{22}/g) || [];
    const handleMatches = text.match(/@[\w.-]+/g) || [];
    const urlMatches = text.match(/youtube\.com\/(@[\w.-]+)/g) || [];
    
    const handlesFromUrls = urlMatches.map(m => m.split('/').pop()).filter(Boolean) as string[];

    return {
      ids: Array.from(new Set(idMatches)),
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

      const batchSize = 10;
      for (let i = 0; i < allResolvedChannels.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = allResolvedChannels.slice(i, i + batchSize);
        chunk.forEach(channel => {
          const channelRef = doc(db, 'channels', channel.id);
          batch.set(channelRef, {
            ...channel,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }, { merge: true });
          totalSynced++;
        });
        await batch.commit();
      }

      toast({ title: 'Sync Complete', description: `Successfully indexed ${totalSynced} channels.` });
      setIsDialogOpen(false);
      setSingleId('');
    } catch (error: any) {
      setSyncError(error.message);
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message || 'Failed to fetch from YouTube.' });
    } finally {
      setIsSyncing(false);
    }
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

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
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
              <DialogDescription className="text-zinc-500 text-sm mt-2">Use a Channel ID, Handle, or full URL to sync spiritual content.</DialogDescription>
            </DialogHeader>
            
            {syncError && (
              <div className="px-10 pt-6">
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-bold">Synchronization Error</AlertTitle>
                  <AlertDescription className="text-xs mt-1">{syncError}</AlertDescription>
                </Alert>
              </div>
            )}

            <Tabs defaultValue="bulk" className="w-full">
              <div className="px-10 pt-8">
                <TabsList className="bg-zinc-900 p-1 rounded-2xl h-14 w-full border border-zinc-800">
                  <TabsTrigger value="bulk" className="flex-1 rounded-xl font-bold h-full border border-transparent data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700">Bulk Import</TabsTrigger>
                  <TabsTrigger value="single" className="flex-1 rounded-xl font-bold h-full border border-transparent data-[state=active]:bg-zinc-800 data-[state=active]:border-zinc-700">Single Lookup</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-10">
                <TabsContent value="bulk" className="m-0 space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Input List</label>
                      <Badge variant="outline" className="border-zinc-800 text-zinc-500">Detects IDs, Handles & URLs</Badge>
                    </div>
                    <Textarea 
                      placeholder="Paste text containing YouTube identifiers..."
                      className="bg-zinc-900 border-zinc-800 text-white font-mono text-xs min-h-[300px] rounded-[1.5rem] p-6 focus:ring-zinc-700 resize-none scrollbar-hide"
                      value={bulkIds}
                      onChange={(e) => setBulkBulkIds(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full h-14 font-bold rounded-2xl text-base flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 shadow-xl border border-white"
                    disabled={isSyncing}
                    onClick={() => handleSync(bulkIds)}
                  >
                    {isSyncing ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
                    Process & Sync All Content
                  </Button>
                </TabsContent>

                <TabsContent value="single" className="m-0 space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Identifier or URL</label>
                    <Input 
                      placeholder="e.g. @TheKohistani or https://youtube.com/..."
                      className="bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14 px-6"
                      value={singleId}
                      onChange={(e) => setSingleId(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full h-14 font-bold rounded-2xl text-base flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 shadow-xl border border-white" 
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
          <Badge variant="outline" className="border-zinc-800 text-[10px] font-black text-zinc-500 rounded-lg px-3 py-1">
            {linkedChannels?.length || 0} Registered
          </Badge>
        </div>
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] py-6 text-zinc-600 pl-10">Creator branding</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Statistics</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 pr-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingChannels ? (
              <TableRow>
                <TableCell colSpan={3} className="h-64 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-zinc-800 mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredChannels?.length ? (
              filteredChannels.map((channel) => (
                <TableRow key={channel.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-24">
                  <TableCell className="pl-10">
                    <div className="flex items-center gap-5">
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-zinc-800 bg-black shrink-0 shadow-lg">
                        {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-zinc-100 truncate text-base flex items-center gap-2">
                          {channel.title}
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 fill-zinc-600" />
                        </span>
                        <code className="text-[10px] text-zinc-600 font-mono truncate tracking-tight">{channel.id}</code>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-zinc-400 font-bold text-sm">
                      <Users className="w-4 h-4 text-zinc-700" />
                      {channel.subscribersCount > 1000 ? (channel.subscribersCount / 1000).toFixed(1) + 'K' : channel.subscribersCount} Subscribers
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <a href={channel.externalUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 text-zinc-600 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800">
                        <ExternalLink className="w-5 h-5" />
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                     <Youtube className="w-16 h-16 text-zinc-900" />
                     <p className="text-zinc-600 font-medium">No spiritual creators found in your directory.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
