
'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Quote } from 'lucide-react';

export function HadithManager() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full">
      <Card className="bg-zinc-950 border-zinc-900 rounded-[2rem] p-20 text-center space-y-6">
        <Quote className="w-16 h-16 text-zinc-800 mx-auto" />
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold text-white">Index from Scratch</CardTitle>
          <CardDescription className="text-zinc-500">
            All previous Hadith data has been cleared. You can now begin adding your new datasets.
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
