"use client";

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Wand2
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
  DialogDescription,
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
import { Separator } from '@/components/ui/separator';

type AdminTab = 'dashboard' | 'channels' | 'videos' | 'speakers' | 'quran';

export default function AdminPanel() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [copied, setCopied] = useState(false);

  // Admin Check
  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  // Collections - Only query if user is verified admin to avoid permission errors
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
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-headline font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            Administrative access required. To grant access, copy your UID below and add it as a document in the <code className="bg-secondary px-1 rounded text-primary">roles_admin</code> collection in Firestore.
          </p>
        </div>

        <div className="bg-secondary/50 p-4 rounded-2xl border border-border flex items-center justify-between gap-4">
           <div className="flex flex-col items-start min-w-0">
             <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Your UID</span>
             <code className="text-xs font-mono truncate w-full text-left">{user?.uid || 'N/A'}</code>
           </div>
           <Button variant="secondary" size="sm" onClick={copyUid}>
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={handleSignOut} className="w-full text-destructive">Sign Out</Button>
          <Button variant="ghost" onClick={() => window.location.href = '/'} className="w-full">Home</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar className="border-r border-border bg-card">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="text-primary-foreground w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-lg leading-none">Admin Hub</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Management</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Menu</SidebarGroupLabel>
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
                          "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                          activeTab === item.id ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto bg-background">
          <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-card/50 sticky top-0 z-10 backdrop-blur-md">
             <h2 className="font-headline font-bold text-2xl">
               {activeTab === 'dashboard' && 'Admin Overview'}
               {activeTab === 'channels' && 'YouTube Channels'}
               {activeTab === 'videos' && 'Video Catalog'}
               {activeTab === 'speakers' && 'Scholar Management'}
               {activeTab === 'quran' && 'Quranic Metadata'}
             </h2>
             <div className="flex items-center gap-4">
               <Button variant="outline" size="sm" className="rounded-xl px-4 h-10 font-bold" onClick={() => window.location.href = '/'}>Live Site</Button>
             </div>
          </header>

          <main className="p-8 pb-20">
            {activeTab === 'dashboard' && <DashboardOverview channels={channels || []} videos={videos || []} />}
            {activeTab === 'channels' && <ChannelManagement channels={channels || []} />}
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

  const categoryData = [
    { name: "Recitations", value: 400, fill: "hsl(var(--primary))" },
    { name: "Islamic", value: 300, fill: "hsl(var(--accent))" },
    { name: "Lectures", value: 200, fill: "hsl(var(--chart-3))" },
    { name: "Vlogs", value: 100, fill: "hsl(var(--chart-4))" },
  ];

  const totalSubs = channels.reduce((acc, curr) => acc + (curr.subscribersCount || 0), 0);
  const totalViews = channels.reduce((acc, curr) => acc + (curr.viewCount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Youtube} label="Channels" value={channels.length} color="text-primary" bgColor="bg-primary/10" />
        <StatCard icon={VideoIcon} label="Videos" value={videos.length} color="text-white" bgColor="bg-white/10" />
        <StatCard icon={Users} label="Total Subs" value={`${(totalSubs / 1000000).toFixed(1)}M`} color="text-primary" bgColor="bg-primary/10" />
        <StatCard icon={Eye} label="Total Views" value={`${(totalViews / 1000000).toFixed(1)}M`} color="text-primary" bgColor="bg-primary/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        <Card className="bg-card border-border shadow-sm xl:col-span-2">
          <CardHeader><CardTitle className="text-lg">Content Growth</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer config={{ uploads: { label: "Uploads", color: "hsl(var(--primary))" } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={uploadData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="uploads" stroke="var(--color-uploads)" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader><CardTitle className="text-lg">Category Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor }: any) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bgColor)}>
          <Icon className={cn("w-6 h-6", color)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-bold uppercase">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddChannelDialog({ open, onOpenChange, btnClass }: { open: boolean, onOpenChange: (open: boolean) => void, btnClass?: string }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [channelInput, setChannelInput] = useState('');
  const [fetchedData, setFetchedData] = useState<any | null>(null);
  const [view, setView] = useState<'search' | 'videos'>('search');
  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [importingVideoIds, setImportingVideoIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  const fetchChannelDetails = async () => {
    let input = channelInput.trim();
    if (!input) {
      setErrors({ channel: "Please enter a channel handle or URL." });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      let baseUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&key=${apiKey}`;
      let finalUrl = baseUrl;
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
      toast({ variant: "destructive", title: "Fetch Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const saveChannel = async () => {
    if (!fetchedData) return;
    setLoading(true);
    try {
      const channelData = { ...fetchedData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setDocumentNonBlocking(doc(db, 'channels', fetchedData.id), channelData, { merge: true });
      toast({ title: "Channel Saved", description: `${fetchedData.title} added.` });
      await fetchChannelVideos(fetchedData.id);
      setView('videos');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelVideos = async (channelId: string, token?: string) => {
    const isMore = !!token;
    if (isMore) setLoadingMore(true);
    try {
      let url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=12&type=video`;
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
      toast({ variant: "destructive", title: "Video Fetch Error", description: "Could not load videos." });
    } finally {
      if (isMore) setLoadingMore(false);
    }
  };

  const importVideo = (video: any) => {
    if (!user) return;
    const vidId = video.id.videoId;
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
    toast({ title: "Video Imported", description: video.snippet.title });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if(!val) { setFetchedData(null); setChannelInput(''); setView('search'); setChannelVideos([]); setNextPageToken(null); setErrors({}); }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className={btnClass}>
          <Plus className="w-4 h-4" />
          Add Channel
        </Button>
      </DialogTrigger>
      <DialogContent className={cn("bg-card overflow-hidden flex flex-col max-h-[90vh] p-0 border-border", view === 'videos' ? "sm:max-w-[800px]" : "sm:max-w-[425px]")}>
          <DialogHeader className="px-6 py-4 border-b border-border bg-secondary/10">
            <DialogTitle>{view === 'search' ? 'Add Channel' : `Import Videos`}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              {view === 'search' ? (
                <div className="grid gap-6 p-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Channel Handle / URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="@handle or URL" 
                        value={channelInput} 
                        onChange={(e) => {
                          setChannelInput(e.target.value);
                          if (errors.channel) setErrors({});
                        }} 
                        className={cn("bg-secondary/50", errors.channel && "border-destructive")}
                      />
                      <Button onClick={fetchChannelDetails} disabled={loading} variant="secondary">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    {errors.channel && <p className="text-destructive text-[10px] font-medium mt-1">{errors.channel}</p>}
                  </div>
                  {fetchedData && (
                    <div className="p-4 bg-secondary/50 rounded-xl flex items-center gap-4 border border-border/50 animate-in fade-in slide-in-from-bottom-2">
                      <div className="w-12 h-12 rounded-full overflow-hidden relative border border-border">
                        <Image src={fetchedData.thumbnailUrl} alt={fetchedData.title} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{fetchedData.title}</p>
                        <p className="text-xs text-muted-foreground">{(fetchedData.subscribersCount / 1000).toFixed(1)}K Subscribers</p>
                      </div>
                    </div>
                  )}
                  <Button onClick={saveChannel} disabled={loading || !fetchedData} className="w-full h-11 font-bold">
                    Save & Import Videos
                  </Button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {channelVideos.map((v) => (
                      <Card key={v.id.videoId} className="overflow-hidden bg-secondary/20 border-border/50">
                        <div className="aspect-video relative">
                          <Image src={v.snippet.thumbnails.medium.url} alt={v.snippet.title} fill className="object-cover" />
                        </div>
                        <CardContent className="p-2 space-y-2">
                          <p className="text-[10px] font-bold line-clamp-2 leading-tight h-8">{v.snippet.title}</p>
                          <Button 
                            size="sm" 
                            variant={importingVideoIds.has(v.id.videoId) ? "secondary" : "default"}
                            className="w-full h-7 text-[10px] font-bold" 
                            onClick={() => importVideo(v)} 
                            disabled={importingVideoIds.has(v.id.videoId)}
                          >
                            {importingVideoIds.has(v.id.videoId) ? 'Imported' : 'Import'}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {nextPageToken && (
                    <div className="py-4 flex justify-center">
                      <Button variant="outline" size="sm" onClick={() => fetchChannelVideos(fetchedData.id, nextPageToken)} disabled={loadingMore}>
                        {loadingMore ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                        Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border bg-secondary/10 shrink-0">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full h-11 font-bold">Close</Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddVideoDialog({ channels, speakers, btnClass }: { channels: any[], speakers: any[], btnClass?: string }) {
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
        throw new Error("Video not found.");
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
      toast({ title: "Metadata Fetched", description: "Video details populated." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fetch Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Please provide a video title.";
    if (!channelId) newErrors.channelId = "Please select a channel.";
    if (selectedSpeakerIds.length === 0) newErrors.speakers = "Please select at least one scholar.";

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
    
    toast({ title: "Video Added" });
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
        <Button size="sm" className={btnClass}>
          <Plus className="w-4 h-4" />
          Add Video
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card sm:max-w-[600px] p-0 overflow-hidden flex flex-col max-h-[90vh] border-border">
        <DialogHeader className="px-6 py-4 border-b border-border bg-secondary/10">
          <DialogTitle>Add New Video</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {!isFetched ? (
                <div className="space-y-4 py-4">
                  <div className="text-center space-y-2 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <SearchCode className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold">Fetch YouTube Metadata</h3>
                    <p className="text-xs text-muted-foreground max-w-[300px] mx-auto">Enter a video URL or ID to automatically populate the title, description, and stats.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="YouTube URL or Video ID" 
                      value={ytInput} 
                      onChange={(e) => {
                        setYtInput(e.target.value);
                        if (errors.ytInput) setErrors({});
                      }} 
                      className={cn("bg-secondary/50 h-11", errors.ytInput && "border-destructive")}
                      disabled={loading}
                    />
                    <Button onClick={handleFetchMetadata} disabled={loading || !ytInput} variant="secondary" className="h-11 px-6">
                      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4 mr-2" />}
                      {loading ? '' : 'Fetch'}
                    </Button>
                  </div>
                  {errors.ytInput && <p className="text-destructive text-[10px] font-medium text-center">{errors.ytInput}</p>}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {thumbnailUrl && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-border shadow-inner bg-secondary/30">
                      <Image src={thumbnailUrl} alt="Thumbnail preview" fill className="object-cover" />
                    </div>
                  )}

                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">Video Title <span className="text-destructive">*</span></Label>
                      <Input 
                        placeholder="Enter title" 
                        value={title} 
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (errors.title) setErrors(prev => ({ ...prev, title: "" }));
                        }} 
                        disabled={loading}
                        className={cn("bg-secondary/50", errors.title && "border-destructive")}
                      />
                      {errors.title && <p className="text-destructive text-[10px] font-medium">{errors.title}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">Channel <span className="text-destructive">*</span></Label>
                      <Select 
                        value={channelId} 
                        onValueChange={(val) => {
                          setChannelId(val);
                          if (errors.channelId) setErrors(prev => ({ ...prev, channelId: "" }));
                        }} 
                        disabled={loading}
                      >
                        <SelectTrigger className={cn("bg-secondary/50", errors.channelId && "border-destructive")}>
                          <SelectValue placeholder="Select Channel" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.channelId && <p className="text-destructive text-[10px] font-medium">{errors.channelId}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">View Count</Label>
                        <Input type="number" value={viewCount} onChange={(e) => setViewCount(Number(e.target.value))} disabled={loading} className="bg-secondary/50" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Like Count</Label>
                        <Input type="number" value={likeCount} onChange={(e) => setLikeCount(Number(e.target.value))} disabled={loading} className="bg-secondary/50" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">Scholars <span className="text-destructive">*</span></Label>
                      <div className={cn(
                        "grid grid-cols-2 gap-2 p-3 bg-secondary/30 rounded-xl max-h-[120px] overflow-auto border transition-colors",
                        errors.speakers ? "border-destructive" : "border-border"
                      )}>
                        {speakers.map(s => (
                          <div key={s.id} className="flex items-center space-x-2 p-1 hover:bg-secondary/50 rounded-lg transition-colors">
                            <Checkbox 
                              id={`add-vid-s-${s.id}`} 
                              checked={selectedSpeakerIds.includes(s.id)} 
                              disabled={loading}
                              onCheckedChange={(checked) => {
                                setSelectedSpeakerIds(prev => {
                                  const next = checked ? [...prev, s.id] : prev.filter(x => x !== s.id);
                                  if (errors.speakers && next.length > 0) setErrors(prevErr => ({ ...prevErr, speakers: "" }));
                                  return next;
                                });
                              }} 
                            />
                            <Label htmlFor={`add-vid-s-${s.id}`} className="text-xs cursor-pointer flex-1 py-1">{s.name}</Label>
                          </div>
                        ))}
                      </div>
                      {errors.speakers && <p className="text-destructive text-[10px] font-medium">{errors.speakers}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Video URL</Label>
                      <Input placeholder="https://youtube.com/..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={loading} className="bg-secondary/50" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                      <Textarea 
                        placeholder="Video description..." 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="min-h-[150px] bg-secondary/50"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-secondary/10 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="font-bold">Cancel</Button>
          {isFetched && (
            <Button onClick={handleSave} className="bg-primary font-bold px-8" disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              Save Video
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSpeakerDialog({ btnClass }: { btnClass?: string }) {
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
    toast({ title: "Scholar Added" });
    setOpen(false);
    setName(''); setBio(''); setImageUrl(''); setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) setErrors({}); }}>
      <DialogTrigger asChild>
        <Button size="sm" className={btnClass}>
          <Plus className="w-4 h-4" />
          Add Scholar
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card overflow-hidden flex flex-col max-h-[90vh] p-0 border-border">
        <DialogHeader className="px-6 py-4 border-b border-border bg-secondary/10">
          <DialogTitle>Add Scholar</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="grid gap-5 p-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Full Name <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Full Name" 
                  value={name} 
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({});
                  }} 
                  className={cn("bg-secondary/50", errors.name && "border-destructive")}
                />
                {errors.name && <p className="text-destructive text-[10px] font-medium mt-1">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Bio</Label>
                <Textarea placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[120px] bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Image URL</Label>
                <Input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-secondary/50" />
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border bg-secondary/10 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold">Cancel</Button>
          <Button onClick={handleSave} className="font-bold">Save Scholar</Button>
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpdate = () => {
    if (!name.trim()) {
      setErrors({ name: "Scholar name is required." });
      return;
    }
    updateDocumentNonBlocking(doc(db, 'speakers', speaker.id), {
      name, bio, profileImageUrl: imageUrl
    });
    toast({ title: "Scholar Updated" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-primary transition-colors"><Edit3 className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent className="bg-card overflow-hidden flex flex-col max-h-[90vh] p-0 border-border">
        <DialogHeader className="px-6 py-4 border-b border-border bg-secondary/10">
          <DialogTitle>Edit Scholar</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="grid gap-5 p-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Name <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Name" 
                  value={name} 
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({});
                  }} 
                  className={cn("bg-secondary/50", errors.name && "border-destructive")}
                />
                {errors.name && <p className="text-destructive text-[10px] font-medium mt-1">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Bio</Label>
                <Textarea placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[120px] bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Image URL</Label>
                <Input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="bg-secondary/50" />
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border bg-secondary/10 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold">Cancel</Button>
          <Button onClick={handleUpdate} className="font-bold">Update Scholar</Button>
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpdate = () => {
    if (!title.trim()) {
      setErrors({ title: "Channel title is required." });
      return;
    }
    updateDocumentNonBlocking(doc(db, 'channels', channel.id), {
      title, subscribersCount: Number(subs), updatedAt: new Date().toISOString()
    });
    toast({ title: "Channel Updated" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-primary transition-colors"><Edit3 className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent className="bg-card flex flex-col p-0 overflow-hidden max-h-[90vh] border-border">
        <DialogHeader className="px-6 py-4 border-b border-border bg-secondary/10"><DialogTitle>Edit Channel</DialogTitle></DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="grid gap-5 p-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Title <span className="text-destructive">*</span></Label>
                <Input 
                  value={title} 
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errors.title) setErrors({});
                  }} 
                  className={cn("bg-secondary/50", errors.title && "border-destructive")}
                />
                {errors.title && <p className="text-destructive text-[10px] font-medium mt-1">{errors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Subscribers</Label>
                <Input type="number" value={subs} onChange={(e) => setSubs(Number(e.target.value))} className="bg-secondary/50" />
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border bg-secondary/10 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold">Cancel</Button>
          <Button onClick={handleUpdate} className="font-bold">Update Channel</Button>
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpdate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Please provide a video title.";
    if (!channelId) newErrors.channelId = "Please select a channel.";
    if (selectedSpeakerIds.length === 0) newErrors.speakers = "Please select at least one scholar.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

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
        <Button variant="ghost" size="icon" className="hover:text-primary transition-colors"><Edit3 className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent className="bg-card sm:max-w-[600px] p-0 overflow-hidden flex flex-col max-h-[90vh] border-border">
        <DialogHeader className="px-6 py-4 border-b border-border bg-secondary/10">
          <DialogTitle>Edit Video</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {video.thumbnailUrl && (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-border shadow-inner bg-secondary/30">
                  <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                </div>
              )}
              <div className="grid gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">Video Title <span className="text-destructive">*</span></Label>
                  <Input 
                    value={title} 
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors(prev => ({ ...prev, title: "" }));
                    }} 
                    className={cn("bg-secondary/50", errors.title && "border-destructive")}
                  />
                  {errors.title && <p className="text-destructive text-[10px] font-medium">{errors.title}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">Channel <span className="text-destructive">*</span></Label>
                  <Select 
                    value={channelId} 
                    onValueChange={(val) => {
                      setChannelId(val);
                      if (errors.channelId) setErrors(prev => ({ ...prev, channelId: "" }));
                    }}
                  >
                    <SelectTrigger className={cn("bg-secondary/50", errors.channelId && "border-destructive")}>
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">{channels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.channelId && <p className="text-destructive text-[10px] font-medium">{errors.channelId}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Views</Label>
                    <Input type="number" value={viewCount} onChange={(e) => setViewCount(Number(e.target.value))} className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Likes</Label>
                    <Input type="number" value={likeCount} onChange={(e) => setLikeCount(Number(e.target.value))} className="bg-secondary/50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">Scholars <span className="text-destructive">*</span></Label>
                  <div className={cn(
                    "grid grid-cols-2 gap-2 p-3 bg-secondary/30 rounded-xl max-h-[150px] overflow-auto border transition-colors",
                    errors.speakers ? "border-destructive" : "border-border"
                  )}>
                    {speakers.map(s => (
                      <div key={s.id} className="flex items-center space-x-2 p-1 hover:bg-secondary/50 rounded-lg transition-colors">
                        <Checkbox id={`edit-s-${s.id}`} checked={selectedSpeakerIds.includes(s.id)} onCheckedChange={(checked) => {
                          setSelectedSpeakerIds(prev => {
                            const next = checked ? [...prev, s.id] : prev.filter(x => x !== s.id);
                            if (errors.speakers && next.length > 0) setErrors(prevErr => ({ ...prevErr, speakers: "" }));
                            return next;
                          });
                        }} />
                        <Label htmlFor={`edit-s-${s.id}`} className="text-xs cursor-pointer flex-1 py-1">{s.name}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.speakers && <p className="text-destructive text-[10px] font-medium">{errors.speakers}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[150px] bg-secondary/50" />
                </div>
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl border border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Trending Content</Label>
                    <p className="text-[10px] text-muted-foreground">Feature this video in the trending section.</p>
                  </div>
                  <Switch checked={isTrending} onCheckedChange={setIsTrending} />
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border bg-secondary/10 shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)} className="font-bold">Cancel</Button>
          <Button onClick={handleUpdate} className="font-bold px-8">Update Video</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelManagement({ channels }: { channels: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);

  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'channels', id));
    toast({ title: "Removed", description: "Channel removed." });
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddChannelDialog open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen} btnClass="bg-primary text-primary-foreground font-bold px-6 h-10 rounded-xl transition-all shadow-md active:scale-95" />
      </div>
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="w-[300px]">Channel</TableHead>
              <TableHead>Subscribers</TableHead>
              <TableHead>Videos</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id} className="hover:bg-secondary/20 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden relative border border-border shrink-0">
                      {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                    </div>
                    <span className="font-bold truncate max-w-[200px]">{channel.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{channel.subscribersCount?.toLocaleString() || 0}</TableCell>
                <TableCell className="text-muted-foreground">{channel.videoCount?.toLocaleString() || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EditChannelDialog channel={channel} />
                    <DeleteConfirm onConfirm={() => handleDelete(channel.id)} />
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

function VideoManagement({ videos, channels, speakers }: { videos: any[], channels: any[], speakers: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'videos', id));
    toast({ title: "Removed" });
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddVideoDialog channels={channels} speakers={speakers} btnClass="bg-primary text-primary-foreground font-bold px-6 h-10 rounded-xl transition-all shadow-md active:scale-95" />
      </div>
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="w-[400px]">Video</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Likes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.id} className="hover:bg-secondary/20 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-12 rounded-lg overflow-hidden relative shrink-0 border border-border bg-secondary/30">
                      {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <a 
                        href={video.externalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="truncate max-w-[250px] font-bold hover:text-primary transition-colors flex items-center gap-1"
                      >
                        {video.title}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                      <span className="text-[10px] text-muted-foreground uppercase">{video.id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {channels.find(c => c.id === video.channelId)?.title || 'Unknown'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Eye className="w-3 h-3 text-muted-foreground" />
                    {video.viewCount?.toLocaleString() || 0}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <ThumbsUp className="w-3 h-3 text-muted-foreground" />
                    {video.likeCount?.toLocaleString() || 0}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EditVideoDialog video={video} channels={channels} speakers={speakers} />
                    <DeleteConfirm onConfirm={() => handleDelete(video.id)} />
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

function SpeakerManagement({ speakers }: { speakers: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'speakers', id));
    toast({ title: "Removed" });
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddSpeakerDialog btnClass="bg-primary text-primary-foreground font-bold px-6 h-10 rounded-xl transition-all shadow-md active:scale-95" />
      </div>
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead>Scholar</TableHead>
              <TableHead className="w-[500px]">Bio</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {speakers.map((s) => (
              <TableRow key={s.id} className="hover:bg-secondary/20 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden relative border border-border shrink-0">
                      <Image src={s.profileImageUrl} alt={s.name} fill className="object-cover" />
                    </div>
                    <span className="font-bold">{s.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-[500px]">{s.bio}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
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
      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader><AlertDialogTitle className="text-xl">Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">This action cannot be undone. This will permanently remove the record from our database.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); onConfirm(); }} className="bg-destructive font-bold text-white hover:bg-destructive/90">Delete Record</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function QuranManagement({ surahs }: { surahs: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'quran_surahs', id));
    toast({ title: "Removed" });
  };
  return (
    <Card className="bg-card border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow>
            <TableHead className="w-20">No.</TableHead>
            <TableHead>English Name</TableHead>
            <TableHead>Arabic Name</TableHead>
            <TableHead>Ayahs</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {surahs.sort((a,b) => a.number - b.number).map((surah) => (
            <TableRow key={surah.id} className="hover:bg-secondary/20 transition-colors">
              <TableCell className="font-bold text-primary">{surah.number}</TableCell>
              <TableCell className="font-bold">{surah.nameEnglish}</TableCell>
              <TableCell className="font-arabic text-xl text-primary">{surah.nameArabic}</TableCell>
              <TableCell className="text-muted-foreground">{surah.numberOfAyahs}</TableCell>
              <TableCell className="text-right">
                 <DeleteConfirm onConfirm={() => handleDelete(surah.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
