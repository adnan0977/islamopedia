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
  SidebarGroupContent,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white px-6 sticky top-0 z-30 shadow-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">
            Studio / {pathname === '/admin' ? 'Dashboard' : pathname?.split('/').pop()?.replace('-', ' ')}
          </h2>
        </div>
        <div className="flex items-center gap-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/')}
            className="hidden md:flex h-9 rounded-xl gap-2 font-bold border-zinc-200 hover:bg-zinc-900 hover:text-white transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Public Site
          </Button>
          <div className="flex items-center gap-3 border-l pl-6">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs font-bold text-zinc-900 leading-none">{user?.email?.split('@')[0]}</span>
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mt-1">Super Admin</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-zinc-900 flex items-center justify-center border shadow-xl">
              <span className="text-xs font-black text-white">{user?.email?.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  
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
      toast({ title: "Admin Status Initialized" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Bootstrap Failed", description: e.message });
    } finally {
      setIsBootstrapping(false);
    }
  };

  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-900" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Authenticating Studio...</p>
        </div>
      </div>
    );
  }

  if (!user || !isVerifiedAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[3rem] border shadow-2xl text-center space-y-8">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900">Restricted Node</h1>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed">Authorized access only. Please sign in with a verified administrator identity to access the studio engine.</p>
          </div>

          {isTargetAdminEmail && !isVerifiedAdmin && (
            <Button className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all" onClick={handleBootstrapAdmin} disabled={isBootstrapping}>
              {isBootstrapping ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <UserPlus className="w-5 h-5 mr-3" />}
              Initialize Identity
            </Button>
          )}

          <div className="flex flex-col gap-3 pt-6">
            <Button variant="outline" className="h-12 rounded-xl font-bold border-zinc-200" onClick={handleSignOut}>Sign Out</Button>
            <Link href="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-colors mt-4">Return to Core Site</Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/channels', label: 'Channels', icon: Youtube },
    { href: '/admin/videos', label: 'Videos', icon: VideoIcon },
    { href: '/admin/scholars', label: 'Scholars', icon: Mic2 },
    { href: '/admin/hadith', label: 'Hadith Studio', icon: ScrollText },
    { href: '/admin/quran', label: 'Quran Engine', icon: Book },
    { href: '/admin/settings', label: 'Global Settings', icon: Settings },
  ];

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-zinc-200 bg-white" collapsible="icon">
        <SidebarHeader className="h-16 flex items-center border-b px-6 bg-white shrink-0">
          <Link href="/admin" className="flex items-center gap-4 font-black">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-900 group-data-[collapsible=icon]:hidden">Studio</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="bg-white px-2 py-6">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300 mb-4 group-data-[collapsible=icon]:hidden">Main Engine</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href} className="mb-1">
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))}
                      tooltip={item.label}
                      className="h-12 px-4 rounded-xl font-bold transition-all data-[active=true]:bg-zinc-900 data-[active=true]:text-white data-[active=true]:shadow-xl group-data-[collapsible=icon]:justify-center"
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("h-5 w-5 transition-transform duration-500", (pathname === item.href || pathname?.startsWith(item.href)) && "scale-110")} />
                        <span className="ml-3 group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-6 bg-white shrink-0">
          <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-zinc-400 font-bold hover:text-red-600 hover:bg-red-50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" onClick={handleSignOut}>
            <LogOut className="w-5 h-5 mr-3 group-data-[collapsible=icon]:mr-0" />
            <span className="group-data-[collapsible=icon]:hidden">Terminate Session</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-zinc-50/50">
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-8 p-8 md:p-12 lg:p-16 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
