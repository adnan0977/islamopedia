
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { Mic2, Loader2, Search, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function SpeakersPage() {
  const db = useFirestore();
  const [search, setSearch] = useState('');
  
  const speakersQuery = useMemoFirebase(() => query(collection(db, 'speakers'), limit(100)), [db]);
  const { data: speakers, isLoading } = useCollection(speakersQuery);

  const filteredSpeakers = speakers?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 pb-32">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="md:hidden">
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </Link>
            <h1 className="text-3xl font-headline font-bold text-zinc-100">Our Scholars</h1>
          </div>
          <p className="text-zinc-500 text-sm">Explore reflections and insights from leading spiritual teachers.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search scholars..." 
            className="pl-10 bg-zinc-950 border-zinc-900 h-12 rounded-xl text-white focus:ring-zinc-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
          <p className="text-zinc-600 font-medium">Loading directory...</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-6">
          {filteredSpeakers?.map((speaker) => (
            <Link key={speaker.id} href={`/videos?speakerId=${speaker.id}`} className="group space-y-3 text-center">
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-900 p-1 ring-1 ring-zinc-900 group-hover:ring-zinc-700 transition-all duration-500 bg-zinc-950 shadow-lg">
                <Image 
                  src={speaker.profileImageUrl || 'https://picsum.photos/seed/speaker/400'} 
                  alt={speaker.name} 
                  fill
                  className="rounded-xl object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-700" />
              </div>
              <div className="space-y-1 px-1">
                <h3 className="text-[9px] md:text-[10px] uppercase tracking-[0.15em] font-black text-zinc-600 group-hover:text-zinc-100 transition-colors line-clamp-1">
                  {speaker.name}
                </h3>
              </div>
            </Link>
          ))}
          {(!filteredSpeakers || filteredSpeakers.length === 0) && (
            <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-3xl border-2 border-dashed border-zinc-900">
               <Mic2 className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
               <p className="text-zinc-600 font-medium">No scholars found matching "{search}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
