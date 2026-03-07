'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';

// Pre-sanitized list of unique IDs from user's provided data
const DEFAULT_IDS = [
  "UCNB_OaI4504v6A6mAnV2S0A",
  "UC9BY472E8Z2YpGsh_m_6WPA",
  "UCv9u_K37S6v3m3N_5fV3DPA",
  "UCp4Vf-IOn66Xv_Xf7oN7tLg",
  "UC4898uN4R6_z5_7_t8A8kXA",
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
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [bulkIds, setBulkBulkIds] = useState(DEFAULT_IDS);
  const [singleId, setSingleId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const extractIds = (text: string) => {
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
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-500">
      <Card className="max-w-xl w-full bg-zinc-950 border-zinc-900 rounded-[3rem] shadow-2xl p-12 text-center space-y-8 border-2 border-dashed border-zinc-800">
        <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Youtube className="w-10 h-10 text-zinc-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">YouTube Integration</h2>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto">
            Link creator channels to automatically synchronize spiritual content and scholars.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full bg-zinc-100 text-black hover:bg-white rounded-2xl font-bold h-16 text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <Plus className="w-6 h-6" /> Add New Channels
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] max-w-2xl p-0 overflow-hidden outline-none shadow-2xl">
            <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
              <DialogTitle className="text-2xl font-bold">Import Content Library</DialogTitle>
              <DialogDescription className="text-zinc-500">Enter YouTube Channel IDs to fetch metadata and start indexing.</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="bulk" className="w-full">
              <div className="px-8 pt-6">
                <TabsList className="bg-zinc-900 p-1 rounded-xl h-12 w-full border border-zinc-800">
                  <TabsTrigger value="single" className="flex-1 rounded-lg font-bold"><Globe className="w-4 h-4 mr-2" /> Single ID</TabsTrigger>
                  <TabsTrigger value="bulk" className="flex-1 rounded-lg font-bold"><Database className="w-4 h-4 mr-2" /> Bulk Sync</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-8">
                <TabsContent value="single" className="m-0 space-y-6">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-600">YouTube Channel ID</label>
                    <Input 
                      placeholder="e.g. UCp4Vf-IOn66Xv_Xf7oN7tLg"
                      className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-14 focus:ring-zinc-700"
                      value={singleId}
                      onChange={(e) => setSingleId(e.target.value)}
                    />
                    <p className="text-[10px] text-zinc-600 italic">Example: UC + 22 alphanumeric characters.</p>
                  </div>
                  <Button 
                    className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-xl text-md"
                    disabled={isSyncing || !singleId.startsWith('UC')}
                    onClick={() => handleSync([singleId])}
                  >
                    {isSyncing ? <Loader2 className="animate-spin mr-2" /> : <Link2 className="mr-2 h-5 w-5" />}
                    Link Channel
                  </Button>
                </TabsContent>

                <TabsContent value="bulk" className="m-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-600">
                        IDs Detected: <span className="text-zinc-300 ml-1">{extractIds(bulkIds).length}</span>
                      </label>
                      <Button variant="link" className="text-zinc-600 text-xs h-auto p-0 hover:text-white" onClick={() => setBulkBulkIds('')}>Clear All</Button>
                    </div>
                    <Textarea 
                      placeholder="Paste list of IDs or links..."
                      className="bg-zinc-900 border-zinc-800 text-white font-mono text-[11px] min-h-[200px] rounded-2xl p-6 focus:ring-zinc-700 scrollbar-hide"
                      value={bulkIds}
                      onChange={(e) => setBulkBulkIds(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-bold rounded-xl text-md"
                    disabled={isSyncing || extractIds(bulkIds).length === 0}
                    onClick={() => handleSync(extractIds(bulkIds))}
                  >
                    {isSyncing ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2 h-5 w-5" />}
                    Sync All Detected Channels
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}