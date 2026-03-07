
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  Youtube, 
  RefreshCw, 
  Plus, 
  Globe,
  Database,
  Link2,
  Search,
  CheckCircle2,
  ExternalLink,
  Users
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
import { fetchYouTubeChannels } from '@/services/youtube-server';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

// Prioritized list based on the user's latest request
const DEFAULT_IDS = [
  "UCsaR6SnAv97_9MI2JPLcyRA", // Islamic History Plus
  "UC1mNByYnDzhPesq4RF-jGLQ", // Islamic History (Official)
  "UCCBGUffdWwRV0gUqgElkCfw", // The Kohistani
  "UCybKAapNVFBeZyn6DJHQaGA", // Islamic Bayan 2026
  "UCp4Vf-IOn66Xv_Xf7oN7tLg", // Duroos.org
  "UCv9u_K37S6v3m3N_5fV3DPA", // Masjid Ribat
  "UC8m7_p6_qD8zU_x7S8F8_xA", // iLovUAllah
  "UCNB_OaI4504v6A6mAnV2S0A", // Quran Central
  "UCBMHtZeFf0EJeYr7CXnO5xQ"  // Additional
].join('\n');

export function ChannelHub() {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [bulkIds, setBulkBulkIds] = useState(DEFAULT_IDS);
  const [singleId, setSingleId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch already linked channels
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

  const extractIds = (text: string) => {
    // Regex for standard YouTube Channel IDs (UC + 22 characters)
    const matches = text.match(/UC[a-zA-Z0-9_-]{22}/g);
    return Array.from(new Set(matches || []));
  };

  const handleSync = async (idsToSync: string[]) => {
    if (idsToSync.length === 0) {
      toast({ variant: 'destructive', title: 'No IDs found', description: 'Please provide valid YouTube Channel IDs starting with "UC".' });
      return;
    }

    setIsSyncing(true);
    try {
      // YouTube Data API allows up to 50 IDs per request
      const chunks = [];
      for (let i = 0; i < idsToSync.length; i += 50) {
        chunks.push(idsToSync.slice(i, i + 50));
      }

      let totalSynced = 0;
      for (const chunk of chunks) {
        const data = await fetchYouTubeChannels(chunk);
        for (const channel of data) {
          const channelRef = doc(db, 'channels', channel.id);
          await setDoc(channelRef, {
            ...channel,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }, { merge: true });
          totalSynced++;
        }
      }

      toast({ title: 'Sync Complete', description: `Successfully indexed ${totalSynced} channels into the registry.` });
      setIsDialogOpen(false);
      setSingleId('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'API Error', description: error.message || 'Could not connect to YouTube Data API.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Top Action Card */}
      <Card className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] shadow-2xl p-10 border-2 border-dashed border-zinc-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
              <Youtube className="w-8 h-8 text-zinc-500" />
            </div>
            <div className="text-left space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Channel Synchronization</h2>
              <p className="text-zinc-500 text-sm max-w-sm">
                Index creators to populate your spiritual feed and scholar directory.
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-zinc-100 text-black hover:bg-white rounded-2xl font-bold h-14 px-10 shadow-xl transition-all active:scale-95 flex items-center gap-3 shrink-0"
              >
                <Plus className="w-5 h-5" /> Add New Channels
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] max-w-2xl p-0 overflow-hidden outline-none shadow-2xl">
              <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                <DialogTitle className="text-2xl font-bold">Import Content Registry</DialogTitle>
                <DialogDescription className="text-zinc-500">Fetch metadata from YouTube and persist it to Firestore.</DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="bulk" className="w-full">
                <div className="px-8 pt-6">
                  <TabsList className="bg-zinc-900 p-1 rounded-xl h-12 w-full border border-zinc-800">
                    <TabsTrigger value="bulk" className="flex-1 rounded-lg font-bold"><Database className="w-4 h-4 mr-2" /> Bulk Sync</TabsTrigger>
                    <TabsTrigger value="single" className="flex-1 rounded-lg font-bold"><Globe className="w-4 h-4 mr-2" /> Single ID</TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8">
                  <TabsContent value="bulk" className="m-0 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-600">
                          IDs Detected: <span className="text-zinc-300 ml-1">{extractIds(bulkIds).length}</span>
                        </label>
                        <Button variant="link" className="text-zinc-600 text-xs h-auto p-0 hover:text-white" onClick={() => setBulkBulkIds('')}>Clear Input</Button>
                      </div>
                      <Textarea 
                        placeholder="Paste list of IDs or links..."
                        className="bg-zinc-900 border-zinc-800 text-white font-mono text-[11px] min-h-[250px] rounded-2xl p-6 focus:ring-zinc-700 scrollbar-hide resize-none"
                        value={bulkIds}
                        onChange={(e) => setBulkBulkIds(e.target.value)}
                      />
                    </div>
                    <div className="pt-2">
                      <Button 
                        className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-xl text-md flex items-center justify-center gap-2 shadow-lg"
                        disabled={isSyncing || extractIds(bulkIds).length === 0}
                        onClick={() => handleSync(extractIds(bulkIds))}
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="animate-spin h-5 w-5" />
                            Indexing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-5 w-5" />
                            Sync All Detected Channels
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="single" className="m-0 space-y-6">
                    <div className="space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-600">Specific YouTube Channel ID</label>
                      <Input 
                        placeholder="e.g. UCp4Vf-IOn66Xv_Xf7oN7tLg"
                        className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-14 focus:ring-zinc-700"
                        value={singleId}
                        onChange={(e) => setSingleId(e.target.value)}
                      />
                      <p className="text-[10px] text-zinc-600 italic px-1">Example: UC followed by 22 alphanumeric characters.</p>
                    </div>
                    <div className="pt-2">
                      <Button 
                        className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-xl text-md flex items-center justify-center gap-2 shadow-lg"
                        disabled={isSyncing || !singleId.startsWith('UC') || singleId.length < 24}
                        onClick={() => handleSync([singleId])}
                      >
                        {isSyncing ? <Loader2 className="animate-spin h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                        Fetch & Link Channel
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Linked Channels Registry */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-white">Linked Channels</h3>
            <span className="bg-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-zinc-800">
              {linkedChannels?.length || 0} Total
            </span>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input 
              placeholder="Search linked channels..."
              className="bg-zinc-950 border-zinc-900 pl-10 rounded-xl h-11 text-white focus:ring-zinc-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2rem] shadow-2xl">
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-900 hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-zinc-500 pl-8">Creator Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Subscribers</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Registry ID</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingChannels ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-60 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-800 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredChannels?.length ? (
                filteredChannels.map((channel) => (
                  <TableRow key={channel.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-20">
                    <TableCell className="pl-8">
                      <div className="flex items-center gap-4">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-zinc-800 bg-black shrink-0">
                          {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-zinc-100 truncate flex items-center gap-1.5">
                            {channel.title}
                            <CheckCircle2 className="w-3 h-3 text-zinc-600 fill-zinc-600" />
                          </span>
                          <span className="text-[10px] text-zinc-600 font-medium truncate max-w-[200px]">{channel.description || 'No description available.'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-zinc-400 font-bold">
                        <Users className="w-3.5 h-3.5 text-zinc-600" />
                        {(channel.subscribersCount / 1000).toFixed(1)}K
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[9px] font-mono text-zinc-700 bg-zinc-900/50 px-2 py-1 rounded-md">{channel.id}</code>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <a href={channel.externalUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-zinc-600 hover:text-white hover:bg-zinc-900">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                       <Youtube className="w-12 h-12 text-zinc-900" />
                       <p className="text-zinc-600 font-medium">No linked channels found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
