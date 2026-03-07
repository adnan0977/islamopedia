
'use client';

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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Video as VideoIcon, 
  Search, 
  ExternalLink, 
  Trash2, 
  Smartphone,
  Eye,
  Calendar,
  Loader2,
  TrendingUp,
  Plus
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

export function VideoCatalog() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVideo, setNewVideo] = useState({
    id: '',
    title: '',
    description: '',
    thumbnailUrl: '',
    channelId: '',
    publishedAt: new Date().toISOString(),
    isTrending: false
  });

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

  const handleAddVideo = () => {
    if (!newVideo.id || !newVideo.title) {
      toast({ variant: "destructive", title: "Error", description: "YouTube ID and Title are required." });
      return;
    }

    const videoRef = doc(db, 'videos', newVideo.id);
    setDocumentNonBlocking(videoRef, {
      ...newVideo,
      externalUrl: `https://youtube.com/watch?v=${newVideo.id}`,
      appViewCount: 0,
      youtubeViewCount: 0,
      likeCount: 0,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isActive: true
    }, { merge: true });

    toast({ title: "Video Cataloged", description: `${newVideo.title} has been added.` });
    setIsAddDialogOpen(false);
    setNewVideo({
      id: '',
      title: '',
      description: '',
      thumbnailUrl: '',
      channelId: '',
      publishedAt: new Date().toISOString(),
      isTrending: false
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
        <p className="text-zinc-600 font-medium">Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search titles or channels..." 
            className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14 shadow-inner w-full outline-none focus:ring-1 focus:ring-zinc-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="rounded-full h-14 px-8 font-bold bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95 flex items-center gap-3 shadow-lg group"
              >
                <Plus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Add New Video</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-0 outline-none max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <DialogHeader className="p-10 border-b border-zinc-900 bg-zinc-900/40">
                <DialogTitle className="text-2xl font-bold">Catalog New Video</DialogTitle>
                <DialogDescription className="text-zinc-500 text-sm mt-2">Manually index spiritual content into your platform library.</DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-[0.2em]">YouTube Video ID</Label>
                    <Input 
                      placeholder="e.g. dQw4w9WgXcQ" 
                      className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl text-white px-6 focus:ring-zinc-700"
                      value={newVideo.id}
                      onChange={(e) => setNewVideo({ ...newVideo, id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-[0.2em]">Channel ID</Label>
                    <Input 
                      placeholder="UC..." 
                      className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl text-white px-6 focus:ring-zinc-700"
                      value={newVideo.channelId}
                      onChange={(e) => setNewVideo({ ...newVideo, channelId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-[0.2em]">Video Title</Label>
                  <Input 
                    placeholder="Enter descriptive title" 
                    className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl text-white px-6 focus:ring-zinc-700"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-[0.2em]">Thumbnail URL</Label>
                  <Input 
                    placeholder="https://i.ytimg.com/vi/..." 
                    className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl text-white px-6 focus:ring-zinc-700"
                    value={newVideo.thumbnailUrl}
                    onChange={(e) => setNewVideo({ ...newVideo, thumbnailUrl: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-[0.2em]">Description</Label>
                  <Textarea 
                    placeholder="Provide a detailed summary of the reflection..." 
                    className="bg-zinc-900 border-zinc-800 rounded-[1.5rem] min-h-[150px] text-white p-6 focus:ring-zinc-700 resize-none"
                    value={newVideo.description}
                    onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800">
                  <div className="space-y-1">
                    <Label className="font-bold text-zinc-100 text-sm">Featured / Trending</Label>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Promote this video in discovery sections</p>
                  </div>
                  <Switch 
                    checked={newVideo.isTrending}
                    onCheckedChange={(val) => setNewVideo({ ...newVideo, isTrending: val })}
                  />
                </div>
              </div>

              <div className="p-10 border-t border-zinc-900 bg-zinc-950">
                <Button 
                  className="w-full h-14 font-bold rounded-2xl text-base bg-zinc-100 text-black hover:bg-white shadow-xl transition-all active:scale-[0.98]" 
                  onClick={handleAddVideo}
                >
                  Index Video Metadata
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="h-14 px-6 rounded-2xl bg-zinc-900 border-zinc-800 text-zinc-300 font-bold flex items-center gap-2">
            {videos?.length || 0} Cataloged
          </Badge>
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900 hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] py-6 text-zinc-600 pl-10">Video Details</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 text-center">Engagement</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 text-center">Publication</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 pr-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVideos?.map((video) => (
              <TableRow key={video.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-24">
                <TableCell className="pl-10">
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-14 rounded-xl overflow-hidden border border-zinc-800 bg-black shrink-0 shadow-lg">
                      {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-zinc-100 truncate max-w-[300px] text-sm">{video.title}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Smartphone className="w-3 h-3 text-zinc-600" />
                      <span className="text-xs font-bold">{video.appViewCount?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <Eye className="w-3 h-3" />
                      <span className="text-[9px] font-medium">{video.youtubeViewCount?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs font-medium">
                    <Calendar className="w-3 h-3 text-zinc-700" />
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  {video.isTrending ? (
                    <Badge className="bg-amber-500/10 text-amber-500 border-none rounded-lg text-[8px] font-black uppercase flex items-center gap-1 w-fit">
                      <TrendingUp className="w-2.5 h-2.5" /> Featured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-zinc-800 text-zinc-700 rounded-lg text-[8px] font-black uppercase w-fit">Standard</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right pr-10">
                  <div className="flex justify-end gap-1">
                    <a href={video.externalUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 text-zinc-600 hover:text-white hover:bg-zinc-900">
                        <ExternalLink className="w-5 h-5" />
                      </Button>
                    </a>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-2xl h-12 w-12 text-zinc-600 hover:text-destructive transition-colors"
                      onClick={() => { if(confirm("Permanently remove this video from catalog?")) deleteDocumentNonBlocking(doc(db, 'videos', video.id)); }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!filteredVideos || filteredVideos.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
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
