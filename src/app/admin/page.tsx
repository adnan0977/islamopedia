
"use client";

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, query, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Youtube, 
  Video as VideoIcon, 
  Book, 
  Loader2, 
  LayoutDashboard,
  LogOut,
  Copy,
  CheckCircle2,
  Mic2,
  Database,
  Settings,
  ExternalLink,
  ScrollText
} from 'lucide-react';
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
  DialogDescription
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

// Feature Components
import { DashboardOverview } from '@/features/admin/components/DashboardOverview';
import { QuranHub } from '@/features/admin/components/QuranHub';
import { AppSettings } from '@/features/admin/components/AppSettings';
import { ChannelHub } from '@/features/admin/components/ChannelHub';
import { VideoCatalog } from '@/features/admin/components/VideoCatalog';
import { ScholarDirectory } from '@/features/admin/components/ScholarDirectory';
import { HadithManager } from '@/features/admin/components/HadithManager';
import { AdminTab, SyncState } from '@/features/admin/types';

export default function AdminPanel() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [copied, setCopied] = useState(false);

  // Sync State for Quran Hub
  const [sync, setSync] = useState<SyncState>({ isSyncing: false, progress: 0, status: 'idle' });

  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  const isVerifiedAdmin = !!adminData;

  // Real Data Queries for Dashboard
  const channelsQuery = useMemoFirebase(() => (isVerifiedAdmin ? query(collection(db, 'channels'), limit(1000)) : null), [db, isVerifiedAdmin]);
  const { data: channels } = useCollection(channelsQuery);

  const videosQuery = useMemoFirebase(() => (isVerifiedAdmin ? query(collection(db, 'videos'), limit(1000)) : null), [db, isVerifiedAdmin]);
  const { data: videos } = useCollection(videosQuery);

  const speakersQuery = useMemoFirebase(() => (isVerifiedAdmin ? query(collection(db, 'speakers'), limit(1000)) : null), [db, isVerifiedAdmin]);
  const { data: speakers } = useCollection(speakersQuery);

  const editionsQuery = useMemoFirebase(() => (isVerifiedAdmin ? query(collection(db, 'quran_editions'), limit(1000)) : null), [db, isVerifiedAdmin]);
  const { data: editions } = useCollection(editionsQuery);

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      toast({ title: "UID Copied" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

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
        <ShieldAlert className="w-16 h-16 text-zinc-500 mx-auto" />
        <h1 className="text-3xl font-headline font-bold text-white">Access Denied</h1>
        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
           <code className="text-xs font-mono truncate text-left text-white">{user?.uid || 'N/A'}</code>
           <Button variant="secondary" size="sm" onClick={copyUid}>
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <Button variant="outline" onClick={handleSignOut} className="w-full">Sign Out</Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar className="border-r border-zinc-900 bg-zinc-950">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-white w-8 h-8" />
              <span className="font-headline font-bold text-lg text-white">Admin Hub</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-[10px] font-black text-zinc-600 uppercase mb-2">Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'channels', label: 'Channel Hub', icon: Youtube },
                    { id: 'videos', label: 'Video Catalog', icon: VideoIcon },
                    { id: 'scholars', label: 'Scholars', icon: Mic2 },
                    { id: 'hadith', label: 'Hadith Hub', icon: ScrollText },
                    { id: 'quran-tools', label: 'Quran Tools', icon: Book },
                    { id: 'settings', label: 'App Settings', icon: Settings },
                  ].map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        onClick={() => setActiveTab(item.id as AdminTab)}
                        isActive={activeTab === item.id}
                        className={cn("w-full h-12 px-4 transition-all", activeTab === item.id ? "bg-zinc-900 text-white font-bold" : "text-zinc-500")}
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
          <SidebarFooter className="p-4 border-t border-zinc-900">
            <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto bg-black p-0">
          <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/50 sticky top-0 z-10 backdrop-blur-md">
             <h2 className="font-headline font-bold text-2xl text-white capitalize">{activeTab.replace('-', ' ')}</h2>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => window.location.href = '/'}
               className="border-white text-white hover:bg-white hover:text-black font-bold rounded-xl h-10 px-6 transition-all flex items-center gap-2"
             >
               <ExternalLink className="w-4 h-4" />
               Live Site
             </Button>
          </header>

          <main className="p-8 pb-32">
            {activeTab === 'dashboard' && (
              <DashboardOverview 
                channels={channels || []} 
                videos={videos || []} 
                speakers={speakers || []} 
                editions={editions || []} 
              />
            )}
            {activeTab === 'channels' && (
              <ChannelHub videos={videos || []} />
            )}
            {activeTab === 'videos' && (
              <VideoCatalog />
            )}
            {activeTab === 'scholars' && (
              <ScholarDirectory />
            )}
            {activeTab === 'hadith' && (
              <HadithManager />
            )}
            {activeTab === 'quran-tools' && (
              <QuranHub 
                editions={editions || []} 
                syncing={sync.isSyncing} 
                setSyncing={(val) => setSync(prev => ({ ...prev, isSyncing: val }))}
                setProgress={(val) => setSync(prev => ({ ...prev, progress: val }))}
                setSyncStatus={(val) => setSync(prev => ({ ...prev, status: val }))}
              />
            )}
            {activeTab === 'settings' && (
              <AppSettings />
            )}
          </main>
        </SidebarInset>

        {/* Global Sync Dialog */}
        <Dialog open={sync.isSyncing}>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl p-10 outline-none">
            <DialogHeader className="flex flex-col items-center text-center space-y-6">
               <Database className="w-12 h-12 text-white animate-pulse" />
               <DialogTitle className="text-xl font-bold">Synchronizing Database</DialogTitle>
               <DialogDescription className="text-zinc-500 text-sm">Persisting spiritual content. Please do not close this window.</DialogDescription>
            </DialogHeader>
            <div className="w-full space-y-4 py-6">
                 <Progress value={sync.progress} className="h-2 bg-zinc-900" />
                 <p className="text-center text-[10px] text-zinc-500 uppercase font-black tracking-widest">{sync.status}...</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
