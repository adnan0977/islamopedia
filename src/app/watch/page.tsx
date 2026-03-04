"use client";

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Calendar, Eye, ThumbsUp, Youtube, Share2, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function WatchPage() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('v');
  const router = useRouter();
  const db = useFirestore();

  const videoRef = useMemoFirebase(() => (videoId ? doc(db, 'videos', videoId) : null), [db, videoId]);
  const { data: video, isLoading } = useDoc(videoRef);

  const channelRef = useMemoFirebase(() => (video?.channelId ? doc(db, 'channels', video.channelId) : null), [db, video?.channelId]);
  const { data: channel } = useDoc(channelRef);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium animate-pulse">Initializing video player...</p>
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
          <h1 className="text-2xl font-bold">Video Not Found</h1>
          <p className="text-muted-foreground max-w-xs">The video you are looking for doesn't exist or has been removed from our catalog.</p>
        </div>
        <Button onClick={() => router.push('/')} variant="secondary" className="rounded-full px-8">
          Go Back Home
        </Button>
      </div>
    );
  }

  const getEmbedId = (video: any) => {
    if (video.id.length === 11) return video.id;
    const url = video.externalUrl || '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : video.id;
  };

  const embedId = getEmbedId(video);
  // Simplified embed URL to avoid domain restriction blocks
  const embedUrl = `https://www.youtube.com/embed/${embedId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 md:px-8 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full gap-2 hover:bg-secondary">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden md:inline font-bold">Back</span>
        </Button>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="hidden sm:flex border-primary/20 text-primary uppercase text-[10px] font-black tracking-widest px-3">
            In-App Player
          </Badge>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 bg-black flex flex-col items-center justify-center relative group">
          <div className="w-full h-full max-h-[80vh] lg:max-h-full relative aspect-video bg-secondary/10 flex items-center justify-center">
            <iframe
              src={embedUrl}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 w-full h-full border-0 shadow-2xl"
            />
          </div>
        </div>

        <div className="w-full lg:w-[400px] border-l border-border bg-card/30 flex flex-col overflow-hidden shrink-0">
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <h1 className="text-xl md:text-2xl font-headline font-bold leading-tight tracking-tight">
                  {video.title}
                </h1>
                
                <div className="flex flex-wrap gap-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <div className="flex items-center gap-2 bg-secondary/40 px-3 py-1.5 rounded-full">
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    {video.viewCount?.toLocaleString() || 0}
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/40 px-3 py-1.5 rounded-full">
                    <ThumbsUp className="w-3.5 h-3.5 text-accent" />
                    {video.likeCount?.toLocaleString() || 0}
                  </div>
                  <div className="flex items-center gap-2 bg-secondary/40 px-3 py-1.5 rounded-full">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {channel && (
                <div className="flex items-center gap-4 p-5 bg-secondary/20 rounded-3xl border border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer group">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-border group-hover:border-primary transition-all shadow-md">
                    <Image src={channel.thumbnailUrl} alt={channel.title} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-lg">{channel.title}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-2">
                      <Youtube className="w-3 h-3 text-red-500" />
                      {(channel.subscribersCount / 1000).toFixed(1)}K Subscribers
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Info className="w-4 h-4" />
                  <p className="text-[10px] uppercase font-black tracking-widest">About this video</p>
                </div>
                <div className="bg-secondary/10 p-5 rounded-3xl border border-border/30">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap italic">
                    {video.description || 'No detailed description available for this content.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="h-20 lg:hidden" />
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}