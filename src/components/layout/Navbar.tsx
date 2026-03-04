
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, PlusSquare, BookOpen, User, LogIn, Sparkles, ShieldCheck } from 'lucide-react';
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

  // Hide Navbar on admin routes for a cleaner workspace
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
      {/* Desktop Top Nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 h-20 items-center shadow-2xl">
        <div className="max-w-7xl mx-auto w-full px-8 flex items-center justify-between h-full">
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:rotate-6 transition-all shadow-lg shadow-primary/20">
               <Sparkles className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="font-headline tracking-tighter text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                VlogNest
              </span>
              <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Creator Studio</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-2xl border border-border/40">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all relative group/item",
                    isActive 
                      ? "bg-primary text-white shadow-md shadow-primary/10" 
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
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="hidden lg:flex rounded-xl gap-2 font-bold border-accent/20 text-accent hover:bg-accent/10">
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
            {!isUserLoading && user ? (
              <Link href="/channel" className="flex items-center gap-3 bg-secondary/50 p-1.5 pr-4 rounded-xl border border-border/60 hover:border-primary/40 transition-all">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold truncate max-w-[100px]">{user.email?.split('@')[0]}</span>
                </div>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="sm" className="bg-primary text-white font-bold rounded-xl px-6 h-10 shadow-lg shadow-primary/20">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50 md:hidden safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 w-8 h-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                )}
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
