
"use client";

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
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
  Info,
  MoreVertical,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Upload as UploadIcon,
  X,
  Smartphone,
  Globe,
  Languages,
  LayoutList
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
  LineChart
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getAvailableTranslations } from '@/lib/api';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from "@/components/ui/menubar"

type AdminTab = 'dashboard' | 'channels' | 'videos' | 'speakers' | 'translations';

export default function AdminPanel() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [copied, setCopied] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  const isVerifiedAdmin = !!adminData;

  const channelsRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'channels') : null), [db, isVerifiedAdmin]);
  const { data: channels } = useCollection(channelsRef);

  const videosRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'videos') : null), [db, isVerifiedAdmin]);
  const { data: videos } = useCollection(videosRef);

  const speakersRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'speakers') : null), [db, isVerifiedAdmin]);
  const { data: speakers } = useCollection(speakersRef);

  const translationsRef = useMemoFirebase(() => (isVerifiedAdmin ? collection(db, 'quran_translations') : null), [db, isVerifiedAdmin]);
  const { data: translations } = useCollection(translationsRef);

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
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-black">Management</span>
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
                    { id: 'speakers', label: 'Scholars', icon: Mic2 },
                    { id: 'translations', label: 'Translations', icon: Languages },
                  ].map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        onClick={() => setActiveTab(item.id as AdminTab)}
                        isActive={activeTab === item.id}
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
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto bg-black">
          <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/50 sticky top-0 z-10 backdrop-blur-md">
             <div className="flex items-center gap-6">
                <h2 className="font-headline font-bold text-2xl tracking-tight text-white">
                  {activeTab === 'dashboard' && 'Admin Overview'}
                  {activeTab === 'channels' && 'YouTube Channels'}
                  {activeTab === 'videos' && 'Video Catalog'}
                  {activeTab === 'speakers' && 'Scholar Management'}
                  {activeTab === 'translations' && 'Quran Translations'}
                </h2>

                <Menubar className="bg-transparent border-none shadow-none hidden lg:flex">
                  <MenubarMenu>
                    <MenubarTrigger className="text-zinc-400 focus:bg-zinc-900 focus:text-white data-[state=open]:bg-zinc-900 data-[state=open]:text-white cursor-pointer font-bold px-4 rounded-xl transition-colors">
                      Quran
                    </MenubarTrigger>
                    <MenubarContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                      <MenubarItem onClick={() => setActiveTab('translations')} className="focus:bg-zinc-900">
                        Active Translations
                      </MenubarItem>
                      <MenubarSeparator className="bg-zinc-800" />
                      <MenubarItem disabled className="opacity-50">Surah Management</MenubarItem>
                      <MenubarItem disabled className="opacity-50">Ayat Verification</MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>

                  <MenubarMenu>
                    <MenubarTrigger className="text-zinc-400 focus:bg-zinc-900 focus:text-white data-[state=open]:bg-zinc-900 data-[state=open]:text-white cursor-pointer font-bold px-4 rounded-xl transition-colors">
                      Studio
                    </MenubarTrigger>
                    <MenubarContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                      <MenubarItem onClick={() => setActiveTab('channels')} className="focus:bg-zinc-900">Link Channels</MenubarItem>
                      <MenubarItem onClick={() => setActiveTab('videos')} className="focus:bg-zinc-900">Video Indexing</MenubarItem>
                      <MenubarSeparator className="bg-zinc-800" />
                      <MenubarItem disabled className="opacity-50">Content Analytics</MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>

                  <MenubarMenu>
                    <MenubarTrigger className="text-zinc-400 focus:bg-zinc-900 focus:text-white data-[state=open]:bg-zinc-900 data-[state=open]:text-white cursor-pointer font-bold px-4 rounded-xl transition-colors">
                      Directory
                    </MenubarTrigger>
                    <MenubarContent className="bg-zinc-950 border-zinc-800 text-zinc-300">
                      <MenubarItem onClick={() => setActiveTab('speakers')} className="focus:bg-zinc-900">Manage Scholars</MenubarItem>
                      <MenubarItem disabled className="opacity-50">User Roles</MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </Menubar>
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
            {activeTab === 'dashboard' && <DashboardOverview channels={channels || []} videos={videos || []} />}
            {activeTab === 'channels' && <ChannelManagement channels={channels || []} existingVideos={videos || []} />}
            {activeTab === 'videos' && <VideoManagement videos={videos || []} channels={channels || []} speakers={speakers || []} />}
            {activeTab === 'speakers' && <SpeakerManagement speakers={speakers || []} />}
            {activeTab === 'translations' && <TranslationManagement translations={translations || []} />}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function TranslationManagement({ translations }: { translations: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<any[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAvailable = async () => {
    setLoading(true);
    try {
      const data = await getAvailableTranslations();
      // Data structure from alquran.cloud: data is an array of editions
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

  const toggleTranslation = (edition: any) => {
    const existing = translations.find(t => t.id === edition.identifier);
    if (existing) {
      deleteDocumentNonBlocking(doc(db, 'quran_translations', edition.identifier));
      toast({ title: "Translation Removed" });
    } else {
      setDocumentNonBlocking(doc(db, 'quran_translations', edition.identifier), {
        id: edition.identifier,
        name: edition.name,
        language: edition.language,
        languageCode: edition.language, // The API uses 'language' field for code (e.g. 'en')
        isActive: true,
        isDefault: translations.length === 0
      }, { merge: true });
      toast({ title: "Translation Activated" });
    }
  };

  const filtered = available.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-2xl border border-zinc-900">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white">Language Management</h3>
          <p className="text-xs text-zinc-500 font-medium">Control which translation editions are available on the Quran page.</p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-11 px-6 font-bold bg-white text-black hover:bg-zinc-200 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Activate New Translation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[700px] p-0 h-[80vh] flex flex-col">
            <DialogHeader className="p-6 border-b border-zinc-800 shrink-0">
              <DialogTitle className="text-white font-bold text-xl">Available Editions</DialogTitle>
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input 
                  placeholder="Search by language or name..." 
                  className="pl-10 bg-zinc-900 border-zinc-800 text-white rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
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
                        const isActivated = translations.some(t => t.id === item.identifier);
                        return (
                          <div key={item.identifier} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-sm">{item.name}</span>
                              <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">{item.language} • {item.identifier}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant={isActivated ? "destructive" : "secondary"}
                              className="rounded-xl font-bold min-w-[100px]"
                              onClick={() => toggleTranslation(item)}
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

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-2xl shadow-xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 text-zinc-500">Edition Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Language</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Identifier</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {translations.map((t) => (
              <TableRow key={t.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-20">
                <TableCell className="font-bold text-white">{t.name}</TableCell>
                <TableCell className="text-zinc-500 font-medium">{t.language}</TableCell>
                <TableCell className="text-zinc-500 font-mono text-xs">{t.id}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, 'quran_translations', t.id))} className="text-destructive hover:bg-destructive/10 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {translations.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center text-zinc-600 italic font-medium">No custom translations activated yet. Defaulting to Sahih International.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
// Rest of the Admin code remains same (Dashboard, ChannelManagement, etc.)
