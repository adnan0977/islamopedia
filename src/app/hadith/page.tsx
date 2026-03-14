
"use client";

import { Card } from '@/components/ui/card';
import { Quote } from 'lucide-react';

export default function HadithPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-32 text-center space-y-6">
      <Quote className="w-16 h-16 text-zinc-800 mx-auto" />
      <h1 className="text-3xl font-headline font-bold text-zinc-100">Hadith Library</h1>
      <p className="text-zinc-500 max-w-md mx-auto">
        The library is currently being prepared. Please check back soon or use the Admin Panel to index content.
      </p>
    </div>
  );
}
