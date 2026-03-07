
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, getDoc, writeBatch, limit, orderBy } from 'firebase/firestore';
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
  Plus, 
  Loader2, 
  LayoutDashboard,
  LogOut,
  Copy,
  CheckCircle2,
  Search,
  Mic2,
  X,
  Languages,
  TrendingUp,
  History,
  Eye,
  Database,
  Download,
  CheckCircle,
  AlertCircle
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
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
  Area,
  AreaChart,
  Tooltip as RechartsTooltip
} from "recharts";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getAvailableTranslations, getFullQuran } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

type AdminTab = 'dashboard' | 'channels' | 'videos' | 'scholars' | 'quran-tools';

export default function AdminPanel() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [copied, setCopied] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global sync state to prevent tab switching from hiding the loader
  const [globalSyncing, setGlobalSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'fetching' | 'saving' | 'success' | 'error'>('idle');

  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  const isVerifiedAdmin = !!adminData;

  const channelsRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'channels') : null), [db, isVerifiedAdmin]);
  const { data: channels } = useCollection(channelsRef);

  const videosRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'videos') : null), [db, isVerifiedAdmin]);
  const { data: videos } = useCollection(videosRef);

  const speakersRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'speakers') : null), [db, isVerifiedAdmin]);
  const { data: speakers } = useCollection(speakersRef);

  const editionsRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'quran_editions') : null), [db, isVerifiedAdmin]);
  const { data: editions } = useCollection(editionsRef);

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

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-medium">Verifying access...</p>
      </div>
    );
  }

  if (!user || !isVerifiedAdmin) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-8 bg-background min-h-screen">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
          <ShieldAlert className="w-10 h-10 text-zinc-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-headline font-bold text-white">Access Denied</h1>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Administrative access required. Copy your UID and add it to the <code className="bg-zinc-900 px-1 rounded text-white">roles_admin</code> collection in Firestore.
          </p>
        </div>

        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between gap-4">
           <div className="flex flex-col items-start min-w-0">
             <span className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Your UID</span>
             <code className="text-xs font-mono truncate w-full text-left text-white">{user?.uid || 'N/A'}</code>
           </div>
           <Button variant="secondary" size="sm" onClick={copyUid} className="rounded-xl bg-zinc-800 hover:bg-zinc-700">
            {copied ? <CheckCircle2 className="w-4 h-4 text-zinc-400" /> : <Copy className="w-4 h-4 text-white" />}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={handleSignOut} className="w-full text-destructive border-zinc-800 rounded-xl font-bold">Sign Out</Button>
          <Button variant="ghost" onClick={() => window.location.href = '/'} className="w-full font-bold text-white">Home</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar className="border-r border-zinc-900 bg-zinc-950">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-lg leading-none text-white">Admin Hub</span>
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1 font-black">Management</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-2">Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'channels', label: 'Channels', icon: Youtube },
                    { id: 'videos', label: 'Video Catalog', icon: VideoIcon },
                    { id: 'scholars', label: 'Scholars', icon: Mic2 },
                    { id: 'quran-tools', label: 'Quran Tools', icon: Book },
                  ].map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        onClick={() => setActiveTab(item.id as AdminTab)}
                        isActive={activeTab === item.id}
                        disabled={globalSyncing}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all h-12",
                          activeTab === item.id ? "bg-zinc-900 text-white font-bold" : "text-zinc-500 hover:bg-zinc-900/50"
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
          <SidebarFooter className="p-4 border-t border-zinc-900">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:bg-destructive/10 rounded-xl font-bold"
              onClick={handleSignOut}
              disabled={globalSyncing}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto bg-black p-0 border-l-0">
          <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/50 sticky top-0 z-10 backdrop-blur-md">
             <div className="flex items-center gap-6">
                <h2 className="font-headline font-bold text-2xl tracking-tight text-white">
                  {activeTab === 'dashboard' && 'Admin Overview'}
                  {activeTab === 'channels' && 'YouTube Channels'}
                  {activeTab === 'videos' && 'Video Catalog'}
                  {activeTab === 'scholars' && 'Scholar Management'}
                  {activeTab === 'quran-tools' && 'Quran Tools Hub'}
                </h2>
             </div>

             <div className="flex items-center gap-4">
               <div className={cn(
                  "relative transition-all duration-300 flex items-center",
                  isSearchExpanded ? "w-40 md:w-64" : "w-10"
                )}>
                  {isSearchExpanded ? (
                    <div className="flex items-center w-full bg-zinc-900 border border-zinc-800 rounded-xl h-10 shadow-lg animate-in slide-in-from-right-2 duration-300">
                      <Search className="ml-3 w-4 h-4 text-zinc-500 shrink-0" />
                      <Input 
                        ref={searchInputRef}
                        placeholder="Search system..." 
                        className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-zinc-600 h-full w-full text-xs"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-full w-8 text-zinc-600 hover:text-white"
                        onClick={() => setIsSearchExpanded(false)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setIsSearchExpanded(true)}
                      variant="outline"
                      size="icon"
                      className="w-10 h-10 bg-zinc-900 border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white shadow-lg transition-colors"
                    >
                      <Search className="w-5 h-5" />
                    </Button>
                  )}
               </div>
               <Button variant="outline" size="sm" className="rounded-xl px-4 h-10 font-bold border-zinc-800 hover:bg-zinc-900 text-white" onClick={() => window.location.href = '/'}>Live Site</Button>
             </div>
          </header>

          <main className="p-8 pb-32">
            {activeTab === 'dashboard' && <DashboardOverview channels={channels || []} videos={videos || []} speakers={speakers || []} editions={editions || []} />}
            {activeTab === 'channels' && <ChannelManagement channels={channels || []} />}
            {activeTab === 'videos' && <VideoManagement videos={videos || []} />}
            {activeTab === 'scholars' && <SpeakerManagement speakers={speakers || []} />}
            {activeTab === 'quran-tools' && (
              <QuranToolsView 
                editions={editions || []} 
                globalSyncing={globalSyncing}
                setGlobalSyncing={setGlobalSyncing}
                syncProgress={syncProgress}
                setSyncProgress={setSyncProgress}
                syncStatus={syncStatus}
                setSyncStatus={setSyncStatus}
              />
            )}
          </main>
        </SidebarInset>

        <Dialog open={globalSyncing}>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl sm:max-w-md p-10 outline-none">
            <DialogHeader className="flex flex-col items-center text-center space-y-8">
               <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center animate-pulse">
                 <Database className="w-10 h-10 text-white" />
               </div>
               <div className="space-y-2">
                 <DialogTitle className="text-xl font-bold">Synchronizing Database</DialogTitle>
                 <DialogDescription className="text-zinc-500 text-sm leading-relaxed">
                   Pulling thousands of verses from AlQuran Cloud and committing them to your Firestore storage. Please do not close this window.
                 </DialogDescription>
               </div>
            </DialogHeader>
            <div className="w-full space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                   <span>
                    {syncStatus === 'fetching' ? 'Fetching API Payload...' : 'Committing Batch Writes...'}
                   </span>
                   <span className="text-white">{syncProgress}%</span>
                 </div>
                 <Progress value={syncProgress} className="h-2 bg-zinc-900" />
            </div>
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-zinc-500 w-6 h-6" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}

