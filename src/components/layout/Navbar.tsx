
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, PlusSquare, BookOpen, User, LogIn, Sparkles } from 'lucide-react';
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

  // Hide Navbar on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Admin Check
  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData } = useDoc(adminRef);
  const isAdmin = !!adminData;

  const filteredNavItems = baseNavItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border/50 md:hidden safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full space-y-1.5 transition-all duration-300 relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 w-10 h-[3px] bg-primary rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-in fade-in slide-in-from-top-1" />
                )}
                <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110 stroke-[2.5px]")} />
                <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50 h-20 items-center shadow-lg transition-all duration-300">
        <div className="max-w-7xl mx-auto w-full px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-xl shadow-primary/30">
               <Sparkles className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="font-headline tracking-tighter text-2xl font-black bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-transparent">
                VlogNest
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-80">Creator Ecosystem</span>
            </div>
          </Link>

          <div className="flex items-center space-x-2 bg-secondary/30 p-1.5 rounded-2xl border border-border/40">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden group/item",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-4 h-4 transition-transform group-hover/item:scale-110", isActive && "stroke-[2.5px]")} />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-5">
            {!isUserLoading && user ? (
              <Link href="/channel" className="flex items-center gap-3 bg-secondary/40 p-1.5 pr-5 rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-secondary/60 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">Authenticated</span>
                  <span className="text-xs font-bold truncate max-w-[110px]">{user.email?.split('@')[0]}</span>
                </div>
              </Link>
            ) : (
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 text-white px-8 h-12 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 flex items-center gap-3">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
      {/* Spacer for Desktop top bar */}
      <div className="hidden md:block h-20" />
    </>
  );
}
