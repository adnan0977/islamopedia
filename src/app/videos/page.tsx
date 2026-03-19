
"use client";

import { useMemo, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, limit } from 'firebase/firestore';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Filter, Loader2, ArrowLeft, Video as VideoIcon, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function VideosPage() {
  const searchParams = useSearchParams();
  const db = useFirestore();
  
  const speakerId = searchParams.get('speakerId');
  const channelId = searchParams.get('channelId');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 32; // Increased for higher density grid

  // Fetch contextual info if filtering
  const speakerRef = useMemoFirebase(() => speakerId ? doc(db, 'speakers', speakerId) : null, [db, speakerId]);
  const { data: speaker } = useDoc(speakerRef);

  const channelRef = useMemoFirebase(() => channelId ? doc(db, 'channels', channelId) : null, [db, channelId]);
  const { data: channel } = useDoc(channelRef);

  // Dynamic Video Query
  const videoQuery = useMemoFirebase(() => {
    const videosCol = collection(db, 'videos');
    
    if (speakerId) {
      return query(videosCol, where('speakerIds', 'array-contains', speakerId), limit(500));
    } 
    
    if (channelId) {
      return query(videosCol, where('channelId', '==', channelId), limit(500));
    }
    
    return query(videosCol, orderBy('publishedAt', 'desc'), limit(500));
  }, [db, speakerId, channelId]);

  const { data: allVideos, isLoading } = useCollection(videoQuery);

  const paginatedVideos = useMemo(() => {
    if (!allVideos) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return allVideos.slice(start, start + itemsPerPage);
  }, [allVideos, currentPage]);

  const totalPages = Math.ceil((allVideos?.length || 0) / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [speakerId, channelId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-900 pb-8">
        <div className="space-y-4">
          <Link href="/" className="text-xs font-bold text-zinc-500 hover:text-zinc-100 flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-2xl">
              <VideoIcon className="w-8 h-8 text-zinc-500" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold text-zinc-100 uppercase tracking-tight">
                {speaker ? `Reflections: ${speaker.name}` : channel ? `From: ${channel.title}` : 'Video Catalog'}
              </h1>
              <p className="text-zinc-500 text-sm">
                Curated high-performance spiritual content library.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(speakerId || channelId) && (
            <Link href="/videos">
              <Button variant="outline" size="sm" className="rounded-xl font-bold border-zinc-800 text-zinc-500 hover:text-white">Clear Filters</Button>
            </Link>
          )}
          <Badge variant="secondary" className="h-10 px-4 rounded-xl font-bold flex gap-2 bg-zinc-950 border-zinc-900 text-zinc-400">
            <Filter className="w-3 h-3" />
            {allVideos?.length || 0} Results
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
          <p className="text-zinc-600 font-medium uppercase tracking-widest text-[10px]">Opening Catalog...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-4 lg:gap-6">
            {paginatedVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
            {(!allVideos || allVideos.length === 0) && (
              <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-3xl border-2 border-dashed border-zinc-900 space-y-4">
                <VideoIcon className="w-12 h-12 text-zinc-800 mx-auto" />
                <p className="text-zinc-600 font-medium">No videos found matching your criteria.</p>
                <Link href="/videos">
                  <Button variant="link" className="text-zinc-400">View all videos</Button>
                </Link>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-6 pt-12 border-t border-zinc-900">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="rounded-xl border-zinc-800 bg-zinc-950 h-12 px-6 font-bold"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                </Button>
                <div className="px-6 h-12 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-center min-w-[100px]">
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="rounded-xl border-zinc-800 bg-zinc-950 h-12 px-6 font-bold"
                >
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VideoCard({ video }: { video: any }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="overflow-hidden group cursor-pointer bg-zinc-950 border-zinc-900 hover:border-zinc-700 transition-all duration-500 shadow-xl rounded-xl md:rounded-2xl h-full flex flex-col">
      <Link href={`/watch?v=${video.id}`} className="flex flex-col h-full">
        <div className="relative aspect-video overflow-hidden">
          <Image 
            src={video.thumbnailUrl} 
            alt={video.title} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-lg w-8 h-8 md:w-10 md:h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500 shadow-2xl">
              <Play className="text-zinc-300 fill-zinc-300 ml-0.5 w-3 h-3 md:w-4 md:h-4" />
            </div>
          </div>
        </div>
        <CardHeader className="p-3 md:p-4 flex-1 flex flex-col justify-between">
          <CardTitle className="font-bold leading-tight line-clamp-2 min-h-[2rem] text-zinc-300 group-hover:text-white transition-colors text-[9px] md:text-[11px] lg:text-xs tracking-tight mb-2">
            {video.title}
          </CardTitle>
          <div className="flex items-center justify-between text-[7px] md:text-[8px] text-zinc-600 font-black uppercase tracking-widest pt-2 border-t border-zinc-900">
            <div className="flex items-center gap-1">
               <Smartphone className="w-2.5 h-2.5" />
               <span>{video.appViewCount > 1000 ? (video.appViewCount / 1000).toFixed(1) + 'K' : video.appViewCount || 0}</span>
            </div>
            <span className="hidden md:inline">{mounted ? new Date(video.publishedAt).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) : ''}</span>
          </div>
        </CardHeader>
      </Link>
    </Card>
  );
}