function DashboardOverview({ channels, videos, speakers, editions }: { channels: any[], videos: any[], speakers: any[], editions: any[] }) {
  const stats = [
    { label: 'Total Videos', value: videos.length, icon: VideoIcon, color: 'text-blue-500' },
    { label: 'Active Channels', value: channels.length, icon: Youtube, color: 'text-red-500' },
    { label: 'Featured Scholars', value: speakers.length, icon: Mic2, color: 'text-amber-500' },
    { label: 'Active Editions', value: editions.length, icon: Languages, color: 'text-emerald-500' },
  ];

  const chartData = [
    { name: 'Mon', views: 4000 },
    { name: 'Tue', views: 3000 },
    { name: 'Wed', views: 2000 },
    { name: 'Thu', views: 2780 },
    { name: 'Fri', views: 1890 },
    { name: 'Sat', views: 2390 },
    { name: 'Sun', views: 3490 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-zinc-950 border-zinc-900 rounded-2xl overflow-hidden shadow-xl hover:border-zinc-800 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {stat.label}
              </CardTitle>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-headline font-bold text-white">{stat.value}</div>
              <p className="text-[10px] text-zinc-600 mt-1 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +12.5% from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-zinc-950 border-zinc-900 rounded-3xl p-6 shadow-2xl">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-zinc-500" />
              Platform Engagement
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">View analytics across all cataloged videos</CardDescription>
          </CardHeader>
          <div className="h-[300px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#3f3f46" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#3f3f46" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-10}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '10px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#ffffff" 
                  fillOpacity={1} 
                  fill="url(#colorViews)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-zinc-950 border-zinc-900 rounded-3xl p-6 shadow-2xl">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-500" />
              Recent Cataloging
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">Latest additions to the video feed</CardDescription>
          </CardHeader>
          <ScrollArea className="h-[300px] mt-6">
            <div className="space-y-4">
              {videos.slice(0, 10).map((video) => (
                <div key={video.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer group">
                  <div className="relative w-12 h-8 rounded-md overflow-hidden shrink-0">
                    <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate group-hover:text-zinc-300">{video.title}</span>
                    <span className="text-[10px] text-zinc-600 truncate">{video.channelId}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

function ChannelManagement({ channels }: { channels: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [channelIdInput, setChannelIdInput] = useState('');

  const addChannel = async () => {
    if (!channelIdInput) return;
    setLoading(true);
    try {
      const newChannel = {
        id: channelIdInput,
        title: `Channel ${channelIdInput}`,
        thumbnailUrl: `https://picsum.photos/seed/${channelIdInput}/200`,
        externalUrl: `https://youtube.com/channel/${channelIdInput}`,
        subscribersCount: Math.floor(Math.random() * 1000000),
        videoCount: Math.floor(Math.random() * 1000),
        viewCount: Math.floor(Math.random() * 10000000),
        createdAt: new Date().toISOString(),
      };
      setDocumentNonBlocking(doc(db, 'channels', channelIdInput), newChannel, { merge: true });
      setChannelIdInput('');
      toast({ title: "Channel Linked", description: "The YouTube channel has been added to your studio." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to link channel." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">YouTube Channel ID</Label>
            <div className="relative">
              <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input 
                placeholder="UC..." 
                className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white" 
                value={channelIdInput}
                onChange={(e) => setChannelIdInput(e.target.value)}
              />
            </div>
          </div>
          <Button 
            className="bg-white text-black hover:bg-zinc-200 rounded-xl h-12 px-8 font-bold"
            onClick={addChannel}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Link Channel
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel) => (
          <Card key={channel.id} className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden group hover:border-zinc-800 transition-all shadow-xl">
            <div className="h-24 bg-gradient-to-r from-zinc-900 to-zinc-950 relative">
               <div className="absolute top-1/2 left-6 -translate-y-1/2 w-16 h-16 rounded-2xl border-4 border-black overflow-hidden shadow-2xl">
                 <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />
               </div>
            </div>
            <CardContent className="pt-10 pb-6 px-6 space-y-6">
              <div className="space-y-1">
                <h3 className="font-bold text-white text-lg">{channel.title}</h3>
                <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Linked ID: {channel.id}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-900/50 p-2 rounded-xl text-center">
                  <span className="block text-xs font-bold text-white">{(channel.subscribersCount / 1000).toFixed(1)}K</span>
                  <span className="text-[8px] text-zinc-600 uppercase font-black">Subs</span>
                </div>
                <div className="bg-zinc-900/50 p-2 rounded-xl text-center">
                  <span className="block text-xs font-bold text-white">{channel.videoCount}</span>
                  <span className="text-[8px] text-zinc-600 uppercase font-black">Videos</span>
                </div>
                <div className="bg-zinc-900/50 p-2 rounded-xl text-center">
                  <span className="block text-xs font-bold text-white">{(channel.viewCount / 1000000).toFixed(1)}M</span>
                  <span className="text-[8px] text-zinc-600 uppercase font-black">Views</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl h-10 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 text-xs font-bold">
                  Analytics
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-xl text-destructive hover:bg-destructive/10"
                  onClick={() => deleteDocumentNonBlocking(doc(db, 'channels', channel.id))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VideoManagement({ videos }: { videos: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const toggleTrending = (video: any) => {
    updateDocumentNonBlocking(doc(db, 'videos', video.id), {
      isTrending: !video.isTrending
    });
    toast({ title: video.isTrending ? "Removed from Trending" : "Added to Trending" });
  };

  const filtered = videos.filter(v => v.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search catalog..." 
            className="pl-10 bg-zinc-900 border-zinc-800 rounded-xl text-white" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <Badge className="bg-zinc-900 border-zinc-800 text-zinc-500 py-1.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest">
            {filtered.length} Indexed Videos
          </Badge>
          <Button className="bg-white text-black hover:bg-zinc-200 rounded-xl font-bold h-11 px-6">
            <VideoIcon className="w-4 h-4 mr-2" />
            Index New Video
          </Button>
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-zinc-500 pl-8">Video Details</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Channel</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Analytics</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((video) => (
              <TableRow key={video.id} className="hover:bg-zinc-900/40 border-zinc-900 transition-colors h-24">
                <TableCell className="pl-8">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 aspect-video rounded-lg overflow-hidden border border-zinc-800">
                      <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                    </div>
                    <div className="flex flex-col max-w-[300px]">
                      <span className="text-sm font-bold text-white truncate">{video.title}</span>
                      <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">ID: {video.id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-bold text-zinc-400">{video.channelId}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{video.appViewCount || 0}</span>
                        <span className="text-[8px] text-zinc-600 uppercase font-black">App Views</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{video.likeCount || 0}</span>
                        <span className="text-[8px] text-zinc-600 uppercase font-black">Likes</span>
                     </div>
                  </div>
                </TableCell>
                <TableCell>
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "rounded-xl text-[9px] font-black uppercase tracking-widest",
                      video.isTrending ? "bg-amber-500/10 text-amber-500" : "bg-zinc-900 text-zinc-600"
                    )}
                    onClick={() => toggleTrending(video)}
                   >
                     {video.isTrending ? 'Trending' : 'Regular'}
                   </Button>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-zinc-800 text-zinc-500">
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl text-destructive hover:bg-destructive/10"
                      onClick={() => deleteDocumentNonBlocking(doc(db, 'videos', video.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', bio: '', imageUrl: '' });

  const saveSpeaker = async () => {
    if (!formData.name) return;
    const id = formData.name.toLowerCase().replace(/\s+/g, '-');
    setDocumentNonBlocking(doc(db, 'speakers', id), {
      id,
      name: formData.name,
      bio: formData.bio,
      profileImageUrl: formData.imageUrl || 'https://picsum.photos/seed/speaker/400',
      createdAt: new Date().toISOString()
    }, { merge: true });
    setFormData({ name: '', bio: '', imageUrl: '' });
    setOpen(false);
    toast({ title: "Scholar Profile Updated" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white">Featured Scholars</h3>
          <p className="text-xs text-zinc-500 font-medium">Manage the spiritual leaders featured across the platform.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-zinc-200 rounded-xl h-11 px-6 font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Add Scholar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Scholar Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Full Name</Label>
                 <Input 
                   className="bg-zinc-900 border-zinc-800 rounded-xl" 
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bio / Description</Label>
                 <Textarea 
                   className="bg-zinc-900 border-zinc-800 rounded-xl min-h-[100px]" 
                   value={formData.bio}
                   onChange={(e) => setFormData({...formData, bio: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Profile Image URL</Label>
                 <Input 
                   className="bg-zinc-900 border-zinc-800 rounded-xl" 
                   value={formData.imageUrl}
                   onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                 />
               </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="rounded-xl font-bold text-zinc-500" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="bg-white text-black hover:bg-zinc-200 rounded-xl font-bold px-8" onClick={saveSpeaker}>Save Profile</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {speakers.map((speaker) => (
          <Card key={speaker.id} className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden group hover:border-zinc-800 transition-all shadow-xl text-center p-6">
            <div className="relative w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-zinc-900 group-hover:border-zinc-700 transition-all shadow-2xl">
              <Image src={speaker.profileImageUrl} alt={speaker.name} fill className="object-cover" />
            </div>
            <h4 className="mt-4 font-bold text-sm text-white truncate">{speaker.name}</h4>
            <p className="mt-1 text-[9px] text-zinc-600 font-black uppercase tracking-widest">Scholar</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-zinc-900">
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                onClick={() => deleteDocumentNonBlocking(doc(db, 'speakers', speaker.id))}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface QuranToolsViewProps {
  editions: any[];
  globalSyncing: boolean;
  setGlobalSyncing: (val: boolean) => void;
  syncProgress: number;
  setSyncProgress: (val: number) => void;
  syncStatus: 'idle' | 'fetching' | 'saving' | 'success' | 'error';
  setSyncStatus: (val: 'idle' | 'fetching' | 'saving' | 'success' | 'error') => void;
}

function QuranToolsView({ 
  editions, 
  globalSyncing, 
  setGlobalSyncing, 
  syncProgress, 
  setSyncProgress, 
  syncStatus, 
  setSyncStatus 
}: QuranToolsViewProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="bg-zinc-900/50 p-1 rounded-2xl h-12 border border-zinc-800 mb-8">
          <TabsTrigger value="directory" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Edition Directory</TabsTrigger>
          <TabsTrigger value="sync" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Database Sync</TabsTrigger>
          <TabsTrigger value="viewer" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Full Quran Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <EditionManagement editions={editions} />
        </TabsContent>
        <TabsContent value="sync">
          <QuranDatabaseSync 
            editions={editions} 
            syncing={globalSyncing}
            setSyncing={setGlobalSyncing}
            progress={syncProgress}
            setProgress={setSyncProgress}
            syncStatus={syncStatus}
            setSyncStatus={setSyncStatus}
          />
        </TabsContent>
        <TabsContent value="viewer">
          <QuranDatabaseViewer editions={editions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const languageNameMap: Record<string, string> = {
  ar: 'Arabic',
  en: 'English',
  ur: 'Urdu',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  id: 'Indonesian',
  tr: 'Turkish',
  zh: 'Chinese',
  ru: 'Russian',
  fa: 'Persian',
  bn: 'Bengali',
  hi: 'Hindi',
  ml: 'Malayalam',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  mr: 'Marathi',
  gu: 'Gujarati',
  pa: 'Punjabi',
  sw: 'Swahili',
  ha: 'Hausa',
  yo: 'Yoruba',
  am: 'Amharic',
  so: 'Somali',
  sq: 'Albanian',
  bs: 'Bosnian',
  nl: 'Dutch',
  it: 'Italian',
  pt: 'Portuguese',
  th: 'Thai',
  vi: 'Vietnamese',
  ko: 'Korean',
  ja: 'Japanese',
  az: 'Azerbaijani',
  ku: 'Kurdish',
  ps: 'Pashto',
  sd: 'Sindhi',
  tg: 'Tajik',
  uz: 'Uzbek',
  tt: 'Tatar',
  kk: 'Kazakh',
  ky: 'Kyrgyz',
  ug: 'Uyghur',
};

function EditionManagement({ editions }: { editions: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<any[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  const fetchAvailable = async () => {
    setLoading(true);
    try {
      const data = await getAvailableTranslations();
      setAvailable(data.data || []);
    } catch (e) {
      toast({ variant: "destructive", title: "API Error", description: "Could not fetch translation editions." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openAdd && available.length === 0) {
      fetchAvailable();
    }
  }, [openAdd]);

  const languages = useMemo(() => {
    const map = new Map<string, string>();
    available.forEach(a => {
      if (!map.has(a.language)) {
        map.set(a.language, languageNameMap[a.language] || a.language.toUpperCase());
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [available]);

  const handleDeleteEdition = async (id: string) => {
    // Delete all associated page data in Firestore first
    const q = query(collection(db, 'quran'), where('editionId', '==', id));
    const snapshots = await getDocs(q);
    const batch = writeBatch(db);
    snapshots.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Remove the edition from editions table
    deleteDocumentNonBlocking(doc(db, 'quran_editions', id));
    toast({ title: "Edition & Content Deleted" });
  };

  const toggleEdition = (edition: any) => {
    const existing = editions.find(t => t.id === edition.identifier);
    if (existing) {
      handleDeleteEdition(edition.identifier);
    } else {
      setDocumentNonBlocking(doc(db, 'quran_editions', edition.identifier), {
        id: edition.identifier,
        name: edition.name,
        language: languageNameMap[edition.language] || edition.language.toUpperCase(),
        languageCode: edition.language,
        isActive: true,
        isDefault: editions.length === 0,
        dataSync: 'no'
      }, { merge: true });
      toast({ title: "Edition Activated" });
    }
  };

  const filtered = available.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                         a.language.toLowerCase().includes(search.toLowerCase());
    const matchesLanguage = selectedLanguage === 'all' || a.language === selectedLanguage;
    return matchesSearch && matchesLanguage;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white">Edition Directory</h3>
          <p className="text-xs text-zinc-500 font-medium">Control which translation editions are available on the Quran page.</p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-11 px-6 font-bold bg-white text-black hover:bg-zinc-200 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Activate New Edition
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[700px] p-0 h-[80vh] flex flex-col rounded-3xl">
            <DialogHeader className="p-6 border-b border-zinc-800 shrink-0">
              <DialogTitle className="text-white font-bold text-xl">Available Editions</DialogTitle>
              <div className="mt-4 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input 
                    placeholder="Search name..." 
                    className="pl-10 bg-zinc-900 border-zinc-800 text-white rounded-xl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white rounded-xl">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectItem value="all">All Languages</SelectItem>
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-zinc-500" /></div>
                  ) : (
                    <div className="grid gap-2">
                      {filtered.map((item) => {
                        const isActivated = editions.some(t => t.id === item.identifier);
                        return (
                          <div key={item.identifier} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-sm">{item.name}</span>
                              <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">
                                {languageNameMap[item.language] || item.language.toUpperCase()} • {item.identifier}
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant={isActivated ? "destructive" : "secondary"}
                              className="rounded-xl font-bold min-w-[100px]"
                              onClick={() => toggleEdition(item)}
                            >
                              {isActivated ? <Trash2 className="w-4 h-4" /> : 'Activate'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-3xl shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-zinc-500 pl-8">Edition Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Language</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Identifier</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Synced</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editions.map((t) => (
              <TableRow key={t.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-20">
                <TableCell className="font-bold text-white pl-8">{t.name}</TableCell>
                <TableCell className="text-zinc-500 font-medium">
                  {t.language}
                </TableCell>
                <TableCell className="text-zinc-500 font-mono text-xs">{t.id}</TableCell>
                <TableCell>
                  {t.dataSync === 'yes' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none rounded-lg text-[9px] font-black uppercase tracking-widest">Yes</Badge>
                  ) : (
                    <Badge variant="outline" className="border-zinc-800 text-zinc-600 rounded-lg text-[9px] font-black uppercase tracking-widest">No</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right pr-8">
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteEdition(t.id)} className="text-destructive hover:bg-destructive/10 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

interface QuranDatabaseSyncProps {
  editions: any[];
  syncing: boolean;
  setSyncing: (val: boolean) => void;
  progress: number;
  setProgress: (val: number) => void;
  syncStatus: 'idle' | 'fetching' | 'saving' | 'success' | 'error';
  setSyncStatus: (val: 'idle' | 'fetching' | 'saving' | 'success' | 'error') => void;
}

function QuranDatabaseSync({ 
  editions, 
  syncing, 
  setSyncing, 
  progress, 
  setProgress, 
  syncStatus, 
  setSyncStatus 
}: QuranDatabaseSyncProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedEdition, setSelectedEdition] = useState('');

  const handleSync = async (editionIdToSync?: string) => {
    const targetId = editionIdToSync || selectedEdition;
    if (!targetId) return;

    setSyncing(true);
    setSyncStatus('fetching');
    setProgress(0);
    
    try {
      // If we are syncing the base Arabic itself, we don't need a second edition
      const isArabicBase = targetId === 'quran-uthmani';
      
      let arabicRes, transRes;
      
      if (isArabicBase) {
        arabicRes = await getFullQuran('quran-uthmani');
        transRes = arabicRes; // No translation for base
      } else {
        const [a, t] = await Promise.all([
          getFullQuran('quran-uthmani'),
          getFullQuran(targetId)
        ]);
        arabicRes = a;
        transRes = t;
      }

      setSyncStatus('saving');
      
      const arabicSurahs = arabicRes.data.surahs;
      const transSurahs = transRes.data.surahs;

      // Map to track ayats by page for Firestore documents
      const pageMap = new Map<number, any[]>();
      
      arabicSurahs.forEach((surah: any, sIdx: number) => {
        surah.ayahs.forEach((ayah: any, aIdx: number) => {
          const pageNum = ayah.page;
          const transAyah = transSurahs[sIdx].ayahs[aIdx];
          
          const combinedAyat = {
            number: ayah.number,
            numberInSurah: ayah.numberInSurah,
            text: ayah.text,
            translationText: isArabicBase ? null : transAyah.text,
            surah: {
              number: surah.number,
              name: surah.name,
              englishName: surah.englishName
            }
          };

          if (!pageMap.has(pageNum)) {
            pageMap.set(pageNum, []);
          }
          pageMap.get(pageNum)?.push(combinedAyat);
        });
      });

      const pages = Array.from(pageMap.entries());
      const batchSize = 10;
      
      for (let i = 0; i < pages.length; i += batchSize) {
        const chunk = pages.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        chunk.forEach(([pageNum, ayats]) => {
          const pageId = `${targetId}_page_${pageNum}`;
          const pageRef = doc(db, 'quran', pageId);
          batch.set(pageRef, {
            id: pageId,
            editionId: targetId,
            pageNumber: pageNum,
            ayats: ayats,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });

        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / pages.length) * 100));
      }

      // Mark edition as synced
      if (isArabicBase) {
        setDocumentNonBlocking(doc(db, 'quran_editions', 'quran-uthmani'), {
          id: 'quran-uthmani',
          name: 'Standard Arabic text',
          language: 'Arabic',
          languageCode: 'ar',
          isActive: true,
          isDefault: false,
          dataSync: 'yes'
        }, { merge: true });
      } else {
        updateDocumentNonBlocking(doc(db, 'quran_editions', targetId), {
          dataSync: 'yes'
        });
      }

      setSyncStatus('success');
      toast({ title: "Database Synchronized", description: `Successfully synced ${pages.length} pages of ${targetId} to your database.` });
    } catch (error) {
      console.error(error);
      setSyncStatus('error');
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not synchronize edition to database." });
    } finally {
      setSyncing(false);
    }
  };

  const isArabicSynced = editions.find(e => e.id === 'quran-uthmani')?.dataSync === 'yes';
  const currentEditionData = editions.find(e => e.id === selectedEdition);
  const isSelectedSynced = currentEditionData?.dataSync === 'yes';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Edition</Label>
              {isSelectedSynced && (
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5" /> Already Synced
                </span>
              )}
            </div>
            <Select value={selectedEdition} onValueChange={setSelectedEdition} disabled={syncing}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                <SelectValue placeholder="Select edition to sync..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                {editions.map((t) => (
                  <SelectItem key={t.id} value={t.id} disabled={t.dataSync === 'yes'}>
                    <div className="flex items-center gap-2">
                      {t.name} ({t.language})
                      {t.dataSync === 'yes' && <CheckCircle className="w-3 h-3 text-emerald-500 ml-1" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            className={cn(
              "rounded-xl h-12 px-8 font-bold min-w-[160px] transition-all",
              isSelectedSynced ? "bg-zinc-900 text-zinc-500" : "bg-white text-black hover:bg-zinc-200"
            )}
            onClick={() => handleSync()}
            disabled={syncing || !selectedEdition || isSelectedSynced}
          >
            {syncing ? (
              <Loader2 className="animate-spin w-4 h-4 mr-2" />
            ) : isSelectedSynced ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {syncing ? 'Syncing...' : isSelectedSynced ? 'Synced' : 'Start Data Sync'}
          </Button>
        </div>

        <div className="mt-8 border-t border-zinc-900 pt-8 flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Standard Arabic Base</h4>
            <p className="text-xs text-zinc-500">Fetch and store the master Uthmani text in your database.</p>
          </div>
          <Button 
            variant="outline" 
            className={cn(
              "rounded-xl border-zinc-800 font-bold hover:bg-zinc-900",
              isArabicSynced ? "text-emerald-500 border-emerald-500/20" : "text-zinc-400"
            )}
            disabled={syncing || isArabicSynced}
            onClick={() => handleSync('quran-uthmani')}
          >
            {isArabicSynced ? <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> : <Download className="w-4 h-4 mr-2" />}
            {isArabicSynced ? 'Base Synced' : 'Sync Standard Arabic Base'}
          </Button>
        </div>

        {syncStatus === 'success' && !syncing && (
          <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-in zoom-in-95">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-bold text-emerald-500">Edition successfully stored in database.</span>
          </div>
        )}

        {syncStatus === 'error' && !syncing && (
          <div className="mt-8 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-3 animate-in shake">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-bold text-destructive">Error occurred during synchronization.</span>
          </div>
        )}
      </Card>

      <Card className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-3xl text-center space-y-4">
        <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
           <Database className="w-8 h-8 text-zinc-600" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h4 className="font-bold text-white text-lg">Why Sync?</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Synchronizing data to your database allows for faster reader load times, customized verse annotations, and high-performance cross-surah searches without relying on external API rate limits.
          </p>
        </div>
      </Card>
    </div>
  );
}

function QuranDatabaseViewer({ editions }: { editions: any[] }) {
  const db = useFirestore();
  const [selectedEdition, setSelectedEdition] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [pageData, setPageData] = useState<any>(null);

  // Default to Arabic base if available
  useEffect(() => {
    if (!selectedEdition && editions.length > 0) {
      const hasArabic = editions.find(e => e.id === 'quran-uthmani');
      setSelectedEdition(hasArabic ? 'quran-uthmani' : editions[0].id);
    }
  }, [editions, selectedEdition]);

  const fetchPageFromDB = async () => {
    if (!selectedEdition) return;
    setIsLoading(true);
    try {
      const pageId = `${selectedEdition}_page_${currentPage}`;
      const docRef = doc(db, 'quran', pageId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setPageData(snap.data());
      } else {
        setPageData(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPageFromDB();
  }, [selectedEdition, currentPage]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white">Full Quran Viewer</h3>
          <p className="text-xs text-zinc-500 font-medium">Inspect synchronized data directly from your database table.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:auto">
          <div className="w-full md:w-64">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Edition</Label>
            <Select value={selectedEdition} onValueChange={setSelectedEdition}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                <SelectValue placeholder="Select edition..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                {editions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-32">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Page</Label>
            <Input 
              type="number" 
              min={1} 
              max={604} 
              value={currentPage} 
              onChange={(e) => setCurrentPage(parseInt(e.target.value) || 1)}
              className="bg-zinc-900 border-zinc-800 rounded-xl"
            />
          </div>
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl min-h-[500px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 space-y-4">
            <Loader2 className="animate-spin w-12 h-12" />
            <p className="text-sm font-black uppercase tracking-widest">Querying Firestore Table...</p>
          </div>
        ) : pageData ? (
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-12">
               <div className="flex items-center gap-4 border-b border-zinc-900 pb-2">
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
                    Page {pageData.pageNumber} • Edition: {pageData.editionId}
                 </span>
                 <div className="flex-1 h-px bg-zinc-900" />
               </div>
               <div className="space-y-8">
                 {pageData?.ayats?.map((ayat: any, idx: number) => (
                   <div key={idx} className="group p-8 bg-zinc-900/30 rounded-3xl border border-zinc-900/50 hover:border-zinc-800 transition-all space-y-8">
                      <div className="flex justify-between items-start gap-8">
                         <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-zinc-900 text-zinc-600 shrink-0">
                           {ayat.surah?.englishName} • {ayat.numberInSurah}
                         </Badge>
                         <p className="flex-1 text-right text-3xl font-arabic leading-relaxed text-zinc-100">
                           {ayat.text}
                         </p>
                      </div>
                      {ayat.translationText && (
                        <p className="text-zinc-500 text-sm md:text-lg font-medium leading-relaxed italic border-l-2 border-zinc-900 pl-6">
                          {ayat.translationText}
                        </p>
                      )}
                   </div>
                 ))}
               </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 space-y-4">
            <Eye className="w-12 h-12 opacity-10" />
            <p className="font-bold text-center px-8">
              {selectedEdition ? `No data found for Page ${currentPage} of ${selectedEdition} in your database. Please sync this edition first.` : 'Select an edition and page to view synchronized data.'}
            </p>
            {selectedEdition && (
              <Button variant="outline" className="rounded-xl border-zinc-800 font-bold" onClick={() => fetchPageFromDB()}>
                Retry Fetch
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
