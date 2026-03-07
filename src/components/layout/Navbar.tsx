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
      {/* Desktop Nav (Top) */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-zinc-900 h-24 items-center">
        <div className="max-w-7xl mx-auto w-full px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-12 h-12 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-center group-hover:border-zinc-700 transition-all shadow-xl">
               <Sparkles className="text-zinc-500 group-hover:text-zinc-300 w-6 h-6 transition-colors" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-headline tracking-tight text-2xl font-bold text-zinc-300 group-hover:text-white transition-colors">
                VlogNest
              </span>
              <span className="text-[10px] text-zinc-600 uppercase font-black tracking-widest leading-none">Creator Studio</span>
            </div>
          </Link>

          <div className="flex items-center gap-1 bg-zinc-950/50 p-1.5 rounded-2xl border border-zinc-900 shadow-inner">
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
                      ? "bg-white/5 text-zinc-100 border border-white/10" 
                      : "text-zinc-600 hover:bg-zinc-900/50 hover:text-zinc-400"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive && "stroke-[2px]")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="hidden lg:flex rounded-xl gap-2 font-bold border-zinc-900 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900 h-11 px-5 items-center">
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
            {!isUserLoading && user ? (
              <Link href="/channel" className="flex items-center gap-3 bg-zinc-950/50 p-1.5 pr-5 rounded-2xl border border-zinc-900 hover:border-zinc-800 transition-all h-12">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                  <User className="w-5 h-5 text-zinc-600" />
                </div>
                <div className="flex flex-col text-left justify-center">
                  <span className="text-xs font-bold truncate max-w-[100px] leading-tight text-zinc-400">{user.email?.split('@')[0]}</span>
                  <span className="text-[9px] text-zinc-700 uppercase tracking-widest font-black">Creator</span>
                </div>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 font-bold rounded-2xl px-8 h-12 transition-transform active:scale-95 items-center shadow-lg border border-zinc-700">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Nav (Bottom) */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-900 md:hidden pb-safe h-20">
        <div className="flex justify-around items-center h-full px-4">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all relative group",
                  isActive ? "text-zinc-300" : "text-zinc-700"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 w-8 h-0.5 bg-zinc-600 rounded-full" />
                )}
                <Icon className={cn("w-6 h-6 transition-transform group-active:scale-90", isActive && "stroke-[2px]")} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
