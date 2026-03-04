
"use client";

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Loader2, 
  Calendar, 
  Eye, 
  ThumbsUp, 
  Youtube, 
  Share2, 
  Info, 
  ThumbsDown, 
  MoreHorizontal,
  Bell,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { suggestVideos } from '@/ai/flows/suggest-videos-flow';
import { cn } from '@/lib/utils';

export default function WatchPage() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('v');
  const router = useRouter();
  const db = useFirestore();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [suggestedVideos, setSuggestedVideos] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Current Video Data
  const videoRef = useMemoFirebase(() => (videoId ? doc(db, 'videos', videoId) : null), [db, videoId]);
  const { data: video, isLoading } = useDoc(videoRef);

  // Channel Data
  const channelRef = useMemoFirebase(() => (video?.channelId ? doc(db, 'channels', video.channelId) : null), [db, video?.channelId]);
  const { data: channel } = useDoc(channelRef);

  // All videos for suggestions pool
  const allVideosQuery = useMemoFirebase(() => query(collection(db, 'videos'), limit(20)), [db]);
  const { data: allVideos } = useCollection(allVideosQuery);

  // Handle AI Suggestions
  useEffect(() => {
    async function getAISuggestions() {
      if (!video || !allVideos || allVideos.length < 2) return;
      setIsSuggesting(true);
      try {
        const pool = allVideos.filter(v => v.id !== video.id);
        const result = await suggestVideos({
          currentVideo: {
            id: video.id,
            title: video.title,
            speakerIds: video.speakerIds,
            tags: video.tags
          },
          availableVideos: pool.map(v => ({
            id: v.id,
            title: v.title,
            speakerIds: v.speakerIds,
            tags: v.tags
          }))
        });
        const finalSuggestions = pool.filter(v => result.suggestedVideoIds.includes(v.id));
        setSuggestedVideos(finalSuggestions.length > 0 ? finalSuggestions : pool.slice(0, 8));
      } catch (error) {
        console.error("Suggestion error:", error);
        setSuggestedVideos(allVideos.filter(v => v.id !== video.id).slice(0, 8));
      } finally {
        setIsSuggesting(false);
      }
    }
    getAISuggestions();
  }, [video, allVideos]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading theater...</p>
      </div>
    );
  }

  if (!videoId || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-6 text-center px-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <Youtube className="w-10 h-10 text-destructive" />
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

  const embedId = video.id;
  // Use youtube-nocookie and standard parameters for maximum compatibility
  const embedUrl = `https://www.youtube-nocookie.com/embed/${embedId}?autoplay=1&rel=0&modestbranding=1&showinfo=0`;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1700px] mx-auto flex flex-col lg:flex-row gap-6 p-0 md:p-6 lg:pt-4">
        
        {/* Left Column: Player & Details */}
        <div className="flex-1 space-y-4">
          {/* Player Section */}
          <div className="bg-black w-full aspect-video md:rounded-2xl overflow-hidden shadow-2xl relative group">
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
            <h1 className="text-lg md:text-xl font-bold leading-tight line-clamp-2">
              {video.title}
            </h1>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {channel && (
                  <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border">
                      <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />
                    </div>
                    <div className="flex flex-col pr-4">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm">{channel.title}</span>
                        <CheckCircle2 className="w-3 h-3 text-muted-foreground fill-muted-foreground" />
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {(channel.subscribersCount / 1000).toFixed(1)}K subscribers
                      </span>
                    </div>
                  </div>
                )}
                <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full font-bold text-xs h-9 px-4">
                  Subscribe
                </Button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <div className="flex items-center bg-secondary rounded-full h-9">
                  <button className="flex items-center gap-2 px-4 hover:bg-secondary-foreground/10 transition-colors border-r border-border/50 h-full rounded-l-full">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-xs font-bold">{video.likeCount?.toLocaleString() || 0}</span>
                  </button>
                  <button className="px-4 hover:bg-secondary-foreground/10 transition-colors h-full rounded-r-full">
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
                <Button variant="secondary" className="rounded-full h-9 gap-2 font-bold text-xs">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button variant="secondary" className="rounded-full h-9 font-bold text-xs px-3">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Description Section */}
            <div 
              className={cn(
                "bg-secondary/40 rounded-xl p-3 text-sm transition-all cursor-pointer hover:bg-secondary/60",
                !isDescriptionExpanded ? "max-h-24 overflow-hidden" : "h-auto"
              )}
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                <span>{video.viewCount?.toLocaleString() || 0} views</span>
                <span>•</span>
                <span>{new Date(video.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {video.description || 'No description provided.'}
              </p>
              {!isDescriptionExpanded && (
                <button className="text-xs font-bold mt-2 text-foreground">...more</button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Up Next / Suggestions */}
        <div className="w-full lg:w-[400px] shrink-0 space-y-4 px-4 md:px-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Up Next
            </h2>
          </div>

          <div className="space-y-3">
            {isSuggesting ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-2 animate-pulse">
                    <div className="w-40 aspect-video bg-secondary rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-secondary rounded w-full" />
                      <div className="h-3 bg-secondary rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              suggestedVideos.map((sVideo) => (
                <Link 
                  key={sVideo.id} 
                  href={`/watch?v=${sVideo.id}`}
                  className="flex gap-3 group cursor-pointer"
                >
                  <div className="relative w-40 aspect-video rounded-lg overflow-hidden shrink-0">
                    <Image src={sVideo.thumbnailUrl} alt={sVideo.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0 py-0.5">
                    <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {sVideo.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">
                      {sVideo.channelId} {/* Ideally channel name, but ID is fallback */}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {sVideo.viewCount?.toLocaleString()} views • {new Date(sVideo.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
