
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, PlusSquare, BookOpen, User, ShieldAlert, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Discover', icon: Compass, href: '/discover' },
  { label: 'Upload', icon: PlusSquare, href: '/upload' },
  { label: 'Quran', icon: BookOpen, href: '/quran' },
  { label: 'Channel', icon: User, href: '/channel' },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 relative",
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && <div className="absolute -top-1 w-8 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/admin"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 relative",
              pathname === '/admin' ? "text-accent scale-110" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldAlert className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-tight">Admin</span>
          </Link>
        </div>
      </nav>

      {/* Desktop Top Nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border px-8 h-16 items-center justify-between shadow-sm">
        <Link href="/" className="text-xl font-bold text-primary flex items-center space-x-2 group">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-lg shadow-primary/20">
             <PlusSquare className="text-white w-5 h-5" />
          </div>
          <span className="font-headline tracking-tight text-2xl">VlogNest</span>
        </Link>
        <div className="flex items-center space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 text-sm font-semibold transition-all hover:translate-y-[-1px]",
                  isActive ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/admin"
            className={cn(
              "flex items-center space-x-2 text-sm font-semibold transition-all hover:translate-y-[-1px]",
              pathname === '/admin' ? "text-accent border-b-2 border-accent pb-1" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Admin</span>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {!isUserLoading && user ? (
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground hidden lg:inline-block">{user.email}</span>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/channel'}>
                My Channel
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button className="bg-primary text-white px-6 py-2 rounded-full text-xs font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </nav>
      {/* Spacer for Desktop top bar */}
      <div className="hidden md:block h-16" />
    </>
  );
}
