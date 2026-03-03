
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, PlusSquare, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', icon: Home, href: '/' },
  { label: 'Discover', icon: Compass, href: '/discover' },
  { label: 'Upload', icon: PlusSquare, href: '/upload' },
  { label: 'Quran', icon: BookOpen, href: '/quran' },
  { label: 'Channel', icon: User, href: '/channel' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar (Optional, for now just a top bar for demo) */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border px-6 h-16 items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
             <PlusSquare className="text-white w-5 h-5" />
          </div>
          <span className="font-headline tracking-tight">VlogNest</span>
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
                  "flex items-center space-x-2 text-sm font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center space-x-4">
          <button className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-primary/90 transition-all">
            Connect YouTube
          </button>
        </div>
      </nav>
      {/* Spacer for Desktop top bar */}
      <div className="hidden md:block h-16" />
    </>
  );
}
