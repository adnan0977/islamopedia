
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
  Settings,
  LogOut,
  ChevronRight,
  Copy,
  CheckCircle2,
  TrendingUp,
  Users,
  Eye,
  PieChart as PieChartIcon,
  Search,
  Check,
  X,
  AlertTriangle,
  Mic2
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from '@/lib/utils';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Bar, 
  BarChart, 
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

type AdminTab = 'dashboard' | 'channels' | 'videos' | 'speakers' | 'quran' | 'settings';

export default function AdminPanel() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [copied, setCopied] = useState(false);
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);

  // Admin Check
  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  // Collections
  const channelsRef = useMemoFirebase(() => (user && adminData ? collection(db, 'channels') : null), [db, user, adminData]);
  const { data: channels } = useCollection(channelsRef);

  const videosRef = useMemoFirebase(() => (user && adminData ? collection(db, 'videos') : null), [db, user, adminData]);
  const { data: videos } = useCollection(videosRef);

  const speakersRef = useMemoFirebase(() => (user && adminData ? collection(db, 'speakers') : null), [db, user, adminData]);
  const { data: speakers } = useCollection(speakersRef);

  const surahsRef = useMemoFirebase(() => (user && adminData ? collection(db, 'quran_surahs') : null), [db, user, adminData]);
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
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying administrative access...</p>
      </div>
    );
  }

  if (!user || !adminData) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-8">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-headline font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            You do not have administrative privileges. To grant <b>{user?.email}</b> access, copy the UID below and add it to the <code className="bg-secondary px-1 rounded text-primary">roles_admin</code> collection in your Firebase Console.
          </p>
        </div>

        <div className="bg-secondary/50 p-4 rounded-2xl border border-border flex items-center justify-between gap-4 group">
           <div className="flex flex-col items-start min-w-0">
             <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Your User UID</span>
             <code className="text-xs font-mono truncate w-full text-left">{user?.uid || 'N/A'}</code>
           </div>
           <Button 
            variant="secondary" 
            size="sm" 
            className="shrink-0"
            onClick={copyUid}
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {!user ? (
            <Button onClick={() => window.location.href = '/login'} className="w-full h-12 font-bold">
              Login as Admin
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={handleSignOut} 
              className="w-full h-12 font-bold text-destructive hover:bg-destructive/10"
            >
              Sign Out
            </Button>
          )}
          <Button variant="ghost" onClick={() => window.location.href = '/'} className="w-full">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-border bg-card">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-lg leading-none">Admin Hub</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Management</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Main Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab('dashboard')}
                      isActive={activeTab === 'dashboard'}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                        activeTab === 'dashboard' ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab('channels')}
                      isActive={activeTab === 'channels'}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                        activeTab === 'channels' ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      <Youtube className="w-5 h-5" />
                      <span>Channels</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab('videos')}
                      isActive={activeTab === 'videos'}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                        activeTab === 'videos' ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      <VideoIcon className="w-5 h-5" />
                      <span>Video Catalog</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab('speakers')}
                      isActive={activeTab === 'speakers'}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                        activeTab === 'speakers' ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      <Mic2 className="w-5 h-5" />
                      <span>Speakers</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab('quran')}
                      isActive={activeTab === 'quran'}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                        activeTab === 'quran' ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      <Book className="w-5 h-5" />
                      <span>Quran Content</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-2 py-3 bg-secondary/50 rounded-xl mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">{user.email}</span>
                <span className="text-[10px] text-muted-foreground">Admin</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto bg-background/50 backdrop-blur-sm">
          <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/50 sticky top-0 z-10 backdrop-blur-md">
             <div className="flex items-center gap-2">
               <h2 className="font-headline font-bold text-lg">
                 {activeTab === 'dashboard' && 'Admin Overview'}
                 {activeTab === 'channels' && 'YouTube Channels'}
                 {activeTab === 'videos' && 'Video Catalog'}
                 {activeTab === 'speakers' && 'Speakers'}
                 {activeTab === 'quran' && 'Quranic Metadata'}
                 {activeTab === 'settings' && 'System Settings'}
               </h2>
             </div>
             <div className="flex items-center gap-4">
               {activeTab === 'channels' && <AddChannelDialog open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen} />}
               {activeTab === 'videos' && <AddVideoDialog channels={channels || []} speakers={speakers || []} />}
               {activeTab === 'speakers' && <AddSpeakerDialog />}
               <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>View Live Site</Button>
             </div>
          </header>

          <main className="p-8">
            {activeTab === 'dashboard' && <DashboardOverview channels={channels || []} videos={videos || []} />}
            {activeTab === 'channels' && <ChannelManagement channels={channels || []} isAddOpen={isAddChannelOpen} setIsAddOpen={setIsAddChannelOpen} />}
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
    { name: "Vlogs", value: 400, fill: "hsl(var(--primary))" },
    { name: "Islamic", value: 300, fill: "hsl(var(--accent))" },
    { name: "Tech", value: 200, fill: "hsl(var(--chart-3))" },
    { name: "Travel", value: 100, fill: "hsl(var(--chart-4))" },
  ];

  const totalSubs = channels.reduce((acc, curr) => acc + (curr.subscribersCount || 0), 0);
  const totalViews = channels.reduce((acc, curr) => acc + (curr.viewCount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Youtube className="text-primary w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Channels</p>
              <p className="text-2xl font-bold">{channels.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <VideoIcon className="text-accent w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Videos</p>
              <p className="text-2xl font-bold">{videos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Users className="text-green-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Total Subs</p>
              <p className="text-2xl font-bold">{(totalSubs / 1000000).toFixed(1)}M</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
              <Eye className="text-red-500 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Total Views</p>
              <p className="text-2xl font-bold">{(totalViews / 1000000).toFixed(1)}M</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        <Card className="bg-card border-border shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Content Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer config={{ uploads: { label: "Uploads", color: "hsl(var(--primary))" } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={uploadData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="uploads" stroke="var(--color-uploads)" strokeWidth={3} dot={{ fill: "var(--color-uploads)", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-accent" />
              Category Mix
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
               {categoryData.map(c => (
                 <div key={c.name} className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.fill }} />
                   <span className="text-xs font-medium text-muted-foreground">{c.name}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AddChannelDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
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

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  const fetchChannelDetails = async () => {
    let input = channelInput.trim();
    if (!input) return;

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDocumentNonBlocking(doc(db, 'videos', vidId), videoData, { merge: true });
    toast({ title: "Video Imported", description: video.snippet.title });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if(!val) { setFetchedData(null); setChannelInput(''); setView('search'); setChannelVideos([]); setNextPageToken(null); }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Add Channel
        </Button>
      </DialogTrigger>
      <DialogContent className={cn("bg-card border-border transition-all duration-300", view === 'videos' ? "sm:max-w-[800px]" : "sm:max-w-[425px]")}>
          <DialogHeader>
            <DialogTitle>{view === 'search' ? 'Add YouTube Channel' : `Import Videos`}</DialogTitle>
          </DialogHeader>

          {view === 'search' ? (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label>Channel ID / Handle / URL</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. @AJ.Official" 
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    className="bg-secondary border-none" 
                  />
                  <Button onClick={fetchChannelDetails} disabled={loading} size="icon" variant="secondary">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              {fetchedData && (
                <Card className="bg-secondary/30 border-none">
                  <CardContent className="pt-6 flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-primary">
                      {fetchedData.thumbnailUrl && <Image src={fetchedData.thumbnailUrl} alt={fetchedData.title} fill className="object-cover" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="font-bold text-sm truncate">{fetchedData.title}</p>
                      <p className="text-xs text-muted-foreground">{fetchedData.subscribersCount.toLocaleString()} Subs</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Button onClick={saveChannel} disabled={loading || !fetchedData} className="w-full">
                Confirm & Save Channel
              </Button>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <ScrollArea className="h-[450px] pr-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {channelVideos.map((video) => {
                    const isImported = importingVideoIds.has(video.id.videoId);
                    return (
                      <Card key={video.id.videoId} className="overflow-hidden bg-secondary/20 border-border group relative">
                        <div className="aspect-video relative">
                          <Image src={video.snippet.thumbnails.medium.url} alt={video.snippet.title} fill className="object-cover" />
                        </div>
                        <CardContent className="p-2 space-y-2">
                          <p className="text-[10px] font-bold line-clamp-2">{video.snippet.title}</p>
                          <Button 
                            variant={isImported ? "secondary" : "default"} 
                            size="sm" 
                            className="w-full h-7 text-[10px]"
                            onClick={() => importVideo(video)}
                            disabled={isImported}
                          >
                            {isImported ? 'Imported' : 'Import'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {nextPageToken && (
                  <div className="py-6 flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => fetchChannelVideos(fetchedData.id, nextPageToken)} disabled={loadingMore}>
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Load More
                    </Button>
                  </div>
                )}
              </ScrollArea>
              <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">Close</Button>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}

function AddVideoDialog({ channels, speakers }: { channels: any[], speakers: any[] }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [channelId, setChannelId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>([]);

  const handleSave = () => {
    if (!user || !title || !channelId) return;
    const id = Math.random().toString(36).substring(7);
    const videoData = {
      id,
      title,
      description,
      channelId,
      thumbnailUrl: thumbnailUrl || 'https://picsum.photos/seed/vid/600/400',
      externalUrl: videoUrl,
      duration: 'PT0S',
      publishedAt: new Date().toISOString(),
      uploadedByUserId: user.uid,
      speakerIds: selectedSpeakerIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDocumentNonBlocking(doc(db, 'videos', id), videoData, { merge: true });
    toast({ title: "Video Added", description: title });
    setOpen(false);
    setTitle(''); setDescription(''); setChannelId(''); setThumbnailUrl(''); setVideoUrl(''); setSelectedSpeakerIds([]);
  };

  const toggleSpeaker = (id: string) => {
    setSelectedSpeakerIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-accent text-accent-foreground font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Add Video
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manually Add Video</DialogTitle>
          <DialogDescription>Enter video metadata for the global catalog.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Video Title" className="bg-secondary border-none" />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger className="bg-secondary border-none">
                  <SelectValue placeholder="Select Channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Thumbnail URL</Label>
            <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." className="bg-secondary border-none" />
          </div>
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." className="bg-secondary border-none" />
          </div>
          <div className="space-y-2">
            <Label>Speakers</Label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-secondary/30 rounded-xl max-h-[120px] overflow-auto">
              {speakers.map(s => (
                <div key={s.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`add-vid-speaker-${s.id}`} 
                    checked={selectedSpeakerIds.includes(s.id)} 
                    onCheckedChange={() => toggleSpeaker(s.id)}
                  />
                  <Label htmlFor={`add-vid-speaker-${s.id}`} className="text-xs">{s.name}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Video description..." className="bg-secondary border-none h-20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Video</Button>
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

  const handleSave = () => {
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    setDocumentNonBlocking(doc(db, 'speakers', id), {
      id,
      name,
      bio,
      profileImageUrl: imageUrl || 'https://picsum.photos/seed/speaker/200',
      createdAt: new Date().toISOString()
    }, { merge: true });
    toast({ title: "Speaker Added", description: `${name} has been added.` });
    setOpen(false);
    setName(''); setBio(''); setImageUrl('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Add Speaker
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Speaker</DialogTitle>
          <DialogDescription>Create a profile for a scholar or reciter.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="bg-secondary border-none" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short biography..." className="bg-secondary border-none" />
          </div>
          <div className="space-y-2">
            <Label>Profile Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="bg-secondary border-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Speaker</Button>
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
    updateDocumentNonBlocking(doc(db, 'channels', channel.id), {
      title,
      subscribersCount: Number(subs),
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Channel Updated" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-primary">
          <Edit3 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Channel</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Channel Name</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-none" />
          </div>
          <div className="space-y-2">
            <Label>Subscriber Count</Label>
            <Input type="number" value={subs} onChange={(e) => setSubs(Number(e.target.value))} className="bg-secondary border-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate}>Save Changes</Button>
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
  const [isTrending, setIsTrending] = useState(video.isTrending || false);
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>(video.speakerIds || []);

  const handleUpdate = () => {
    updateDocumentNonBlocking(doc(db, 'videos', video.id), {
      title,
      description,
      channelId,
      isTrending,
      speakerIds: selectedSpeakerIds,
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Video Updated" });
    setOpen(false);
  };

  const toggleSpeaker = (id: string) => {
    setSelectedSpeakerIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-primary"><Edit3 className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Video Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Video Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-none" />
          </div>
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger className="bg-secondary border-none">
                <SelectValue placeholder="Select Channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Speakers</Label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-secondary/30 rounded-xl max-h-[150px] overflow-auto">
              {speakers.map(s => (
                <div key={s.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`speaker-${s.id}`} 
                    checked={selectedSpeakerIds.includes(s.id)} 
                    onCheckedChange={() => toggleSpeaker(s.id)}
                  />
                  <Label htmlFor={`speaker-${s.id}`} className="text-xs">{s.name}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-none min-h-[100px]" />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
            <Label>Trending Status</Label>
            <Switch checked={isTrending} onCheckedChange={setIsTrending} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelManagement({ channels }: { channels: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'channels', id));
    toast({ title: "Deleted", description: "Channel removed." });
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="py-4">Channel</TableHead>
              <TableHead>Subscribers</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden relative">
                      {channel.thumbnailUrl && <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />}
                    </div>
                    {channel.title}
                  </div>
                </TableCell>
                <TableCell>{channel.subscribersCount?.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                   <div className="flex justify-end gap-1">
                     <EditChannelDialog channel={channel} />
                     <AlertDialog>
                       <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                       <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Channel?</AlertDialogTitle><AlertDialogDescription>This removes the channel and its metadata.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(channel.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                     </AlertDialog>
                   </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function VideoManagement({ videos, channels, speakers }: { videos: any[], channels: any[], speakers: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'videos', id));
    toast({ title: "Deleted" });
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="py-4">Title</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.id}>
                <TableCell className="font-medium line-clamp-1 max-w-[300px]">{video.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{channels.find(c => c.id === video.channelId)?.title || 'Unknown'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EditVideoDialog video={video} channels={channels} speakers={speakers} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Video?</AlertDialogTitle><AlertDialogDescription>Remove this video record from database.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(video.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SpeakerManagement({ speakers }: { speakers: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'speakers', id));
    toast({ title: "Deleted", description: "Speaker removed." });
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="py-4">Name</TableHead>
              <TableHead>Bio</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {speakers.map((speaker) => (
              <TableRow key={speaker.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden relative">
                      <Image src={speaker.profileImageUrl} alt={speaker.name} fill className="object-cover" />
                    </div>
                    {speaker.name}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground line-clamp-1 max-w-[400px]">{speaker.bio}</TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Speaker?</AlertDialogTitle><AlertDialogDescription>This removes the speaker profile.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(speaker.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function QuranManagement({ surahs }: { surahs: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(db, 'quran_surahs', id));
    toast({ title: "Deleted" });
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="py-4">No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surahs.sort((a,b) => a.number - b.number).map((surah) => (
              <TableRow key={surah.id}>
                <TableCell className="font-bold">{surah.number}</TableCell>
                <TableCell className="font-bold">{surah.nameEnglish}</TableCell>
                <TableCell className="text-right">
                   <AlertDialog>
                     <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                     <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove Surah?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(surah.id)} className="bg-destructive">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                   </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
