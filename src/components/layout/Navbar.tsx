
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border md:hidden safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute -top-[1px] w-12 h-[2px] bg-primary rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                )}
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border h-16 items-center shadow-sm">
        <div className="max-w-7xl mx-auto w-full px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:rotate-6 transition-all shadow-lg shadow-primary/20">
               <Sparkles className="text-white w-5 h-5" />
            </div>
            <span className="font-headline tracking-tighter text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              VlogNest
            </span>
          </Link>

          <div className="flex items-center space-x-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {!isUserLoading && user ? (
              <div className="flex items-center gap-3 bg-secondary/50 p-1.5 pr-4 rounded-2xl border border-border/50">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Creator</span>
                  <span className="text-xs font-bold truncate max-w-[120px]">{user.email?.split('@')[0]}</span>
                </div>
              </div>
            ) : (
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 text-white px-6 h-10 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
      {/* Spacer for Desktop top bar */}
      <div className="hidden md:block h-16" />
    </>
  );
}
