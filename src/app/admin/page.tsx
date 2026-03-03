
"use client";

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc, setDoc, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Youtube, 
  Video, 
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
  CheckCircle2
} from 'lucide-react';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
import { cn } from '@/lib/utils';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

type AdminTab = 'channels' | 'videos' | 'quran' | 'settings';

export default function AdminPanel() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('channels');
  const [copied, setCopied] = useState(false);

  // Admin Check
  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  // Collections
  const channelsRef = useMemoFirebase(() => collection(db, 'channels'), [db]);
  const { data: channels } = useCollection(channelsRef);

  const videosRef = useMemoFirebase(() => collection(db, 'videos'), [db]);
  const { data: videos } = useCollection(videosRef);

  const surahsRef = useMemoFirebase(() => collection(db, 'quran_surahs'), [db]);
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
            <Button variant="outline" onClick={() => signOut(auth)} className="w-full h-12 font-bold text-destructive hover:bg-destructive/10">
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
                      <Video className="w-5 h-5" />
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
              onClick={() => signOut(auth)}
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
                 {activeTab === 'channels' && 'YouTube Channels'}
                 {activeTab === 'videos' && 'Video Catalog'}
                 {activeTab === 'quran' && 'Quranic Metadata'}
                 {activeTab === 'settings' && 'System Settings'}
               </h2>
             </div>
             <div className="flex items-center gap-4">
               <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>View Live Site</Button>
               {activeTab !== 'settings' && (
                 <Button size="sm" className="bg-primary hover:bg-primary/90 font-bold">
                   <Plus className="w-4 h-4 mr-2" />
                   Add New
                 </Button>
               )}
             </div>
          </header>

          <main className="p-8">
            {activeTab === 'channels' && <ChannelManagement channels={channels || []} />}
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

function ChannelManagement({ channels }: { channels: any[] }) {
  const db = useFirestore();
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this channel?')) {
      deleteDocumentNonBlocking(doc(db, 'channels', id));
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
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
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Youtube className="w-4 h-4 text-red-500" />
                    </div>
                    {channel.title}
                  </div>
                </TableCell>
                <TableCell>{channel.subscribersCount?.toLocaleString() || '0'}</TableCell>
                <TableCell>{channel.videoCount || '0'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="hover:text-primary"><Edit3 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(channel.id)}>
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
  const handleDelete = (id: string) => {
    if (confirm('Delete this video?')) {
      deleteDocumentNonBlocking(doc(db, 'videos', id));
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
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
                    <Button variant="ghost" size="icon" className="hover:text-primary"><Edit3 className="w-4 h-4" /></Button>
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
  const handleDelete = (id: string) => {
    if (confirm('Delete Surah record?')) {
      deleteDocumentNonBlocking(doc(db, 'quran_surahs', id));
    }
  };

  return (
    <Card className="bg-card border-border shadow-sm">
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
