
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  Youtube, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Search,
  ExternalLink,
  Users,
  Settings2,
  Database,
  Globe,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { fetchYouTubeChannels } from '@/services/youtube-server';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Badge } from '@/components/ui/badge';

// Sanitized unique IDs from user's provided list
const SANITIZED_DEFAULT_IDS = [
  "UCNB_OaI4504v6A6mAnV2S0A",
  "UC9BY472E8Z2YpGsh_m_6WPA",
  "UCv9u_K37S6v3m3N_5fV3DPA",
  "UCp4Vf-IOn66Xv_Xf7oN7tLg",
  "UC4898uN4R6_z5_7_t8A8kXA",
  "UCzK8AJKYkkao",
  "UChKk-8-U82XyG-6G_Fw_x7A",
  "UCv_6SAn7tU_z_8m9I7qVvUA",
  "UC8m7_p6_qD8zU_x7S8F8_xA",
  "UCv9f8_6Y4qN3G7X_U_9S_kA",
  "UCfSmrkM_O8Z2YpGsh_m_6WPA",
  "UCrX7_6iO-8q_YvK9vX_7A",
  "UCmS7nO1n7A_w9D7A_U_9S_kA",
  "UCuT7_8m7_p6_qD8zU_x7S8F8",
  "UCiZL26Scf_8m7_p6_qD8zU_x",
  "UCBMHtZeFf0EJeYr7CXnO5xQ",
  "UCswfDAA0jz-g",
  "UC0SpkR2ZkUwbzyq36ZJa_Lg",
  "UCCGvq-qmjFmmMD4e-PLQqGg",
  "UCQHRLH8RQIrdGWMhf5heWiA",
  "UC6hAia1d_zZFl5tgwxDdxUg",
  "UC7akDG0W4i-8",
  "UCMad1VGxhLz0",
  "UCA7NJDbK4nnU",
  "UCza9svcr3"
].join('\n');

