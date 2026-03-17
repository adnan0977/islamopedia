
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
  UserPlus,
  Menu
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
  SidebarGroupContent,
  SidebarTrigger
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
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-zinc-50">
        <Loader2 className="w-12 h-12 animate-spin text-zinc-400" />
        <p className="text-zinc-400 font-bold text-xs uppercase tracking-[0.2em]">Verifying Studio Access...</p>
      </div>
    );
  }

  if (!user || !isVerifiedAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-200 text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-zinc-100 border border-zinc-200 rounded-[2rem] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-10 h-10 text-zinc-400" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-zinc-900">Studio Restricted</h1>
            <p className="text-zinc-500 text-sm px-4">Authorized access only. Please sign in with an administrator account.</p>
          </div>

          <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-200 shadow-inner flex flex-col gap-4">
             <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-zinc-200">
               <code className="text-[10px] font-mono truncate text-zinc-500">{user?.uid || 'NOT_LOGGED_IN'}</code>
               <Button variant="ghost" size="sm" onClick={copyUid} className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-900">
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
             </div>
             
             {isTargetAdminEmail && !isVerifiedAdmin && (
               <Button 
                 className="w-full h-12 bg-zinc-900 text-white hover:bg-zinc-800 font-bold rounded-xl"
                 onClick={handleBootstrapAdmin}
                 disabled={isBootstrapping}
               >
                 {isBootstrapping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                 Initialize Admin Status
               </Button>
             )}
          </div>

          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={handleSignOut} className="w-full rounded-xl h-12 font-bold border-zinc-200 text-zinc-600">Sign Out</Button>
            <Link href="/">
              <Button variant="link" className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Return to Public Site</Button>
            </Link>
          </div>
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
      <div className="flex min-h-screen w-full bg-zinc-50 text-zinc-900">
        <Sidebar className="border-r border-zinc-200 bg-white">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-lg text-zinc-900 leading-none">Studio</span>
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mt-1">Administrator</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <SidebarGroup>
              <SidebarGroupLabel className="px-2 text-[10px] font-black text-zinc-400 uppercase mb-4 tracking-[0.2em]">Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton 
                          asChild
                          isActive={isActive}
                          className={cn(
                            "w-full h-11 px-4 transition-all rounded-xl", 
                            isActive 
                              ? "bg-zinc-900 text-white font-bold shadow-lg" 
                              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                          )}
                        >
                          <Link href={item.href}>
                            <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-zinc-400")} />
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
          <SidebarFooter className="p-6 border-t border-zinc-100">
            <Button variant="ghost" className="w-full justify-start text-zinc-500 hover:text-red-600 hover:bg-red-50" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" /> 
              <span className="font-bold text-sm">Sign Out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 overflow-auto bg-zinc-50 p-0">
          <header className="h-20 border-b border-zinc-200 flex items-center justify-between px-4 md:px-8 bg-white/80 sticky top-0 z-10 backdrop-blur-md">
             <div className="flex items-center gap-4">
               <SidebarTrigger className="md:hidden h-10 w-10 border border-zinc-200 rounded-xl bg-white" />
               <h2 className="font-headline font-bold text-xl md:text-2xl text-zinc-900 capitalize">
                 {pathname === '/admin' ? 'Overview' : pathname?.split('/').pop()?.replace('-', ' ')}
               </h2>
             </div>
             <div className="flex items-center gap-3">
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => router.push('/')}
                 className="hidden md:flex border-zinc-200 text-zinc-600 hover:bg-zinc-900 hover:text-white font-bold rounded-xl h-10 px-6 transition-all items-center gap-2"
               >
                 <ExternalLink className="w-4 h-4" />
                 View Site
               </Button>
               <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                 <span className="text-xs font-black text-zinc-400">{user.email?.charAt(0).toUpperCase()}</span>
               </div>
             </div>
          </header>

          <main className="p-4 md:p-8 pb-32 max-w-[1600px] mx-auto w-full">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
