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
  MoreHorizontal,
  CheckCircle2,
  Smartphone,
  Play,
  Calendar,
  MessageSquare
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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

  // Suggestions pool
  const allVideosQuery = useMemoFirebase(() => query(collection(db, 'videos'), limit(40)), [db]);
  const { data: allVideos } = useCollection(allVideosQuery);

  useEffect(() => {
    if (videoId && videoRef) {
      updateDocumentNonBlocking(videoRef, { appViewCount: increment(1) });
    }
  }, [videoId, videoRef]);

  const suggestedVideos = useMemo(() => {
    if (!video || !allVideos) return [];
    return allVideos
      .filter(v => v.id !== video.id)
      .sort((a, b) => {
        const aHasSpeaker = a.speakerIds?.some((id: string) => video.speakerIds?.includes(id));
        const bHasSpeaker = b.speakerIds?.some((id: string) => video.speakerIds?.includes(id));
        if (aHasSpeaker && !bHasSpeaker) return -1;
        if (!aHasSpeaker && bHasSpeaker) return 1;
        if (a.channelId === video.channelId) return -1;
        return 0;
      })
      .slice(0, 12);
  }, [video, allVideos]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-bold uppercase tracking-widest animate-pulse">Loading Theatre...</p>
      </div>
    );
  }

  if (!videoId || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 text-center px-4">
        <div className="bg-muted p-8 rounded-full"><Youtube className="h-16 w-12 text-muted-foreground" /></div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Content Offline</h1>
          <p className="text-muted-foreground max-w-sm">This spiritual reflection is either private or has been archived from the library.</p>
        </div>
        <Button onClick={() => router.push('/')} variant="default" size="lg" className="rounded-full px-10">Back to Library</Button>
      </div>
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&modestbranding=1&rel=0`;

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-12">
      <main className="container mx-auto max-w-[1600px] flex flex-col lg:grid lg:grid-cols-12 gap-8 p-4 md:p-8">
        
        {/* Main Content Area: Columns 1-8 */}
        <div className="lg:col-span-8 space-y-6">
          {/* Player Container */}
          <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] bg-black shadow-2xl ring-1 ring-white/5">
            <iframe
              src={embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>

          {/* Video Metadata Header */}
          <div className="space-y-6">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">{video.title}</h1>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {channel && (
                  <Link href={`/videos?channelId=${channel.id}`} className="group flex items-center gap-4">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-muted group-hover:ring-primary transition-all">
                      <Image src={channel.thumbnailUrl || 'https://picsum.photos/seed/ch/200'} alt={channel.title} fill className="object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-lg">{channel.title}</span>
                        <CheckCircle2 className="h-4 w-4 fill-primary text-primary-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{channel.subscribersCount?.toLocaleString()} Followers</p>
                    </div>
                  </Link>
                )}
                <Button className="rounded-full px-8 h-11 font-bold">Subscribe</Button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                <div className="flex h-11 items-center rounded-full bg-muted/50 px-1 border border-muted ring-offset-background">
                  <div className="flex items-center gap-2 px-4 border-r">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">{video.appViewCount?.toLocaleString()}</span>
                  </div>
                  <button className="flex items-center gap-2 px-4 hover:bg-muted transition-colors h-full rounded-r-full">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-sm font-bold">{video.likeCount?.toLocaleString()}</span>
                  </button>
                </div>
                <Button variant="outline" className="rounded-full h-11 gap-2 font-bold px-6">
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 border">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Description Box */}
            <div className={cn(
              "rounded-[2rem] bg-muted/30 p-6 transition-all border border-muted shadow-inner",
              !isDescriptionExpanded ? "max-h-32 overflow-hidden" : "h-auto"
            )}>
              <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(video.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div className="flex items-center gap-1.5"><Smartphone className="h-3 w-3" /> {video.appViewCount?.toLocaleString()} App Views</div>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/80 font-medium">
                {video.description || 'No additional narrative content provided for this reflection.'}
              </p>
              {!isDescriptionExpanded && (
                <button onClick={() => setIsDescriptionExpanded(true)} className="mt-4 text-xs font-black uppercase tracking-widest text-primary hover:underline">Show More</button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Recommendations (Columns 9-12) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">
              <Play className="h-4 w-4 text-primary fill-primary" />
              Up Next
            </h2>
            <Badge variant="secondary" className="rounded-full px-3">{suggestedVideos.length}</Badge>
          </div>

          <div className="space-y-4">
            {suggestedVideos.map((sVideo) => (
              <Link key={sVideo.id} href={`/watch?v=${sVideo.id}`} className="group flex gap-4 transition-all">
                <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-muted">
                  <Image src={sVideo.thumbnailUrl} alt={sVideo.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[10px] text-white font-mono">14:20</div>
                </div>
                <div className="flex flex-col justify-between py-0.5">
                  <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors tracking-tight">
                    {sVideo.title}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate max-w-[150px]">
                      {sVideo.channelId}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 font-medium">
                      <span>{sVideo.appViewCount?.toLocaleString()} views</span>
                      <span>•</span>
                      <span>{new Date(sVideo.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}