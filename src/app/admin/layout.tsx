
"use client";

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
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
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('idle');

  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  const isVerifiedAdmin = !!adminData;

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const copyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      toast({ title: "UID Copied" });
      setTimeout(() => setCopied(false), 2000);
    }
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

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/channels', label: 'Channel Hub', icon: Youtube },
    { href: '/admin/videos', label: 'Video Catalog', icon: VideoIcon },
    { href: '/admin/scholars', label: 'Scholars', icon: Mic2 },
    { href: '/admin/hadith', label: 'Hadith Hub', icon: ScrollText },
    { href: '/admin/quran', label: 'Quran Tools', icon: Book },
    { href: '/admin/settings', label: 'App Settings', icon: Settings },
  ];

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
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild
                          isActive={isActive}
                          className={cn("w-full h-12 px-4 transition-all", isActive ? "bg-zinc-900 text-white font-bold" : "text-zinc-500")}
                        >
                          <Link href={item.href}>
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
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
             <h2 className="font-headline font-bold text-2xl text-white capitalize">
               {pathname === '/admin' ? 'Dashboard' : pathname?.split('/').pop()?.replace('-', ' ')}
             </h2>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => router.push('/')}
               className="border-white text-white hover:bg-white hover:text-black font-bold rounded-xl h-10 px-6 transition-all flex items-center gap-2"
             >
               <ExternalLink className="w-4 h-4" />
               Live Site
             </Button>
          </header>

          <main className="p-8 pb-32">
            {children}
          </main>
        </SidebarInset>

        {/* Global Sync Dialog */}
        <Dialog open={isSyncing}>
          <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl p-10 outline-none">
            <DialogHeader className="flex flex-col items-center text-center space-y-6">
               <Database className="w-12 h-12 text-white animate-pulse" />
               <DialogTitle className="text-xl font-bold">Synchronizing Database</DialogTitle>
               <DialogDescription className="text-zinc-500 text-sm">Persisting spiritual content. Please do not close this window.</DialogDescription>
            </DialogHeader>
            <div className="w-full space-y-4 py-6">
                 <Progress value={syncProgress} className="h-2 bg-zinc-900" />
                 <p className="text-center text-[10px] text-zinc-500 uppercase font-black tracking-widest">{syncStatus}...</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
