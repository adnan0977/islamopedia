
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

// Sanitized list based on the latest user request
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-500">
      <Card className="max-w-xl w-full bg-zinc-950 border-zinc-900 rounded-[3rem] shadow-2xl p-12 text-center space-y-8 border-2 border-dashed border-zinc-800">
        <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Youtube className="w-10 h-10 text-zinc-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Channel Synchronizer</h2>
          <p className="text-zinc-500 text-sm max-w-xs mx-auto">
            Index YouTube creator channels to populate your spiritual feed and scholar directory.
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
      </Card>
    </div>
  );
}
