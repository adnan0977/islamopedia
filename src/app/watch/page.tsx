
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, limit, increment } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  ThumbsUp, 
  Youtube, 
  Share2, 
  ThumbsDown, 
  MoreHorizontal,
  CheckCircle2,
  Sparkles,
  Smartphone
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function WatchPage() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('v');
  const router = useRouter();
  const db = useFirestore();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Current Video Data
  const videoRef = useMemoFirebase(() => (videoId ? doc(db, 'videos', videoId) : null), [db, videoId]);
  const { data: video, isLoading } = useDoc(videoRef);

  // Channel Data
  const channelRef = useMemoFirebase(() => (video?.channelId ? doc(db, 'channels', video.channelId) : null), [db, video?.channelId]);
  const { data: channel } = useDoc(channelRef);

  // Smart suggestions pool (speaker/tag matching)
  const allVideosQuery = useMemoFirebase(() => query(collection(db, 'videos'), limit(40)), [db]);
  const { data: allVideos } = useCollection(allVideosQuery);

  // Increment internal app view count on mount
  useEffect(() => {
    if (videoId && videoRef) {
      updateDocumentNonBlocking(videoRef, {
        appViewCount: increment(1)
      });
    }
  }, [videoId, videoRef]);

  const suggestedVideos = useMemo(() => {
    if (!video || !allVideos) return [];
    
    return allVideos
      .filter(v => v.id !== video.id)
      .sort((a, b) => {
        // Boost score if same speaker
        const aHasSpeaker = a.speakerIds?.some((id: string) => video.speakerIds?.includes(id));
        const bHasSpeaker = b.speakerIds?.some((id: string) => video.speakerIds?.includes(id));
        if (aHasSpeaker && !bHasSpeaker) return -1;
        if (!aHasSpeaker && bHasSpeaker) return 1;
        
        // Boost score if same channel
        if (a.channelId === video.channelId) return -1;
        if (b.channelId === video.channelId) return 1;

        return 0;
      })
      .slice(0, 10);
  }, [video, allVideos]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading theatre...</p>
      </div>
    );
  }

  if (!videoId || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
        <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
          <Youtube className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Video Unavailable</h1>
          <p className="text-muted-foreground max-w-xs">This content is either private or has been removed.</p>
        </div>
        <Button onClick={() => router.push('/')} variant="secondary" className="rounded-full px-8">
          Go Back Home
        </Button>
      </div>
    );
  }

  // Use nocookie domain for better compatibility with domain restrictions
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&modestbranding=1&rel=0`;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1700px] mx-auto flex flex-col lg:flex-row gap-6 p-0 md:p-6 lg:pt-4 pb-24 md:pb-6">
        
        {/* Left Column: Player & Details */}
        <div className="flex-1 space-y-4">
          {/* Player Section */}
          <div className="bg-black w-full aspect-video md:rounded-2xl overflow-hidden shadow-2xl relative">
            <iframe
              src={embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>

          {/* Video Info Section */}
          <div className="px-4 md:px-0 space-y-4">
            <h1 className="text-lg md:text-xl font-bold leading-tight">
              {video.title}
            </h1>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {channel && (
                  <div className="flex items-center gap-3 group">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border">
                      {channel.thumbnailUrl ? (
                        <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Youtube className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col pr-4">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm">{channel.title}</span>
                        <CheckCircle2 className="w-3 h-3 text-muted-foreground fill-muted-foreground" />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {channel.subscribersCount ? (channel.subscribersCount / 1000).toFixed(1) + 'K subscribers' : '0 subscribers'}
                      </span>
                    </div>
                  </div>
                )}
                <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full font-bold text-xs h-9 px-6 transition-transform active:scale-95">
                  Subscribe
                </Button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <div className="flex items-center bg-secondary/50 rounded-full h-9 border border-border/50">
                  <div className="flex items-center gap-2 px-4 h-full border-r border-border/50 rounded-l-full">
                    <Smartphone className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs font-bold">{video.appViewCount?.toLocaleString() || 0}</span>
                  </div>
                  <button className="flex items-center gap-2 px-4 hover:bg-white/10 transition-colors h-full rounded-r-full">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-xs font-bold">{video.likeCount?.toLocaleString() || 0}</span>
                  </button>
                </div>
                <Button variant="secondary" className="rounded-full h-9 gap-2 font-bold text-xs bg-secondary/50 border border-border/50">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button variant="secondary" className="rounded-full h-9 font-bold text-xs px-3 bg-secondary/50 border border-border/50">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Description Section */}
            <div 
              className={cn(
                "bg-secondary/20 rounded-2xl p-4 text-sm transition-all cursor-pointer hover:bg-secondary/30 border border-border/30",
                !isDescriptionExpanded ? "max-h-24 overflow-hidden" : "h-auto"
              )}
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            >
              <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {video.appViewCount?.toLocaleString() || 0} app views</span>
                <span>•</span>
                <span>{new Date(video.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 font-medium">
                {video.description || 'No description provided.'}
              </p>
              {!isDescriptionExpanded && (
                <button className="text-xs font-bold mt-3 text-primary uppercase tracking-widest">Show More</button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Up Next */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-4 px-4 md:px-0">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              Up Next
            </h2>
          </div>

          <div className="space-y-4">
            {suggestedVideos.map((sVideo) => (
              <Link 
                key={sVideo.id} 
                href={`/watch?v=${sVideo.id}`}
                className="flex gap-3 group cursor-pointer"
              >
                <div className="relative w-40 aspect-video rounded-xl overflow-hidden shrink-0 bg-secondary/30 border border-border/50">
                  <Image src={sVideo.thumbnailUrl} alt={sVideo.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex flex-col min-w-0 py-0.5">
                  <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {sVideo.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider truncate">
                    {allVideos?.find(v => v.id === sVideo.id)?.channelId || 'Channel'}
                  </p>
                  <p className="text-[10px] text-muted-foreground opacity-70 flex items-center gap-1">
                    <Smartphone className="w-2.5 h-2.5" /> {sVideo.appViewCount?.toLocaleString()} views
                  </p>
                </div>
              </Link>
            ))}
            {suggestedVideos.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-2xl">No related videos found.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