export function ChannelHub() {
  const db = useFirestore();
  const { toast } = useToast();
  
  // States
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkIds, setBulkBulkIds] = useState(SANITIZED_DEFAULT_IDS);
  const [singleId, setSingleId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch Existing Channels
  const channelsQuery = useMemoFirebase(() => query(
    collection(db, 'channels'),
    orderBy('title', 'asc'),
    limit(100)
  ), [db]);
  const { data: existingChannels, isLoading: isListLoading } = useCollection(channelsQuery);

  const filteredChannels = existingChannels?.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extractIds = (text: string) => {
    const matches = text.match(/UC[a-zA-Z0-9_-]{22}/g);
    return Array.from(new Set(matches || []));
  };

  const handleSync = async (idsToSync: string[]) => {
    if (idsToSync.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid IDs', description: 'Please provide at least one valid Channel ID.' });
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
      toast({ variant: 'destructive', title: 'Sync Failed', description: error.message || 'API Connection error.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Action Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-950 p-8 rounded-3xl border border-zinc-900 shadow-2xl">
        <div className="space-y-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-3">
            <Database className="w-6 h-6 text-zinc-500" />
            Channel Registry
          </h2>
          <p className="text-sm text-zinc-500 font-medium">Manage spiritual content creators and indexed libraries</p>
        </div>

        <div className="flex items-center gap-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-zinc-100 text-black hover:bg-white rounded-xl font-bold h-14 px-10 flex items-center gap-2 shadow-xl transition-transform active:scale-95"
              >
                <Plus className="w-5 h-5" /> Add New Channels
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl max-w-2xl p-0 overflow-hidden outline-none">
              <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                <DialogTitle className="text-xl font-bold">Import Creator Content</DialogTitle>
                <DialogDescription className="text-zinc-500">Connect YouTube channels to your reflection platform.</DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="bulk" className="w-full">
                <div className="px-8 pt-6">
                  <TabsList className="bg-zinc-900 p-1 rounded-xl h-12 w-full border border-zinc-800">
                    <TabsTrigger value="single" className="flex-1 rounded-lg font-bold"><Globe className="w-4 h-4 mr-2" /> Single ID</TabsTrigger>
                    <TabsTrigger value="bulk" className="flex-1 rounded-lg font-bold"><Database className="w-4 h-4 mr-2" /> Bulk Import</TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8">
                  <TabsContent value="single" className="m-0 space-y-6">
                    <div className="space-y-4">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-600">Channel Identifier</label>
                      <Input 
                        placeholder="e.g. UCp4Vf-IOn66Xv_Xf7oN7tLg"
                        className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-14"
                        value={singleId}
                        onChange={(e) => setSingleId(e.target.value)}
                      />
                      <p className="text-[10px] text-zinc-600 italic">Enter the unique 'UC' string found in the YouTube channel URL.</p>
                    </div>
                    <Button 
                      className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-xl"
                      disabled={isSyncing || !singleId.startsWith('UC')}
                      onClick={() => handleSync([singleId])}
                    >
                      {isSyncing ? <Loader2 className="animate-spin mr-2" /> : <Link2 className="mr-2 h-4 w-4" />}
                      Link Channel
                    </Button>
                  </TabsContent>

                  <TabsContent value="bulk" className="m-0 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-600">IDs Detected: {extractIds(bulkIds).length}</label>
                        <Button variant="link" className="text-zinc-600 text-xs h-auto p-0" onClick={() => setBulkBulkIds('')}>Clear</Button>
                      </div>
                      <Textarea 
                        placeholder="Paste list of IDs..."
                        className="bg-zinc-900 border-zinc-800 text-white font-mono text-xs min-h-[250px] rounded-2xl p-6 focus:ring-zinc-700 scrollbar-hide"
                        value={bulkIds}
                        onChange={(e) => setBulkBulkIds(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-xl"
                      disabled={isSyncing || extractIds(bulkIds).length === 0}
                      onClick={() => handleSync(extractIds(bulkIds))}
                    >
                      {isSyncing ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Sync All Detected Channels
                    </Button>
                  </TabsContent>
                </div>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Registry Search & List */}
      <div className="space-y-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search linked channels..." 
            className="pl-12 bg-zinc-950 border-zinc-900 text-white rounded-2xl h-14 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isListLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
              <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">Accessing Database...</p>
            </div>
          ) : filteredChannels?.map((channel) => (
            <Card key={channel.id} className="bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden hover:border-zinc-700 transition-all group shadow-xl">
              <CardHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-zinc-800 shrink-0 group-hover:scale-105 transition-transform bg-zinc-900">
                    {channel.thumbnailUrl && (
                      <img src={channel.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-bold text-white truncate">{channel.title}</CardTitle>
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                    <CardDescription className="text-[10px] text-zinc-600 font-mono truncate">{channel.id}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Users className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-xs font-bold">{(channel.subscribersCount / 1000).toFixed(1)}k Subs</span>
                  </div>
                  <Badge variant="outline" className="w-fit border-zinc-800 text-[8px] font-black uppercase text-zinc-600">
                    {channel.videoCount} Videos
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <a href={channel.externalUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-zinc-600 hover:text-white hover:bg-zinc-900">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-xl h-10 w-10 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm('Permanently remove this channel from registry?')) {
                        deleteDocumentNonBlocking(doc(db, 'channels', channel.id));
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!isListLoading && (!filteredChannels || filteredChannels.length === 0)) && (
            <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-[3rem] border-2 border-dashed border-zinc-900 flex flex-col items-center justify-center space-y-6">
               <Youtube className="w-20 h-20 text-zinc-900" />
               <div className="space-y-2">
                 <p className="text-zinc-400 font-bold text-xl">Registry Empty</p>
                 <p className="text-zinc-600 text-sm max-w-xs mx-auto">Start building your spiritual library by connecting YouTube channels using the button above.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
