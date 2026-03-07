
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, deleteDoc, collection, query, orderBy, limit } from 'firebase/firestore';
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
  ArrowLeft,
  Search,
  ExternalLink,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchYouTubeChannels } from '@/services/youtube-server';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const DEFAULT_IDS = `UCNB_OaI4504v6A6mAnV2S0A
UC9BY472E8Z2YpGsh_m_6WPA
UCv9u_K37S6v3m3N_5fV3DPA`;

export function ChannelHub() {
  const db = useFirestore();
  const { toast } = useToast();
  
  // States
  const [showAddForm, setShowAddForm] = useState(false);
  const [inputText, setInputText] = useState(DEFAULT_IDS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleSync = async () => {
    const ids = extractIds(inputText);
    if (ids.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No IDs found',
        description: 'Please provide valid YouTube Channel IDs starting with UC.',
      });
      return;
    }

    setIsSyncing(true);

    try {
      // YouTube API allows fetching up to 50 IDs at a time
      const chunks = [];
      for (let i = 0; i < ids.length; i += 50) {
        chunks.push(ids.slice(i, i + 50));
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

      toast({
        title: 'Sync Complete',
        description: `Successfully synchronized ${totalSynced} channels.`,
      });
      setShowAddForm(false);
      setInputText('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: error.message || 'An error occurred while connecting to YouTube.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (showAddForm) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowAddForm(false)}
            className="rounded-xl h-10 w-10 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-white">Bulk Channel Sync</h2>
            <p className="text-xs text-zinc-500 uppercase font-black tracking-widest">Add new creators to registry</p>
          </div>
        </div>

        <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
            <div className="flex items-center gap-3">
              <Youtube className="w-6 h-6 text-red-500" />
              <CardTitle className="text-lg font-bold text-white">Registry Input</CardTitle>
            </div>
            <CardDescription className="text-zinc-500 text-sm">
              Paste a list of Channel IDs (e.g., UC...) to fetch their latest metadata and statistics.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                  Detected unique IDs: {extractIds(inputText).length}
                </label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-zinc-600 hover:text-white"
                  onClick={() => setInputText('')}
                >
                  <Trash2 className="w-3 h-3 mr-2" /> Clear List
                </Button>
              </div>
              <Textarea
                placeholder="Paste IDs here (one per line or separated by spaces)"
                className="bg-zinc-900 border-zinc-800 text-white font-mono text-xs min-h-[300px] rounded-2xl p-6 focus:ring-zinc-700 leading-relaxed"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="p-8 bg-zinc-900/10 border-t border-zinc-900 flex justify-end">
            <Button
              className="bg-white text-black hover:bg-zinc-200 rounded-xl font-bold h-12 px-10 transition-transform active:scale-95 flex items-center gap-2"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isSyncing ? 'Processing...' : 'Synchronize Content'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Filter registry..." 
            className="pl-12 bg-zinc-950 border-zinc-900 text-white rounded-2xl h-14 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-white text-black hover:bg-zinc-200 rounded-xl font-bold h-14 px-8 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add New Channels
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isListLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
            <p className="text-zinc-600 font-medium">Loading registry...</p>
          </div>
        ) : filteredChannels?.map((channel) => (
          <Card key={channel.id} className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden hover:border-zinc-700 transition-all group shadow-xl">
            <CardHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-zinc-800 shrink-0 group-hover:scale-105 transition-transform">
                  <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />
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
              <div className="flex items-center gap-2 text-zinc-400">
                <Users className="w-4 h-4 text-zinc-600" />
                <span className="text-xs font-bold">{(channel.subscribersCount / 1000).toFixed(1)}k Subs</span>
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
                  onClick={() => deleteDocumentNonBlocking(doc(db, 'channels', channel.id))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!isListLoading && (!filteredChannels || filteredChannels.length === 0)) && (
          <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-[2.5rem] border-2 border-dashed border-zinc-900 flex flex-col items-center justify-center space-y-4">
             <Youtube className="w-16 h-16 text-zinc-900" />
             <div className="space-y-1">
               <p className="text-zinc-500 font-bold">Channel Registry Empty</p>
               <p className="text-zinc-600 text-xs">Start by adding creators using the bulk sync tool.</p>
             </div>
             <Button variant="outline" onClick={() => setShowAddForm(true)} className="rounded-xl border-zinc-800 text-zinc-400 hover:bg-zinc-900">
               Open Sync Tool
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}
