"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Youtube, 
  Video as VideoIcon, 
  Book, 
  Trash2, 
  Edit3, 
  Plus, 
  Loader2, 
  LayoutDashboard,
  LogOut,
  Copy,
  CheckCircle2,
  Users,
  Eye,
  Search,
  Mic2,
  ExternalLink,
  ThumbsUp,
  SearchCode,
  Wand2,
  Check,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import { deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarProvider, 
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { cn } from '@/lib/utils';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  Tooltip as RechartsTooltip
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

type AdminTab = 'dashboard' | 'channels' | 'videos' | 'speakers' | 'quran';

export default function AdminPanel() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [copied, setCopied] = useState(false);

  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  const isVerifiedAdmin = !!adminData;

  const channelsRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'channels') : null), [db, isVerifiedAdmin]);
  const { data: channels } = useCollection(channelsRef);

  const videosRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'videos') : null), [db, isVerifiedAdmin]);
  const { data: videos } = useCollection(videosRef);

  const speakersRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'speakers') : null), [db, isVerifiedAdmin]);
  const { data: speakers } = useCollection(speakersRef);

  const surahsRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'quran_surahs') : null), [db, isVerifiedAdmin]);
  const { data: surahs } = useCollection(surahsRef);

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      toast({
        title: "UID Copied",
        description: "Your User ID has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Out Error",
        description: error.message || "Failed to sign out properly.",
      });
    }
  };

  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Verifying access...</p>
      </div>
    );
  }

  if (!user || !isVerifiedAdmin) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-8 bg-background min-h-screen">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
          <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-headline font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Administrative access required. Copy your UID and add it to the <code className="bg-zinc-900 px-1 rounded text-primary">roles_admin</code> collection in Firestore.
          </p>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between gap-4">
           <div className="flex flex-col items-start min-w-0">
             <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Your UID</span>
             <code className="text-xs font-mono truncate w-full text-left">{user?.uid || 'N/A'}</code>
           </div>
           <Button variant="secondary" size="sm" onClick={copyUid} className="rounded-xl">
            {copied ? <CheckCircle2 className="w-4 h-4 text-zinc-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={handleSignOut} className="w-full text-destructive border-zinc-800 rounded-xl font-bold">Sign Out</Button>
          <Button variant="ghost" onClick={() => window.location.href = '/'} className="w-full font-bold">Home</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar className="border-r border-zinc-800 bg-zinc-950">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="text-primary-foreground w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-lg leading-none">Admin Hub</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-black text-white/50">Management</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'channels', label: 'Channels', icon: Youtube },
                    { id: 'videos', label: 'Video Catalog', icon: VideoIcon },
                    { id: 'speakers', label: 'Scholars', icon: Mic2 },
                    { id: 'quran', label: 'Quran Content', icon: Book },
                  ].map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        onClick={() => setActiveTab(item.id as AdminTab)}
                        isActive={activeTab === item.id}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all h-12",
                          activeTab === item.id ? "bg-zinc-800 text-white font-bold" : "text-muted-foreground hover:bg-zinc-900"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-zinc-800">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:bg-destructive/10 rounded-xl font-bold"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto bg-background">
          <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-950/50 sticky top-0 z-10 backdrop-blur-md">
             <h2 className="font-headline font-bold text-2xl tracking-tight">
               {activeTab === 'dashboard' && 'Admin Overview'}
               {activeTab === 'channels' && 'YouTube Channels'}
               {activeTab === 'videos' && 'Video Catalog'}
               {activeTab === 'speakers' && 'Scholar Management'}
               {activeTab === 'quran' && 'Quranic Metadata'}
             </h2>
             <div className="flex items-center gap-4">
               <Button variant="outline" size="sm" className="rounded-xl px-4 h-10 font-bold border-zinc-800 hover:bg-zinc-900" onClick={() => window.location.href = '/'}>Live Site</Button>
             </div>
          </header>

          <main className="p-8 pb-32">
            {activeTab === 'dashboard' && <DashboardOverview channels={channels || []} videos={videos || []} />}
            {activeTab === 'channels' && <ChannelManagement channels={channels || []} existingVideos={videos || []} />}
            {activeTab === 'videos' && <VideoManagement videos={videos || []} channels={channels || []} speakers={speakers || []} />}
            {activeTab === 'speakers' && <SpeakerManagement speakers={speakers || []} />}
            {activeTab === 'quran' && <QuranManagement surahs={surahs || []} />}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function DashboardOverview({ channels, videos }: { channels: any[], videos: any[] }) {
  const uploadData = [
    { month: "Jan", uploads: 12 },
    { month: "Feb", uploads: 19 },
    { month: "Mar", uploads: 15 },
    { month: "Apr", uploads: 22 },
    { month: "May", uploads: 30 },
    { month: "Jun", uploads: 25 },
  ];

  const totalSubs = channels.reduce((acc, curr) => acc + (curr.subscribersCount || 0), 0);
  const totalViews = channels.reduce((acc, curr) => acc + (curr.viewCount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Youtube} label="Channels" value={channels.length} color="text-white" bgColor="bg-zinc-800" />
        <StatCard icon={VideoIcon} label="Videos" value={videos.length} color="text-white" bgColor="bg-zinc-800" />
        <StatCard icon={Users} label="Total Subs" value={`${(totalSubs / 1000000).toFixed(1)}M`} color="text-white" bgColor="bg-zinc-800" />
        <StatCard icon={Eye} label="Total Views" value={`${(totalViews / 1000000).toFixed(1)}M`} color="text-white" bgColor="bg-zinc-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        <Card className="bg-zinc-950 border-zinc-800 shadow-sm xl:col-span-3 rounded-2xl overflow-hidden">
          <CardHeader><CardTitle className="text-lg font-bold">Content Cataloging Growth</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer config={{ uploads: { label: "Videos", color: "hsl(var(--primary))" } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={uploadData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="uploads" stroke="var(--color-uploads)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-uploads)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor }: any) {
  return (
    <Card className="bg-zinc-950 border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-inner", bgColor)}>
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddChannelDialog({ open, onOpenChange, channels, existingVideos }: { open: boolean, onOpenChange: (open: boolean) => void, channels: any[], existingVideos: any[] }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState(0);
  const [currentSyncCount, setCurrentSyncCount] = useState(0);
  const [channelInput, setChannelInput] = useState('');
  const [fetchedData, setFetchedData] = useState<any | null>(null);
  const [view, setView] = useState<'search' | 'videos'>('search');
  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [importingVideoIds, setImportingVideoIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  const existingVideoIds = new Set(existingVideos.map(v => v.id));

  const fetchChannelDetails = async () => {
    let input = channelInput.trim();
    if (!input) {
      setErrors({ channel: "Please enter a channel handle or URL." });
      return;
    }

    if (!apiKey) {
      setErrors({ channel: "YouTube API Key is missing. Please set NEXT_PUBLIC_YOUTUBE_API_KEY." });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      let finalUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&key=${apiKey}`;
      if (input.includes('youtube.com/channel/')) {
        const id = input.split('youtube.com/channel/')[1].split('/')[0].split('?')[0];
        finalUrl += `&id=${id}`;
      } else if (input.includes('youtube.com/@')) {
        const handle = '@' + input.split('youtube.com/@')[1].split('/')[0].split('?')[0];
        finalUrl += `&forHandle=${handle}`;
      } else if (input.startsWith('@')) {
        finalUrl += `&forHandle=${input}`;
      } else if (input.startsWith('UC') && input.length === 24) {
        finalUrl += `&id=${input}`;
      } else {
        finalUrl += `&forHandle=@${input.replace(/^@/, '')}`;
      }

      const response = await fetch(finalUrl);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "YouTube API error.");
      if (!data.items || data.items.length === 0) throw new Error("Channel not found.");

      const item = data.items[0];
      setFetchedData({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        externalUrl: `https://youtube.com/channel/${item.id}`,
        subscribersCount: Number(item.statistics.subscriberCount),
        videoCount: Number(item.statistics.videoCount),
        viewCount: Number(item.statistics.viewCount),
      });
    } catch (error: any) {
      setErrors({ channel: error.message });
    } finally {
      setLoading(false);
    }
  };

  const saveChannel = async () => {
    if (!fetchedData) return;
    
    // Check if channel already linked
    if (channels.some(c => c.id === fetchedData.id)) {
      toast({ title: "Already Linked", description: "This channel is already in your database." });
      await fetchChannelVideos(fetchedData.id);
      setView('videos');
      return;
    }

    setLoading(true);
    try {
      const channelData = { ...fetchedData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setDocumentNonBlocking(doc(db, 'channels', fetchedData.id), channelData, { merge: true });
      toast({ title: "Channel Connected", description: `${fetchedData.title} linked.` });
      await fetchChannelVideos(fetchedData.id);
      setView('videos');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Link Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelVideos = async (channelId: string, token?: string) => {
    const isMore = !!token;
    if (isMore) setLoadingMore(true);
    try {
      let url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=15&type=video`;
      if (token) url += `&pageToken=${token}`;
      const res = await fetch(url);
      const data = await res.json();
      if (isMore) {
        setChannelVideos(prev => [...prev, ...(data.items || [])]);
      } else {
        setChannelVideos(data.items || []);
      }
      setNextPageToken(data.nextPageToken || null);
    } catch (e) {
      toast({ variant: "destructive", title: "Fetch Error" });
    } finally {
      if (isMore) setLoadingMore(false);
    }
  };

  const importVideo = (video: any, silent = false) => {
    if (!user) return;
    const vidId = video.id.videoId;
    
    // Check local duplicate set and global list
    if (importingVideoIds.has(vidId) || existingVideoIds.has(vidId)) return;
    
    setImportingVideoIds(prev => new Set(prev).add(vidId));
    const videoData = {
      id: vidId,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
      externalUrl: `https://www.youtube.com/watch?v=${vidId}`,
      duration: 'PT0S',
      publishedAt: video.snippet.publishedAt,
      channelId: fetchedData.id,
      uploadedByUserId: user.uid,
      viewCount: 0,
      likeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDocumentNonBlocking(doc(db, 'videos', vidId), videoData, { merge: true });
    if (!silent) toast({ title: "Imported", description: video.snippet.title });
  };

  const handleDeepSync = async () => {
    if (!fetchedData || !apiKey) return;
    setIsBulkImporting(true);
    setBulkImportProgress(0);
    setCurrentSyncCount(0);

    const totalToSync = fetchedData.videoCount || 0;
    let currentToken: string | null = null;
    let syncedCount = 0;

    try {
      do {
        let url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${fetchedData.id}&part=snippet,id&order=date&maxResults=50&type=video`;
        if (currentToken) url += `&pageToken=${currentToken}`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message);
        
        const videos = data.items || [];
        for (const video of videos) {
          if (!existingVideoIds.has(video.id.videoId)) {
            importVideo(video, true);
          }
          syncedCount++;
          setCurrentSyncCount(syncedCount);
          if (totalToSync > 0) {
            setBulkImportProgress(Math.min(100, Math.round((syncedCount / totalToSync) * 100)));
          }
        }
        
        currentToken = data.nextPageToken || null;
        await new Promise(r => setTimeout(r, 200));

      } while (currentToken && isBulkImporting);

      toast({ 
        title: "Deep Sync Complete", 
        description: `Cataloged all historical content from ${fetchedData.title}.` 
      });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Sync Error", 
        description: error.message || "Failed to complete deep sync." 
      });
    } finally {
      setIsBulkImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if(!val) { 
        setFetchedData(null); 
        setChannelInput(''); 
        setView('search'); 
        setChannelVideos([]); 
        setNextPageToken(null); 
        setErrors({}); 
        setImportingVideoIds(new Set());
        setIsBulkImporting(false);
        setBulkImportProgress(0);
        setCurrentSyncCount(0);
      }
    }}>
      <DialogContent className={cn("bg-zinc-950 border-zinc-800 p-0 overflow-hidden flex flex-col h-[90vh] md:h-[80vh]", view === 'videos' ? "sm:max-w-[900px]" : "sm:max-w-[450px]")}>
          <DialogHeader className="px-6 py-6 border-b border-zinc-800 bg-zinc-950/50">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {view === 'search' ? <Youtube className="w-5 h-5 text-primary" /> : <RefreshCw className={cn("w-5 h-5 text-primary", isBulkImporting && "animate-spin")} />}
              {view === 'search' ? 'Link Channel' : `Syncing ${fetchedData?.title}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 relative bg-zinc-950 overflow-hidden">
            <ScrollArea className="h-full w-full">
              {view === 'search' ? (
                <div className="grid gap-8 p-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">YouTube Handle or Channel URL</Label>
                    <div className="flex gap-3">
                      <Input 
                        placeholder="@handle or full URL" 
                        value={channelInput} 
                        onChange={(e) => {
                          setChannelInput(e.target.value);
                          if (errors.channel) setErrors({});
                        }} 
                        className={cn("bg-zinc-900 border-zinc-800 h-12 rounded-xl text-sm", errors.channel && "border-destructive")}
                      />
                      <Button onClick={fetchChannelDetails} disabled={loading} variant="secondary" className="h-12 w-12 p-0 rounded-xl">
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                      </Button>
                    </div>
                    {errors.channel && <p className="text-destructive text-[11px] font-medium leading-tight">{errors.channel}</p>}
                  </div>
                  {fetchedData && (
                    <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="w-16 h-16 rounded-full overflow-hidden relative border border-zinc-800 shrink-0 bg-zinc-800">
                        <Image src={fetchedData.thumbnailUrl} alt={fetchedData.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{fetchedData.title}</p>
                        <p className="text-xs text-muted-foreground">{(fetchedData.subscribersCount / 1000).toFixed(1)}K Subs • {fetchedData.videoCount} Videos</p>
                        {channels.some(c => c.id === fetchedData.id) && (
                          <Badge variant="outline" className="mt-2 text-[9px] font-black uppercase tracking-widest bg-zinc-950 text-primary border-primary/20">Linked</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <Button onClick={saveChannel} disabled={loading || !fetchedData} className="w-full h-14 font-bold rounded-xl bg-primary text-primary-foreground text-base">
                    {channels.some(c => c.id === fetchedData?.id) ? 'Continue to Catalog' : 'Connect & Fetch Feed'}
                  </Button>
                </div>
              ) : (
                <div className="p-8 space-y-8">
                  {isBulkImporting && (
                    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-300 shadow-2xl sticky top-0 z-20">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                           <div className="flex flex-col">
                             <span className="font-bold text-sm">Deep Cataloging...</span>
                             <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{currentSyncCount} / {fetchedData?.videoCount || '?'} indexed</span>
                           </div>
                         </div>
                         <span className="text-xs font-mono font-bold text-primary">{bulkImportProgress}%</span>
                       </div>
                       <Progress value={bulkImportProgress} className="h-2 bg-zinc-800" />
                       <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-center">Fetching all historical content from YouTube</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    {channelVideos.map((v) => {
                      const vidId = v.id.videoId;
                      const isImported = importingVideoIds.has(vidId) || existingVideoIds.has(vidId);
                      return (
                        <Card key={vidId} className="overflow-hidden bg-zinc-900 border-zinc-800 rounded-2xl group cursor-default shadow-md hover:border-zinc-700 transition-colors">
                          <div className="aspect-video relative overflow-hidden bg-zinc-800">
                            <Image src={v.snippet.thumbnails.medium.url} alt={v.snippet.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                            {isImported && (
                              <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                                <Check className="w-8 h-8 text-primary-foreground drop-shadow-lg" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4 space-y-4">
                            <p className="text-[11px] font-bold line-clamp-2 leading-tight h-9">{v.snippet.title}</p>
                            <Button 
                              size="sm" 
                              variant={isImported ? "secondary" : "default"}
                              className="w-full h-9 text-[11px] font-bold rounded-xl" 
                              onClick={() => importVideo(v)} 
                              disabled={isImported || isBulkImporting}
                            >
                              {isImported ? 'Cataloged' : 'Import'}
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                  {nextPageToken && !isBulkImporting && (
                    <div className="py-8 flex justify-center">
                      <Button variant="outline" size="sm" onClick={() => fetchChannelVideos(fetchedData.id, nextPageToken)} disabled={loadingMore} className="rounded-xl px-10 h-11 font-bold border-zinc-800 hover:bg-zinc-900">
                        {loadingMore ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Load More Content
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/50 shrink-0 gap-3">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1 h-12 font-bold rounded-xl border-zinc-800 hover:bg-zinc-900" disabled={isBulkImporting}>
              Cancel
            </Button>
            {view === 'videos' && (
               <Button onClick={handleDeepSync} disabled={isBulkImporting} className="flex-1 h-12 font-bold rounded-xl bg-primary text-primary-foreground flex items-center gap-2">
                 {isBulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                 {isBulkImporting ? 'Deep Syncing...' : 'Deep Sync All (History)'}
               </Button>
            )}
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddVideoDialog({ channels, speakers }: { channels: any[], speakers: any[] }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFetched, setIsFetched] = useState(false);
  const [ytInput, setYtInput] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [channelId, setChannelId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [viewCount, setViewCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  const extractVideoId = (input: string) => {
    if (input.includes('v=')) return input.split('v=')[1].split('&')[0];
    if (input.includes('youtu.be/')) return input.split('youtu.be/')[1].split('?')[0];
    if (input.includes('embed/')) return input.split('embed/')[1].split('?')[0];
    return input.trim();
  };

  const handleFetchMetadata = async () => {
    const videoId = extractVideoId(ytInput);
    if (!videoId) {
      setErrors({ ytInput: "Please enter a valid YouTube URL or Video ID." });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`);
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error("Video not found on YouTube.");
      }

      const video = data.items[0];
      setTitle(video.snippet.title);
      setDescription(video.snippet.description);
      setThumbnailUrl(video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url);
      setVideoUrl(`https://www.youtube.com/watch?v=${videoId}`);
      setViewCount(Number(video.statistics.viewCount || 0));
      setLikeCount(Number(video.statistics.likeCount || 0));
      
      const matchingChannel = channels.find(c => c.id === video.snippet.channelId);
      if (matchingChannel) {
        setChannelId(matchingChannel.id);
      }

      setIsFetched(true);
      toast({ title: "Metadata Synced", description: "Video details have been pre-filled." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fetch Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Video title is required.";
    if (!channelId) newErrors.channelId = "Please link this video to a channel.";
    if (selectedSpeakerIds.length === 0) newErrors.speakers = "Please assign at least one scholar.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!user) return;

    const id = extractVideoId(videoUrl) || Math.random().toString(36).substring(7);
    setDocumentNonBlocking(doc(db, 'videos', id), {
      id, title, description, channelId, thumbnailUrl: thumbnailUrl || 'https://picsum.photos/seed/vid/600/400',
      externalUrl: videoUrl, duration: 'PT0S', publishedAt: new Date().toISOString(),
      uploadedByUserId: user.uid, speakerIds: selectedSpeakerIds,
      viewCount: Number(viewCount), likeCount: Number(likeCount),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }, { merge: true });
    
    toast({ title: "Video Cataloged" });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setChannelId(''); setThumbnailUrl(''); setVideoUrl(''); 
    setSelectedSpeakerIds([]); setViewCount(0); setLikeCount(0); setYtInput(''); setIsFetched(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl h-11 px-6 font-bold flex items-center gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          Add Video
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 sm:max-w-[650px] p-0 overflow-hidden flex flex-col max-h-[90vh] border-zinc-800">
        <DialogHeader className="px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
          <DialogTitle className="text-xl font-bold">Manual Video Import</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 bg-zinc-950 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-8">
              {!isFetched ? (
                <div className="space-y-6 py-8">
                  <div className="text-center space-y-3 mb-8">
                    <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto shadow-xl border border-zinc-800">
                      <SearchCode className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg">Import Metadata</h3>
                    <p className="text-xs text-muted-foreground max-w-[320px] mx-auto leading-relaxed">Paste a YouTube URL to automatically fetch details.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Paste YouTube URL here..." 
                      value={ytInput} 
                      onChange={(e) => {
                        setYtInput(e.target.value);
                        if (errors.ytInput) setErrors({});
                      }} 
                      className={cn("bg-zinc-900 border-zinc-800 h-12 rounded-xl text-sm", errors.ytInput && "border-destructive")}
                      disabled={loading}
                    />
                    <Button onClick={handleFetchMetadata} disabled={loading || !ytInput} variant="secondary" className="h-12 px-8 rounded-xl font-bold">
                      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4 mr-2" />}
                      {loading ? '' : 'Fetch'}
                    </Button>
                  </div>
                  {errors.ytInput && <p className="text-destructive text-[11px] font-medium text-center">{errors.ytInput}</p>}
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {thumbnailUrl && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                      <Image src={thumbnailUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  )}

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Video Title <span className="text-destructive">*</span></Label>
                      <Input 
                        placeholder="Title" 
                        value={title} 
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (errors.title) setErrors(prev => ({ ...prev, title: "" }));
                        }} 
                        disabled={loading}
                        className={cn("bg-zinc-900 border-zinc-800 rounded-xl h-11", errors.title && "border-destructive")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Channel Reference <span className="text-destructive">*</span></Label>
                      <Select 
                        value={channelId} 
                        onValueChange={(val) => {
                          setChannelId(val);
                          if (errors.channelId) setErrors(prev => ({ ...prev, channelId: "" }));
                        }} 
                        disabled={loading}
                      >
                        <SelectTrigger className={cn("bg-zinc-900 border-zinc-800 rounded-xl h-11", errors.channelId && "border-destructive")}>
                          <SelectValue placeholder="Select Parent Channel" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] bg-zinc-950 border-zinc-800">
                          {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Initial Views</Label>
                        <Input type="number" value={viewCount} onChange={(e) => setViewCount(Number(e.target.value))} disabled={loading} className="bg-zinc-900 border-zinc-800 rounded-xl h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Initial Likes</Label>
                        <Input type="number" value={likeCount} onChange={(e) => setLikeCount(Number(e.target.value))} disabled={loading} className="bg-zinc-900 border-zinc-800 rounded-xl h-11" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Scholars/Speakers <span className="text-destructive">*</span></Label>
                      <div className={cn(
                        "grid grid-cols-2 gap-2 p-4 bg-zinc-900/50 rounded-2xl max-h-[160px] overflow-auto border transition-colors",
                        errors.speakers ? "border-destructive" : "border-zinc-800"
                      )}>
                        {speakers.map(s => (
                          <div key={s.id} className="flex items-center space-x-3 p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                            <Checkbox 
                              id={`av-s-${s.id}`} 
                              checked={selectedSpeakerIds.includes(s.id)} 
                              disabled={loading}
                              onCheckedChange={(checked) => {
                                setSelectedSpeakerIds(prev => checked ? [...prev, s.id] : prev.filter(x => x !== s.id));
                              }} 
                            />
                            <Label htmlFor={`av-s-${s.id}`} className="text-xs cursor-pointer flex-1 py-1 font-medium">{s.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Video Description</Label>
                      <Textarea 
                        placeholder="Content summary..." 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="min-h-[180px] bg-zinc-900 border-zinc-800 rounded-2xl p-4 text-sm leading-relaxed"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="font-bold rounded-xl border-zinc-800">Cancel</Button>
          {isFetched && (
            <Button onClick={handleSave} className="bg-primary text-primary-foreground font-bold px-10 rounded-xl h-11" disabled={loading}>
              Catalog Video
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSpeakerDialog() {
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    if (!name.trim()) {
      setErrors({ name: "Scholar name is required." });
      return;
    }
    const id = name.toLowerCase().replace(/\s+/g, '-');
    setDocumentNonBlocking(doc(db, 'speakers', id), {
      id, name, bio, profileImageUrl: imageUrl || 'https://picsum.photos/seed/speaker/200', createdAt: new Date().toISOString()
    }, { merge: true });
    toast({ title: "Scholar Profile Created" });
    setOpen(false);
    setName(''); setBio(''); setImageUrl(''); setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) setErrors({}); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl h-11 px-6 font-bold flex items-center gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          Add Scholar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 overflow-hidden flex flex-col max-h-[90vh] p-0 border-zinc-800">
        <DialogHeader className="px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
          <DialogTitle className="text-xl font-bold">New Scholar Profile</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-zinc-950">
          <ScrollArea className="h-full">
            <div className="grid gap-6 p-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Full Name <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="e.g. Mufti Menk" 
                  value={name} 
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({});
                  }} 
                  className={cn("bg-zinc-900 border-zinc-800 rounded-xl h-11", errors.name && "border-destructive")}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Biography</Label>
                <Textarea placeholder="Short bio..." value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[140px] bg-zinc-900 border-zinc-800 rounded-2xl p-4 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Profile Image URL</Label>
                <Input placeholder="Direct image link..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-zinc-900 border-zinc-800 rounded-xl h-11" />
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold rounded-xl border-zinc-800">Cancel</Button>
          <Button onClick={handleSave} className="font-bold rounded-xl bg-primary text-primary-foreground h-11 px-8">Create Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditSpeakerDialog({ speaker }: { speaker: any }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(speaker.name);
  const [bio, setBio] = useState(speaker.bio || '');
  const [imageUrl, setImageUrl] = useState(speaker.profileImageUrl || '');

  const handleUpdate = () => {
    if (!name.trim()) return;
    updateDocumentNonBlocking(doc(db, 'speakers', speaker.id), {
      name, bio, profileImageUrl: imageUrl
    });
    toast({ title: "Profile Updated" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-primary transition-colors rounded-xl"><Edit3 className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 overflow-hidden flex flex-col max-h-[90vh] p-0 border-zinc-800">
        <DialogHeader className="px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
          <DialogTitle className="text-xl font-bold">Edit Scholar Profile</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-zinc-950">
          <ScrollArea className="h-full">
            <div className="grid gap-6 p-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Name <span className="text-destructive">*</span></Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="bg-zinc-900 border-zinc-800 rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[140px] bg-zinc-900 border-zinc-800 rounded-2xl p-4 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Image URL</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-zinc-900 border-zinc-800 rounded-xl h-11" />
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold rounded-xl border-zinc-800">Cancel</Button>
          <Button onClick={handleUpdate} className="font-bold rounded-xl bg-primary text-primary-foreground h-11 px-8">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditChannelDialog({ channel }: { channel: any }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(channel.title);
  const [subs, setSubs] = useState(channel.subscribersCount || 0);

  const handleUpdate = () => {
    if (!title.trim()) return;
    updateDocumentNonBlocking(doc(db, 'channels', channel.id), {
      title, subscribersCount: Number(subs), updatedAt: new Date().toISOString()
    });
    toast({ title: "Channel Meta Updated" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-primary transition-colors rounded-xl"><Edit3 className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 flex flex-col p-0 overflow-hidden max-h-[90vh] border-zinc-800">
        <DialogHeader className="px-6 py-5 border-b border-zinc-800 bg-zinc-950/50"><DialogTitle className="text-xl font-bold">Edit Channel Details</DialogTitle></DialogHeader>
        <div className="flex-1 min-h-0 bg-zinc-950">
          <ScrollArea className="h-full">
            <div className="grid gap-6 p-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Channel Title <span className="text-destructive">*</span></Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-800 rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Subscribers Count</Label>
                <Input type="number" value={subs} onChange={(e) => setSubs(Number(e.target.value))} className="bg-zinc-900 border-zinc-800 rounded-xl h-11" />
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold rounded-xl border-zinc-800">Cancel</Button>
          <Button onClick={handleUpdate} className="font-bold rounded-xl bg-primary text-primary-foreground h-11 px-8">Update Records</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditVideoDialog({ video, channels, speakers }: { video: any, channels: any[], speakers: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || '');
  const [channelId, setChannelId] = useState(video.channelId || '');
  const [viewCount, setViewCount] = useState(video.viewCount || 0);
  const [likeCount, setLikeCount] = useState(video.likeCount || 0);
  const [isTrending, setIsTrending] = useState(video.isTrending || false);
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>(video.speakerIds || []);

  const handleUpdate = () => {
    if (!title.trim() || !channelId) return;
    updateDocumentNonBlocking(doc(db, 'videos', video.id), {
      title, description, channelId, isTrending, speakerIds: selectedSpeakerIds, 
      viewCount: Number(viewCount), likeCount: Number(likeCount),
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Video Updated" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-primary transition-colors rounded-xl"><Edit3 className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 sm:max-w-[650px] p-0 overflow-hidden flex flex-col max-h-[90vh] border-zinc-800">
        <DialogHeader className="px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
          <DialogTitle className="text-xl font-bold">Edit Video Entry</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-zinc-950">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-8">
              {video.thumbnailUrl && (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
                  <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                </div>
              )}
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Video Title <span className="text-destructive">*</span></Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-800 rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Channel <span className="text-destructive">*</span></Label>
                  <Select value={channelId} onValueChange={setChannelId}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl h-11"><SelectValue placeholder="Channel" /></SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-zinc-950 border-zinc-800">{channels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Views</Label>
                    <Input type="number" value={viewCount} onChange={(e) => setViewCount(Number(e.target.value))} className="bg-zinc-900 border-zinc-800 rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Likes</Label>
                    <Input type="number" value={likeCount} onChange={(e) => setLikeCount(Number(e.target.value))} className="bg-zinc-900 border-zinc-800 rounded-xl h-11" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Scholars <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-2 gap-2 p-4 bg-zinc-900/50 rounded-2xl max-h-[160px] overflow-auto border border-zinc-800">
                    {speakers.map(s => (
                      <div key={s.id} className="flex items-center space-x-3 p-2 hover:bg-zinc-800 rounded-xl transition-colors">
                        <Checkbox id={`ev-s-${s.id}`} checked={selectedSpeakerIds.includes(s.id)} onCheckedChange={(checked) => {
                          setSelectedSpeakerIds(prev => checked ? [...prev, s.id] : prev.filter(x => x !== s.id));
                        }} />
                        <Label htmlFor={`ev-s-${s.id}`} className="text-xs cursor-pointer flex-1 py-1 font-medium">{s.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[180px] bg-zinc-900 border-zinc-800 rounded-2xl p-4 text-sm" />
                </div>
                <div className="flex items-center justify-between p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold">Featured / Trending</Label>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Promote on home screen</p>
                  </div>
                  <Switch checked={isTrending} onCheckedChange={setIsTrending} />
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="px-6 py-5 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold rounded-xl border-zinc-800">Cancel</Button>
          <Button onClick={handleUpdate} className="font-bold px-10 rounded-xl bg-primary text-primary-foreground h-11">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelManagement({ channels, existingVideos }: { channels: any[], existingVideos: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'channels', id));
    toast({ title: "Channel Removed" });
  };
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
        <div className="space-y-1">
          <h3 className="font-bold text-lg">YouTube Connections</h3>
          <p className="text-xs text-muted-foreground font-medium">Link channels to auto-import content metadata.</p>
        </div>
        <AddChannelDialog open={isAddOpen} onOpenChange={setIsAddOpen} channels={channels} existingVideos={existingVideos} />
        <Button onClick={() => setIsAddOpen(true)} className="rounded-xl h-11 px-6 font-bold flex items-center gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          Add Channel
        </Button>
      </div>
      <Card className="bg-zinc-950 border-zinc-800 overflow-hidden rounded-2xl shadow-xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800">
              <TableHead className="w-[350px] text-[10px] font-black uppercase tracking-widest py-5">Connected Channel</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Subscribers</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Content Count</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id} className="hover:bg-zinc-900/40 transition-all border-zinc-800 h-20">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-zinc-800 shrink-0 shadow-sm bg-zinc-800">
                      {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                       <span className="font-bold text-base truncate max-w-[220px]">{channel.title}</span>
                       <span className="text-[10px] text-muted-foreground truncate">{channel.id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground font-medium">{channel.subscribersCount?.toLocaleString() || 0}</TableCell>
                <TableCell className="text-muted-foreground font-medium">{channel.videoCount?.toLocaleString() || 0} Videos</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 pr-2">
                    <EditChannelDialog channel={channel} />
                    <DeleteConfirm onConfirm={() => handleDelete(channel.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {channels.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic font-medium">No YouTube channels linked yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function VideoManagement({ videos, channels, speakers }: { videos: any[], channels: any[], speakers: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'videos', id));
    toast({ title: "Video Purged" });
  };
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
        <div className="space-y-1">
          <h3 className="font-bold text-lg">Video Catalog</h3>
          <p className="text-xs text-muted-foreground font-medium">Manage featured content and scholar assignments.</p>
        </div>
        <AddVideoDialog channels={channels} speakers={speakers} />
      </div>
      <Card className="bg-zinc-950 border-zinc-800 overflow-hidden rounded-2xl shadow-xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800">
              <TableHead className="w-[450px] text-[10px] font-black uppercase tracking-widest py-5">Video Metadata</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Parent Channel</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Engagement</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.id} className="hover:bg-zinc-900/40 transition-all border-zinc-800 h-24">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-14 rounded-xl overflow-hidden relative shrink-0 border border-zinc-800 bg-zinc-900 shadow-sm">
                      {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <a href={video.externalUrl} target="_blank" rel="noopener noreferrer" className="truncate max-w-[280px] font-bold text-sm hover:text-primary transition-colors flex items-center gap-2">
                        {video.title}
                        <ExternalLink className="w-3 h-3 opacity-40 shrink-0" />
                      </a>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded">{video.id}</span>
                        {video.isTrending && <span className="text-[9px] text-zinc-900 uppercase font-black tracking-widest bg-primary px-1.5 py-0.5 rounded">Featured</span>}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-bold truncate max-w-[150px]">
                  {channels.find(c => c.id === video.channelId)?.title || 'Unlinked'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground"><Eye className="w-3 h-3" /> {video.viewCount?.toLocaleString() || 0}</div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground"><ThumbsUp className="w-3 h-3" /> {video.likeCount?.toLocaleString() || 0}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 pr-2">
                    <EditVideoDialog video={video} channels={channels} speakers={speakers} />
                    <DeleteConfirm onConfirm={() => handleDelete(video.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {videos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic font-medium">No videos cataloged yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SpeakerManagement({ speakers }: { speakers: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'speakers', id));
    toast({ title: "Scholar Removed" });
  };
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
        <div className="space-y-1">
          <h3 className="font-bold text-lg">Scholar Directory</h3>
          <p className="text-xs text-muted-foreground font-medium">Manage profile info for speakers and scholars.</p>
        </div>
        <AddSpeakerDialog />
      </div>
      <Card className="bg-zinc-950 border-zinc-800 overflow-hidden rounded-2xl shadow-xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800">
              <TableHead className="w-[300px] text-[10px] font-black uppercase tracking-widest py-5">Scholar Identity</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Biography / Profile</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {speakers.map((s) => (
              <TableRow key={s.id} className="hover:bg-zinc-900/40 transition-all border-zinc-800 h-24">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden relative border border-zinc-800 shrink-0 shadow-sm bg-zinc-800">
                      {s.profileImageUrl && <Image src={s.profileImageUrl} alt={s.name} fill className="object-cover" />}
                    </div>
                    <div className="flex flex-col">
                       <span className="font-bold text-base leading-tight">{s.name}</span>
                       <span className="text-[10px] text-muted-foreground font-mono mt-1">{s.id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pt-6 max-w-[450px]">
                  {s.bio || 'No bio.'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 pr-2">
                    <EditSpeakerDialog speaker={s} />
                    <DeleteConfirm onConfirm={() => handleDelete(s.id)} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function DeleteConfirm({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl">
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-zinc-950 border-zinc-800 rounded-3xl shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight">Delete Record?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
            This action is permanent and will remove the document from Firestore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-8 gap-3">
          <AlertDialogCancel className="font-bold rounded-2xl h-12 border-zinc-800 px-8">Keep</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => { e.preventDefault(); onConfirm(); }} 
            className="bg-destructive text-white font-bold h-12 px-8 rounded-2xl hover:bg-destructive/90 transition-all"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function QuranManagement({ surahs }: { surahs: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  return (
    <div className="space-y-8">
      <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
        <h3 className="font-bold text-lg mb-1">Quranic Metadata</h3>
        <p className="text-xs text-muted-foreground font-medium">Review verified Quranic content stored in Firestore.</p>
      </div>
      <Card className="bg-zinc-950 border-zinc-800 overflow-hidden rounded-2xl shadow-xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800">
              <TableHead className="w-20 text-[10px] font-black uppercase tracking-widest py-5">No.</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">English Identity</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Arabic Script</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Ayahs</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surahs.sort((a,b) => a.number - b.number).map((surah) => (
              <TableRow key={surah.id} className="hover:bg-zinc-900/40 transition-all border-zinc-800 h-20">
                <TableCell className="font-black text-xl text-primary opacity-50">{surah.number}</TableCell>
                <TableCell className="font-bold text-base">{surah.nameEnglish}</TableCell>
                <TableCell className="font-arabic text-2xl text-primary">{surah.nameArabic}</TableCell>
                <TableCell className="text-muted-foreground font-bold">{surah.numberOfAyahs} Verses</TableCell>
                <TableCell className="text-right">
                   <DeleteConfirm onConfirm={() => {
                     deleteDocumentNonBlocking(doc(db, 'quran_surahs', surah.id));
                     toast({ title: "Surah Metadata Removed" });
                   }} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
