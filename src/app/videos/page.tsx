
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
  const itemsPerPage = 20;

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
              <h1 className="text-3xl font-headline font-bold text-zinc-100">
                {speaker ? `Videos by ${speaker.name}` : channel ? `Videos from ${channel.title}` : 'Library'}
              </h1>
              <p className="text-zinc-500 text-sm">
                Explore our curated collection of spiritual and insightful content.
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
          <p className="text-zinc-600 font-medium">Loading content library...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
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
    <Card className="overflow-hidden group cursor-pointer bg-zinc-950 border-zinc-900 hover:border-zinc-700 transition-all duration-500 shadow-2xl hover:shadow-zinc-500/5 rounded-2xl md:rounded-3xl h-full flex flex-col">
      <Link href={`/watch?v=${video.id}`} className="flex flex-col h-full">
        <div className="relative aspect-video overflow-hidden">
          <Image 
            src={video.thumbnailUrl} 
            alt={video.title} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl w-10 h-10 md:w-14 md:h-14 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 md:translate-y-4 group-hover:translate-y-0 transition-all duration-500 shadow-2xl">
              <Play className="text-zinc-300 fill-zinc-300 ml-0.5 w-4 h-4 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
        <CardHeader className="p-5 flex-1 flex flex-col justify-between">
          <CardTitle className="font-bold leading-tight line-clamp-2 min-h-[2.5rem] text-zinc-300 group-hover:text-white transition-colors text-xs md:text-sm tracking-tight mb-4">
            {video.title}
          </CardTitle>
          <div className="flex items-center justify-between text-[8px] md:text-[9px] text-zinc-600 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] pt-4 border-t border-zinc-900">
            <div className="flex items-center gap-2">
               <Smartphone className="w-3.5 h-3.5" />
               <span>{video.appViewCount?.toLocaleString() || 0} app views</span>
            </div>
            <span>{mounted ? new Date(video.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}</span>
          </div>
        </CardHeader>
      </Link>
    </Card>
  );
}
