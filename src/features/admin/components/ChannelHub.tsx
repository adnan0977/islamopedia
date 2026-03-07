
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

const DEFAULT_IDS = [
  "UCsaR6SnAv97_9MI2JPLcyRA", // Islamic History Plus
  "UC1mNByYnDzhPesq4RF-jGLQ", // Islamic History (Official)
  "UCCBGUffdWwRV0gUqgElkCfw", // The Kohistani
  "UCybKAapNVFBeZyn6DJHQaGA", // Islamic Bayan 2026
  "UCBMHtZeFf0EJeYr7CXnO5xQ", // Deen Squad
  "UC8m7_p6_qD8zU_x7S8F8_xA", // iLovUAllah
  "UCp4Vf-IOn66Xv_Xf7oN7tLg", // Duroos.org
  "UCv9u_K37S6v3m3N_5fV3DPA"  // Masjid Ribat
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Action Row */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search linked channels..."
            className="bg-zinc-950 border-zinc-900 pl-10 rounded-xl h-12 text-white focus:ring-zinc-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-zinc-100 text-black hover:bg-white rounded-2xl font-bold h-12 px-8 shadow-xl transition-all active:scale-95 flex items-center gap-2 w-full md:w-auto"
            >
              <Plus className="w-5 h-5" /> Add New Channels
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] max-w-2xl p-0 overflow-hidden outline-none shadow-2xl">
            <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
              <DialogTitle className="text-2xl font-bold">Import Channels</DialogTitle>
              <DialogDescription className="text-zinc-500">Fetch metadata from YouTube and persist it to Firestore.</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="bulk" className="w-full">
              <div className="px-8 pt-6">
                <TabsList className="bg-zinc-900 p-1 rounded-xl h-12 w-full border border-zinc-800">
                  <TabsTrigger value="bulk" className="flex-1 rounded-lg font-bold">Bulk Sync</TabsTrigger>
                  <TabsTrigger value="single" className="flex-1 rounded-lg font-bold">Single ID</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-8">
                <TabsContent value="bulk" className="m-0 space-y-6">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-600">
                      Channel IDs Found: <span className="text-zinc-300 ml-1">{extractIds(bulkIds).length}</span>
                    </label>
                    <Textarea 
                      placeholder="Paste list of IDs or links..."
                      className="bg-zinc-900 border-zinc-800 text-white font-mono text-[11px] min-h-[200px] rounded-2xl p-4 focus:ring-zinc-700 resize-none scrollbar-hide"
                      value={bulkIds}
                      onChange={(e) => setBulkBulkIds(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-xl text-md flex items-center justify-center gap-2"
                    disabled={isSyncing || extractIds(bulkIds).length === 0}
                    onClick={() => handleSync(extractIds(bulkIds))}
                  >
                    {isSyncing ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
                    Sync All Detected Channels
                  </Button>
                </TabsContent>

                <TabsContent value="single" className="m-0 space-y-6">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-600">YouTube Channel ID</label>
                    <Input 
                      placeholder="e.g. UCp4Vf-IOn66Xv_Xf7oN7tLg"
                      className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-14"
                      value={singleId}
                      onChange={(e) => setSingleId(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-xl text-md flex items-center justify-center gap-2"
                    disabled={isSyncing || !singleId.startsWith('UC')}
                    onClick={() => handleSync([singleId])}
                  >
                    {isSyncing ? <Loader2 className="animate-spin h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                    Fetch & Link Channel
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Linked Channels Registry */}
      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2rem] shadow-2xl">
        <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Youtube className="w-4 h-4 text-red-500" />
            Linked Channels Registry
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {linkedChannels?.length || 0} Entries
          </span>
        </div>
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 text-zinc-500 pl-8">Creator Identity</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Engagement</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingChannels ? (
              <TableRow>
                <TableCell colSpan={3} className="h-60 text-center">
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
                        <code className="text-[9px] text-zinc-700 truncate">{channel.id}</code>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs">
                      <Users className="w-3.5 h-3.5 text-zinc-600" />
                      {(channel.subscribersCount / 1000).toFixed(1)}K
                    </div>
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
                <TableCell colSpan={3} className="h-60 text-center">
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
  );
}
