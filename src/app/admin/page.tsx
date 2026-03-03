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
  X
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Tooltip
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

type AdminTab = 'dashboard' | 'channels' | 'videos' | 'quran' | 'settings';

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
                      {activeTab === 'dashboard' && <ChevronRight className="w-4 h-4 ml-auto" />}
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
                      {activeTab === 'channels' && <ChevronRight className="w-4 h-4 ml-auto" />}
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
                      {activeTab === 'videos' && <ChevronRight className="w-4 h-4 ml-auto" />}
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
                      {activeTab === 'quran' && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab('settings')}
                      isActive={activeTab === 'settings'}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                        activeTab === 'settings' ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      <Settings className="w-5 h-5" />
                      <span>Settings</span>
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
               <LayoutDashboard className="w-4 h-4 text-primary" />
               <h2 className="font-headline font-bold text-lg">
                 {activeTab === 'dashboard' && 'Admin Overview'}
                 {activeTab === 'channels' && 'YouTube Channels'}
                 {activeTab === 'videos' && 'Video Catalog'}
                 {activeTab === 'quran' && 'Quranic Metadata'}
                 {activeTab === 'settings' && 'System Settings'}
               </h2>
             </div>
             <div className="flex items-center gap-4">
               {activeTab === 'channels' && <AddChannelDialog open={isAddChannelOpen} onOpenChange={setIsAddChannelOpen} />}
               <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>View Live Site</Button>
             </div>
          </header>

          <main className="p-8">
            {activeTab === 'dashboard' && <DashboardOverview channels={channels || []} videos={videos || []} />}
            {activeTab === 'channels' && <ChannelManagement channels={channels || []} isAddOpen={isAddChannelOpen} setIsAddOpen={setIsAddChannelOpen} />}
            {activeTab === 'videos' && <VideoManagement videos={videos || []} />}
            {activeTab === 'quran' && <QuranManagement surahs={surahs || []} />}
            {activeTab === 'settings' && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure global application parameters.</CardDescription>
                </CardHeader>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto opacity-10 mb-4" />
                  <p>System settings are currently managed via Cloud Config.</p>
                </CardContent>
              </Card>
            )}
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

  const subData = channels.map(c => ({
    name: c.title.split(' ')[0],
    subs: c.subscribersCount || 0
  })).sort((a,b) => b.subs - a.subs).slice(0, 5);

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
            <CardDescription>Video uploads over the last 6 months</CardDescription>
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
            <CardDescription>Distribution of content types</CardDescription>
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
                  <Tooltip />
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

        <Card className="bg-card border-border shadow-sm xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              Channel Reach
            </CardTitle>
            <CardDescription>Subscribers by top channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ChartContainer config={{ subs: { label: "Subscribers", color: "hsl(var(--primary))" } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="subs" fill="var(--color-subs)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
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
    if (!input) {
      toast({ variant: "destructive", title: "Missing ID/Handle", description: "Please enter a Channel ID, Handle, or URL." });
      return;
    }

    setLoading(true);
    if (!apiKey) {
      toast({ variant: "destructive", title: "API Key Missing", description: "Please set NEXT_PUBLIC_YOUTUBE_API_KEY." });
      setLoading(false);
      return;
    }

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
      toast({ title: "Channel Saved", description: `${fetchedData.title} added. Fetching videos...` });
      
      // Fetch videos after saving channel
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
      duration: 'PT0S', // Placeholder, search API doesn't return duration
      publishedAt: video.snippet.publishedAt,
      channelId: fetchedData.id,
      uploadedByUserId: user.uid,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      setDocumentNonBlocking(doc(db, 'videos', vidId), videoData, { merge: true });
      toast({ title: "Video Imported", description: video.snippet.title });
    } catch (e) {
      setImportingVideoIds(prev => {
        const next = new Set(prev);
        next.delete(vidId);
        return next;
      });
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
        setImportingVideoIds(new Set()); 
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Add Channel
        </Button>
      </DialogTrigger>
      <DialogContent className={cn("bg-card border-border transition-all duration-300", view === 'videos' ? "sm:max-w-[800px]" : "sm:max-w-[425px]")}>
          <DialogHeader>
            <DialogTitle>{view === 'search' ? 'Add YouTube Channel' : `Import Videos from ${fetchedData?.title}`}</DialogTitle>
            <DialogDescription>
              {view === 'search' 
                ? 'Enter a Channel ID, Handle (@name), or YouTube URL.' 
                : 'Select videos to add to your platform library.'}
            </DialogDescription>
          </DialogHeader>

          {view === 'search' ? (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="channelInput">Channel ID / Handle / URL</Label>
                <div className="flex gap-2">
                  <Input 
                    id="channelInput" 
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
                      <p className="text-xs text-muted-foreground truncate">
                        {Number(fetchedData.subscribersCount).toLocaleString()} Subscribers
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Button onClick={saveChannel} disabled={loading || !fetchedData} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
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
                          <p className="text-[10px] font-bold leading-tight line-clamp-2 min-h-[2.5em]">{video.snippet.title}</p>
                          <Button 
                            variant={isImported ? "secondary" : "default"} 
                            size="sm" 
                            className="w-full h-7 text-[10px] font-bold"
                            onClick={() => importVideo(video)}
                            disabled={isImported}
                          >
                            {isImported ? <Check className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                            {isImported ? 'Imported' : 'Import'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {nextPageToken && (
                  <div className="py-6 flex justify-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fetchChannelVideos(fetchedData.id, nextPageToken)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Load More Videos
                    </Button>
                  </div>
                )}
              </ScrollArea>
              <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
                Done & Close
              </Button>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}

function EditChannelDialog({ channel }: { channel: any }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(channel.title);
  const [description, setDescription] = useState(channel.description || '');
  const [subscribersCount, setSubscribersCount] = useState(channel.subscribersCount);

  const handleUpdate = () => {
    updateDocumentNonBlocking(doc(db, 'channels', channel.id), {
      title,
      description,
      subscribersCount: Number(subscribersCount),
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Channel Updated", description: "Changes have been saved successfully." });
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
          <DialogDescription>Update the information for this curated channel.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Channel Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-none" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subs">Subscribers</Label>
            <Input id="subs" type="number" value={subscribersCount} onChange={(e) => setSubscribersCount(Number(e.target.value))} className="bg-secondary border-none" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-none" />
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

function EditVideoDialog({ video }: { video: any }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || '');
  const [isTrending, setIsTrending] = useState(video.isTrending || false);

  const handleUpdate = () => {
    updateDocumentNonBlocking(doc(db, 'videos', video.id), {
      title,
      description,
      isTrending,
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Video Updated", description: "Video metadata saved successfully." });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-primary">
          <Edit3 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Video Details</DialogTitle>
          <DialogDescription>Modify video information and visibility status.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vtitle">Video Title</Label>
            <Input id="vtitle" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-none" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vdesc">Description</Label>
            <Textarea id="vdesc" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-none min-h-[100px]" />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
            <div className="space-y-0.5">
              <Label className="text-sm">Trending Status</Label>
              <p className="text-[10px] text-muted-foreground">Highlight this video in the trending section.</p>
            </div>
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

function ChannelManagement({ channels, isAddOpen, setIsAddOpen }: { channels: any[], isAddOpen: boolean, setIsAddOpen: (o: boolean) => void }) {
  const db = useFirestore();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    if (typeof window !== 'undefined' && window.confirm('Are you sure you want to delete this channel? All associated metadata will be removed.')) {
      try {
        const channelRef = doc(db, 'channels', id);
        deleteDocumentNonBlocking(channelRef);
        toast({ 
          title: "Delete Initiated", 
          description: "The channel record is being removed from the system.",
        });
      } catch (e: any) {
        toast({ 
          variant: "destructive",
          title: "Error", 
          description: "Failed to delete the channel record.",
        });
      }
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>YouTube Channels</CardTitle>
          <CardDescription>Manage the list of curated channels for the platform.</CardDescription>
        </div>
        <AddChannelDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="py-4">Channel Title</TableHead>
              <TableHead>Subscribers</TableHead>
              <TableHead>Videos</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id} className="hover:bg-secondary/20 transition-colors">
                <TableCell className="font-medium py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center overflow-hidden relative">
                      {channel.thumbnailUrl ? (
                        <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />
                      ) : (
                        <Youtube className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    {channel.title}
                  </div>
                </TableCell>
                <TableCell>{channel.subscribersCount?.toLocaleString() || '0'}</TableCell>
                <TableCell>{channel.videoCount || '0'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EditChannelDialog channel={channel} />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10" 
                      onClick={() => handleDelete(channel.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {channels.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                  No channels found in the database.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function VideoManagement({ videos }: { videos: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    if (typeof window !== 'undefined' && window.confirm('Delete this video metadata permanently?')) {
      try {
        const videoRef = doc(db, 'videos', id);
        deleteDocumentNonBlocking(videoRef);
        toast({ title: "Delete Initiated", description: "Video metadata is being removed." });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: "Failed to initiate video deletion." });
      }
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle>Video Catalog</CardTitle>
        <CardDescription>Moderate and manage all video metadata across the platform.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="py-4">Title</TableHead>
              <TableHead>Trending</TableHead>
              <TableHead>Uploader UID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.id} className="hover:bg-secondary/20 transition-colors">
                <TableCell className="font-medium py-4">
                  <div className="line-clamp-1 max-w-[400px]">{video.title}</div>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    video.isTrending ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                  )}>
                    {video.isTrending ? 'Trending' : 'Standard'}
                  </span>
                </TableCell>
                <TableCell className="text-[10px] font-mono opacity-50">{video.uploadedByUserId}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <EditVideoDialog video={video} />
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(video.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {videos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                  No videos found in the database.
                </TableCell>
              </TableRow>
            )}
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
    if (typeof window !== 'undefined' && window.confirm('Delete Surah record? This cannot be undone.')) {
      try {
        const surahRef = doc(db, 'quran_surahs', id);
        deleteDocumentNonBlocking(surahRef);
        toast({ title: "Delete Initiated", description: "Quranic record is being removed." });
      } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: "Failed to remove Quranic metadata." });
      }
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle>Quranic Metadata</CardTitle>
        <CardDescription>Manage Surah and Ayat information for the spiritual feed.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow>
              <TableHead className="py-4 w-16">No.</TableHead>
              <TableHead>Name (En)</TableHead>
              <TableHead>Name (Ar)</TableHead>
              <TableHead>Revelation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surahs.sort((a,b) => a.number - b.number).map((surah) => (
              <TableRow key={surah.id} className="hover:bg-secondary/20 transition-colors">
                <TableCell className="py-4 font-bold text-muted-foreground">{surah.number}</TableCell>
                <TableCell className="font-bold">{surah.nameEnglish}</TableCell>
                <TableCell className="font-arabic text-primary text-lg">{surah.nameArabic}</TableCell>
                <TableCell className="text-xs uppercase font-medium">{surah.revelationPlace}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="hover:text-primary"><Edit3 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(surah.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {surahs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                  No Quranic data records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
