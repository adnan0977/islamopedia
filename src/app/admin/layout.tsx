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

function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 sticky top-0 z-30">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold capitalize tracking-tight">
            {pathname === '/admin' ? 'Dashboard' : pathname?.split('/').pop()?.replace('-', ' ')}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/')}
            className="hidden md:flex h-8 gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Site
          </Button>
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border">
            <span className="text-[10px] font-bold text-muted-foreground">{user?.email?.charAt(0).toUpperCase()}</span>
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
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isVerifiedAdmin) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-xl border shadow-lg text-center space-y-6">
          <div className="space-y-2">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold">Studio Restricted</h1>
            <p className="text-muted-foreground text-sm">Authorized access only. Please sign in with an administrator account.</p>
          </div>

          {isTargetAdminEmail && !isVerifiedAdmin && (
            <Button className="w-full" onClick={handleBootstrapAdmin} disabled={isBootstrapping}>
              {isBootstrapping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Initialize Admin Status
            </Button>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">Return to Public Site</Link>
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
    { href: '/admin/hadith', label: 'Hadith Hub', icon: ScrollText },
    { href: '/admin/quran', label: 'Quran Tools', icon: Book },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <SidebarProvider>
      <Sidebar className="border-r bg-sidebar">
        <SidebarHeader className="h-14 flex items-center border-b px-4 bg-sidebar">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-sm tracking-tight">VlogNest Studio</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="bg-sidebar">
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-4 bg-sidebar">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}