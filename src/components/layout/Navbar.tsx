"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, User, Play, ShieldCheck, Mic2, ScrollText, LogIn, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const baseNavItems = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'quran', label: 'Quran', icon: BookOpen, href: '/quran' },
  { id: 'hadith', label: 'Hadith', icon: ScrollText, href: '/hadith' },
  { id: 'speakers', label: 'Speakers', icon: Mic2, href: '/speakers' },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData } = useDoc(adminRef);
  const isAdmin = !!adminData;

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'app_config'), [db]);
  const { data: settings } = useDoc(settingsRef);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const filteredNavItems = baseNavItems.filter(item => {
    if (settings?.navigationVisibility) {
      const isVisible = settings.navigationVisibility[item.id as keyof typeof settings.navigationVisibility];
      if (isVisible === false) return false;
    }
    return true;
  });

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-primary text-primary-foreground rounded-lg p-1.5">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <span className="inline-block font-bold text-xl tracking-tighter">VlogNest</span>
            </Link>

            {/* Desktop Nav - Only for lg screens and above */}
            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList>
                {filteredNavItems.map((item) => (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink asChild>
                      <Link 
                        href={item.href}
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "bg-transparent cursor-pointer",
                          pathname === item.href && "text-foreground font-bold underline underline-offset-4 decoration-2 decoration-primary"
                        )}
                      >
                        {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild className="hidden lg:flex gap-2">
                <Link href="/admin">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin Studio</span>
                </Link>
              </Button>
            )}
            
            {!isUserLoading && user ? (
              <Button variant="outline" size="sm" asChild className="gap-2 rounded-full px-4 h-9">
                <Link href="/channel">
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline">{user.email?.split('@')[0]}</span>
                </Link>
              </Button>
            ) : (
              <Button size="sm" asChild className="gap-2 h-9 px-4 rounded-full">
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Unified Tablet & Mobile Nav (Bottom Bar) - Visible below lg breakpoint */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background lg:hidden shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
              <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300",
              pathname.startsWith('/admin') ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Admin</span>
          </Link>
        )}
      </nav>
    </>
  );
}
