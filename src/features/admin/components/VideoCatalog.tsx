
"use client";

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Video as VideoIcon, 
  Search, 
  Filter, 
  ExternalLink, 
  Trash2, 
  Smartphone,
  Eye,
  Calendar,
  Loader2,
  TrendingUp
} from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function VideoCatalog() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const videosQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    orderBy('publishedAt', 'desc'),
    limit(100)
  ), [db]);

  const { data: videos, isLoading } = useCollection(videosQuery);

  const filteredVideos = videos?.filter(v => 
    v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.channelId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
        <p className="text-zinc-600 font-medium">Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search titles or channels..." 
            className="pl-12 bg-zinc-950 border-zinc-900 text-white rounded-2xl h-14 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl h-14 px-6 border-zinc-900 bg-zinc-950 text-zinc-400 font-bold">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Badge variant="secondary" className="h-14 px-6 rounded-2xl bg-zinc-900 border-zinc-800 text-zinc-300 font-bold flex items-center gap-2">
            {videos?.length || 0} Total Videos
          </Badge>
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2rem] shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-zinc-500 pl-8">Video Content</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Engagement</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Publication</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVideos?.map((video) => (
              <TableRow key={video.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-24">
                <TableCell className="pl-8">
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-14 rounded-lg overflow-hidden border border-zinc-800 bg-black shrink-0">
                      <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-zinc-100 truncate max-w-[300px]">{video.title}</span>
                      <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest truncate">{video.channelId}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Smartphone className="w-3 h-3" />
                      <span className="text-xs font-bold">{video.appViewCount?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <Eye className="w-3 h-3" />
                      <span className="text-[10px] font-medium">{video.youtubeViewCount?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  {video.isTrending ? (
                    <Badge className="bg-amber-500/10 text-amber-500 border-none rounded-lg text-[8px] font-black uppercase flex items-center gap-1 w-fit">
                      <TrendingUp className="w-2 h-2" /> Trending
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-zinc-800 text-zinc-700 rounded-lg text-[8px] font-black uppercase w-fit">Standard</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right pr-8">
                  <div className="flex justify-end gap-2">
                    <a href={video.externalUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-zinc-600 hover:text-white hover:bg-zinc-900">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl h-10 w-10 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteDocumentNonBlocking(doc(db, 'videos', video.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!filteredVideos || filteredVideos.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="h-60 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                     <VideoIcon className="w-12 h-12 text-zinc-900" />
                     <p className="text-zinc-600 font-medium">No videos found in your catalog.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
