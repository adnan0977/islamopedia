'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, query, orderBy, limit } from 'firebase/firestore';
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

const DEFAULT_IDS = `Islamic History Plus,UCsaR6SnAv97_9MI2JPLcyRA,English,Authentic & Research Stories
Islamic History (Official),UC1mNByYnDzhPesq4RF-jGLQ,English,Pivotal Events & Journeys
The Kohistani,UCCBGUffdWwRV0gUqgElkCfw,Urdu/English,History & Documentary
Islamic Bayan 2026,UCybKAapNVFBeZyn6DJHQaGA,Urdu,Contemporary Sermons & History
Deen Squad,UCU_9S_kA,English,Youth Culture & Reminders
iLovUAllah,UC8f_6Y4qN3G7X,English,Motivational & Inspirational
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
    const matches = text.match(/UC[a-zA-Z0-9_-]{10,24}/g);
    return Array.from(new Set(matches || []));
  };

  const handleSync = async (idsToSync: string[]) => {
    if (idsToSync.length === 0) {
      toast({ variant: 'destructive', title: 'No IDs found', description: 'Please provide valid YouTube Channel IDs.' });
      return;
    }

    setIsSyncing(true);
    try {
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

      toast({ title: 'Sync Complete', description: `Successfully indexed ${totalSynced} channels.` });
      setIsDialogOpen(false);
      setSingleId('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'API Error', description: error.message || 'Failed to fetch from YouTube.' });
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-700 rounded-full h-14 px-8 font-bold shadow-2xl transition-all active:scale-95 flex items-center gap-3 group"
            >
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                <Plus className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-sm">Add New Channels</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] max-w-4xl p-0 overflow-hidden outline-none shadow-2xl">
            <DialogHeader className="p-10 border-b border-zinc-900 bg-zinc-900/40">
              <DialogTitle className="text-2xl font-bold">Import Creators</DialogTitle>
              <DialogDescription className="text-zinc-500 text-sm mt-2">Add YouTube channels to your directory to sync spiritual content.</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="bulk" className="w-full">
              <div className="px-10 pt-8">
                <TabsList className="bg-zinc-900 p-1 rounded-2xl h-14 w-full border border-zinc-800">
                  <TabsTrigger value="bulk" className="flex-1 rounded-xl font-bold h-full data-[state=active]:bg-zinc-800">Bulk Sync</TabsTrigger>
                  <TabsTrigger value="single" className="flex-1 rounded-xl font-bold h-full data-[state=active]:bg-zinc-800">Single ID</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-10">
                <TabsContent value="bulk" className="m-0 space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Detected IDs</label>
                      <span className="bg-zinc-900 px-3 py-1 rounded-full text-[10px] font-bold text-zinc-300 border border-zinc-800">
                        {extractIds(bulkIds).length} Unique
                      </span>
                    </div>
                    <Textarea 
                      placeholder="Paste list of YouTube Channel IDs..."
                      className="bg-zinc-900 border-zinc-800 text-white font-mono text-xs min-h-[300px] rounded-[1.5rem] p-6 focus:ring-zinc-700 resize-none scrollbar-hide"
                      value={bulkIds}
                      onChange={(e) => setBulkBulkIds(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-2xl text-base flex items-center justify-center gap-2 shadow-xl"
                    disabled={isSyncing || extractIds(bulkIds).length === 0}
                    onClick={() => handleSync(extractIds(bulkIds))}
                  >
                    {isSyncing ? <Loader2 className="animate-spin h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
                    Sync All Detected Channels
                  </Button>
                </TabsContent>

                <TabsContent value="single" className="m-0 space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Channel ID</label>
                    <Input 
                      placeholder="UC..."
                      className="bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14 px-6"
                      value={singleId}
                      onChange={(e) => setSingleId(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-2xl text-base flex items-center justify-center gap-2 shadow-xl"
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
                      <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 text-zinc-600 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all">
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
