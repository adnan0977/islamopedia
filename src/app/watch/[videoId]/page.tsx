
"use client";

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Calendar, Eye, ThumbsUp, Youtube } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function WatchPage() {
  const { videoId } = useParams();
  const router = useRouter();
  const db = useFirestore();

  const videoRef = useMemoFirebase(() => (videoId ? doc(db, 'videos', videoId as string) : null), [db, videoId]);
  const { data: video, isLoading } = useDoc(videoRef);

  const channelRef = useMemoFirebase(() => (video?.channelId ? doc(db, 'channels', video.channelId) : null), [db, video?.channelId]);
  const { data: channel } = useDoc(channelRef);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading video player...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-6 text-center px-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
          <Youtube className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Video Not Found</h1>
          <p className="text-muted-foreground">The video you are looking for doesn't exist or has been removed.</p>
        </div>
        <Button onClick={() => router.push('/')} variant="secondary">
          Go Back Home
        </Button>
      </div>
    );
  }

  // Extract YouTube ID reliably from externalUrl if it wasn't just the ID
  const getEmbedId = (video: any) => {
    if (video.id.length === 11) return video.id; // Usually video ID is 11 chars
    const url = video.externalUrl || '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : video.id;
  };

  const embedId = getEmbedId(video);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center px-4 md:px-8 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline">Back</span>
        </Button>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Player Section */}
        <div className="flex-1 bg-black flex flex-col items-center justify-center relative group">
          <div className="w-full h-full max-h-[80vh] md:max-h-full relative aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${embedId}?autoplay=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
        </div>

        {/* Sidebar Info Section */}
        <div className="w-full md:w-[400px] border-l border-border bg-card/30 flex flex-col overflow-hidden shrink-0">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h1 className="text-xl md:text-2xl font-headline font-bold leading-tight">
                  {video.title}
                </h1>
                
                <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-primary" />
                    {video.viewCount?.toLocaleString() || 0} Views
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="w-4 h-4 text-accent" />
                    {video.likeCount?.toLocaleString() || 0} Likes
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {channel && (
                <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-2xl border border-border/50">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border">
                    <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{channel.title}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {(channel.subscribersCount / 1000).toFixed(1)}K Subscribers
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Description</p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {video.description || 'No description available for this video.'}
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}
