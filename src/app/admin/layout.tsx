
"use client";

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
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
  Settings,
  ExternalLink,
  ScrollText,
  UserPlus
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
import { Button } from '@/components/ui/button';
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
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  const isVerifiedAdmin = !!adminData;
  const isTargetAdminEmail = user?.email === 'adnan@gmail.com';

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleBootstrapAdmin = async () => {
    if (!user?.uid || !isTargetAdminEmail) return;
    
    setIsBootstrapping(true);
    try {
      // Create the admin record. Security rules now permit this for adnan@gmail.com
      await setDoc(doc(db, 'roles_admin', user.uid), {
        email: user.email,
        assignedAt: new Date().toISOString(),
        role: 'super-admin'
      });
      toast({ title: "Admin Status Initialized", description: "Your studio permissions have been verified." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Bootstrap Failed", description: e.message });
    } finally {
      setIsBootstrapping(false);
    }
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
        <p className="text-zinc-500 font-medium text-sm uppercase tracking-widest font-black">Verifying studio access...</p>
      </div>
    );
  }

  if (!user || !isVerifiedAdmin) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-8 bg-background min-h-screen flex flex-col justify-center">
        <div className="space-y-4">
          <div className="w-20 h-20 bg-zinc-950 border border-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl">
            <ShieldAlert className="w-10 h-10 text-zinc-500" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-white">Studio Restricted</h1>
          <p className="text-zinc-500 text-sm px-8">This portal is reserved for authorized creators and researchers.</p>
        </div>

        <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-inner flex flex-col gap-4">
           <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-zinc-900">
             <code className="text-[10px] font-mono truncate text-zinc-400">{user?.uid || 'NOT_LOGGED_IN'}</code>
             <Button variant="ghost" size="sm" onClick={copyUid} className="h-8 w-8 p-0 text-zinc-600 hover:text-white">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
           </div>
           
           {isTargetAdminEmail && !isVerifiedAdmin && (
             <Button 
               className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl"
               onClick={handleBootstrapAdmin}
               disabled={isBootstrapping}
             >
               {isBootstrapping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
               Initialize Admin Status
             </Button>
           )}
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={handleSignOut} className="w-full rounded-xl h-12 font-bold border-zinc-800 text-zinc-500">Sign Out</Button>
          <Link href="/">
            <Button variant="link" className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Return to Public Site</Button>
          </Link>
        </div>
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
      </div>
    </SidebarProvider>
  );
}
