
'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Youtube, CheckCircle2, AlertCircle, RefreshCw, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchYouTubeChannels } from '@/services/youtube-server';
import Image from 'next/image';

const DEFAULT_IDS = `UCNB_OaI4504v6A6mAnV2S0A
UC9BY472E8Z2YpGsh_m_6WPA
UCv9u_K37S6v3m3N_5fV3DPA
UCp4Vf-IOn66Xv_Xf7oN7tLg
UC4898uN4R6_z5_7_t8A8kXA
UChKk-8-U82XyG-6G_Fw_x7A
UCv_6SAn7tU_z_8m9I7qVvUA
UCrX7_6iO-8q_YvK9vX_7A
UCBMHtZeFf0EJeYr7CXnO5xQ
UC0SpkR2ZkUwbzyq36ZJa_Lg
UCCGvq-qmjFmmMD4e-PLQqGg
UCQHRLH8RQIrdGWMhf5heWiA
UC6hAia1d_zZFl5tgwxDdxUg
UCv9f8_6Y4qN3G7X_U_9S_kA
UCswfDAA0jz-g`;

export function ChannelHub() {
  const db = useFirestore();
  const { toast } = useToast();
  const [inputText, setInputText] = useState(DEFAULT_IDS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const extractIds = (text: string) => {
    // Matches UC followed by 22 characters (standard YouTube Channel ID format)
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
    setResults([]);

    try {
      // YouTube API allows fetching up to 50 IDs at a time
      const chunks = [];
      for (let i = 0; i < ids.length; i += 50) {
        chunks.push(ids.slice(i, i + 50));
      }

      const allFetchedData = [];
      for (const chunk of chunks) {
        const data = await fetchYouTubeChannels(chunk);
        allFetchedData.push(...data);
      }

      // Save to Firestore
      for (const channel of allFetchedData) {
        const channelRef = doc(db, 'channels', channel.id);
        await setDoc(channelRef, {
          ...channel,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }

      setResults(allFetchedData);
      toast({
        title: 'Sync Complete',
        description: `Successfully synchronized ${allFetchedData.length} channels.`,
      });
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
        <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <Youtube className="w-6 h-6 text-red-500" />
            <CardTitle className="text-xl font-bold text-white">YouTube Channel Hub</CardTitle>
          </div>
          <CardDescription className="text-zinc-500 text-sm">
            Paste a list of Channel IDs to fetch statistics and metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                Input Registry
              </label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-zinc-600 hover:text-white"
                onClick={() => setInputText('')}
              >
                <Trash2 className="w-3 h-3 mr-2" /> Clear
              </Button>
            </div>
            <Textarea
              placeholder="Paste UC... IDs here (one per line or mixed in text)"
              className="bg-zinc-900 border-zinc-800 text-white font-mono text-xs min-h-[200px] rounded-2xl p-4 focus:ring-zinc-700"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-zinc-900/10 border-t border-zinc-900 flex justify-between items-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Detected unique IDs: {extractIds(inputText).length}
          </div>
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
            Synchronize Data
          </Button>
        </CardFooter>
      </Card>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((channel) => (
            <Card key={channel.id} className="bg-zinc-950 border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-800">
                  <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white truncate text-sm">{channel.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                      {(channel.subscribersCount / 1000).toFixed(1)}k Subs
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
