
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, PlusSquare, BookOpen, User, Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

const baseNavItems = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Discover', icon: Compass, href: '/discover' },
  { label: 'Upload', icon: PlusSquare, href: '/upload', adminOnly: true },
  { label: 'Quran', icon: BookOpen, href: '/quran' },
  { label: 'Channel', icon: User, href: '/channel' },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData } = useDoc(adminRef);
  const isAdmin = !!adminData;

  const filteredNavItems = baseNavItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md border-b border-border h-24 shadow-sm">
        <div className="max-w-7xl mx-auto w-full px-8 flex items-center justify-between h-full">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-all shadow-lg shadow-primary/20">
               <Sparkles className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline tracking-tight text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                VlogNest
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Creator Studio</span>
            </div>
          </Link>

          {/* Nav Items Section - Centered */}
          <div className="flex items-center gap-1 bg-secondary/30 p-1.5 rounded-2xl border border-border/50 shadow-inner">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all relative group/item",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/30" 
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive && "stroke-[2.5px]")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4 shrink-0">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="hidden lg:flex rounded-xl gap-2 font-bold border-accent/30 text-accent hover:bg-accent/10 h-11 px-5">
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
            {!isUserLoading && user ? (
              <Link href="/channel" className="flex items-center gap-3 bg-secondary/40 p-1.5 pr-5 rounded-2xl border border-border/60 hover:border-primary/50 transition-all h-12">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold truncate max-w-[100px] leading-tight">{user.email?.split('@')[0]}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Creator</span>
                </div>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" className="bg-primary text-white font-bold rounded-2xl px-8 h-12 shadow-xl shadow-primary/20 transition-transform active:scale-95">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-background/90 backdrop-blur-xl border-t border-border md:hidden pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center h-20 px-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full space-y-1.5 transition-all relative group",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 w-10 h-1 bg-primary rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                )}
                <Icon className={cn("w-6 h-6 transition-transform group-active:scale-90", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
