
"use client";

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Filter, Loader2, ArrowLeft, Video as VideoIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function VideosPage() {
  const searchParams = useSearchParams();
  const db = useFirestore();
  
  const speakerId = searchParams.get('speakerId');
  const channelId = searchParams.get('channelId');

  // Fetch contextual info if filtering
  const speakerRef = useMemoFirebase(() => speakerId ? doc(db, 'speakers', speakerId) : null, [db, speakerId]);
  const { data: speaker } = useDoc(speakerRef);

  const channelRef = useMemoFirebase(() => channelId ? doc(db, 'channels', channelId) : null, [db, channelId]);
  const { data: channel } = useDoc(channelRef);

  // Dynamic Video Query
  const videoQuery = useMemoFirebase(() => {
    let q = query(collection(db, 'videos'), orderBy('publishedAt', 'desc'));
    
    if (speakerId) {
      q = query(collection(db, 'videos'), where('speakerIds', 'array-contains', speakerId), orderBy('publishedAt', 'desc'));
    } else if (channelId) {
      q = query(collection(db, 'videos'), where('channelId', '==', channelId), orderBy('publishedAt', 'desc'));
    }
    
    return q;
  }, [db, speakerId, channelId]);

  const { data: videos, isLoading } = useCollection(videoQuery);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-8">
        <div className="space-y-4">
          <Link href="/" className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <VideoIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold">
                {speaker ? `Videos by ${speaker.name}` : channel ? `Videos from ${channel.title}` : 'All Videos'}
              </h1>
              <p className="text-muted-foreground text-sm">
                Explore our curated collection of spiritual and insightful content.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(speakerId || channelId) && (
            <Link href="/videos">
              <Button variant="outline" size="sm" className="rounded-xl font-bold">Clear Filters</Button>
            </Link>
          )}
          <Badge variant="secondary" className="h-10 px-4 rounded-xl font-bold flex gap-2">
            <Filter className="w-3 h-3" />
            {videos?.length || 0} Results
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Loading content library...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos?.map((video) => (
            <Card key={video.id} className="overflow-hidden group cursor-pointer bg-card border-border/50 hover:border-primary transition-all duration-300 shadow-lg hover:shadow-primary/10">
              <Link href={`/watch?v=${video.id}`}>
                <div className="relative aspect-video">
                  <Image 
                    src={video.thumbnailUrl} 
                    alt={video.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all shadow-2xl">
                      <Play className="text-white fill-white ml-1 w-5 h-5" />
                    </div>
                  </div>
                </div>
                <CardHeader className="p-6">
                  <CardTitle className="text-lg font-bold leading-tight line-clamp-2 min-h-[3rem] group-hover:text-primary transition-colors">
                    {video.title}
                  </CardTitle>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-bold uppercase tracking-wider mt-6 pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2">
                       <span>{video.viewCount?.toLocaleString() || 0} views</span>
                    </div>
                    <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                  </div>
                </CardHeader>
              </Link>
            </Card>
          ))}
          {(!videos || videos.length === 0) && (
            <div className="col-span-full py-32 text-center bg-secondary/10 rounded-3xl border-2 border-dashed border-border space-y-4">
              <VideoIcon className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
              <p className="text-muted-foreground font-medium">No videos found matching your criteria.</p>
              <Link href="/videos">
                <Button variant="link" className="text-primary">View all videos</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
