
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Video as VideoIcon, 
  Search, 
  ExternalLink, 
  Trash2, 
  Smartphone,
  Eye,
  Loader2,
  TrendingUp,
  Plus,
  FilterX,
  Youtube,
  ChevronLeft,
  ChevronRight
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
import { cn } from '@/lib/utils';

export function VideoCatalog() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChannel, setFilterChannel] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [newVideo, setNewVideo] = useState({
    id: '',
    title: '',
    description: '',
    thumbnailUrl: '',
    channelId: '',
    publishedAt: new Date().toISOString(),
    isTrending: false
  });

  // Fetch Videos
  const videosQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    orderBy('publishedAt', 'desc'),
    limit(1000)
  ), [db]);
  const { data: videos, isLoading: isLoadingVideos } = useCollection(videosQuery);

  // Fetch Channels for Filter
  const channelsQuery = useMemoFirebase(() => query(
    collection(db, 'channels'),
    orderBy('title', 'asc')
  ), [db]);
  const { data: channels } = useCollection(channelsQuery);

  // Derived Filtered List
  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    return videos.filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           v.channelId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesChannel = filterChannel === 'all' || v.channelId === filterChannel;
      return matchesSearch && matchesChannel;
    });
  }, [videos, searchTerm, filterChannel]);

  // Paginated Subset
  const paginatedVideos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVideos.slice(start, start + itemsPerPage);
  }, [filteredVideos, currentPage]);

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);

  // Reset pagination on search/filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterChannel]);

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

  const resetFilters = () => {
    setSearchTerm('');
    setFilterChannel('all');
    setCurrentPage(1);
  };

  if (isLoadingVideos) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
        <p className="text-zinc-600 font-medium">Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex flex-col xl:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-[2.5rem] border border-zinc-900 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto flex-1">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input 
              placeholder="Search titles..." 
              className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14 shadow-inner w-full outline-none focus:ring-1 focus:ring-zinc-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl text-white md:w-64 flex-1">
                <div className="flex items-center gap-2 truncate">
                  <Youtube className="w-4 h-4 text-zinc-600" />
                  <SelectValue placeholder="Filter by Channel" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white max-h-[400px]">
                <SelectItem value="all">All Channels</SelectItem>
                {channels?.map(channel => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={resetFilters} 
              className="h-14 w-14 shrink-0 rounded-2xl border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-white"
              title="Reset Filters"
            >
              <FilterX className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="rounded-full h-14 px-8 font-bold bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-3 shadow-lg group w-full sm:w-auto"
              >
                <Plus className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Catalog Video</span>
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
          <Badge variant="outline" className="h-14 px-6 rounded-2xl bg-zinc-900 border-zinc-800 text-zinc-300 font-bold hidden sm:flex items-center gap-2">
            {filteredVideos.length} Listed
          </Badge>
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-900 hover:bg-transparent">
                <TableHead className="text-[9px] font-black uppercase tracking-[0.1em] py-6 text-zinc-600 pl-6 w-[30%]">Video Details</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600 text-center w-[15%]">Engagement</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600 text-center w-[15%]">Published</TableHead>
                <TableHead className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600 w-[20%]">Status</TableHead>
                <TableHead className="text-right text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600 pr-6 w-[20%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVideos.map((video) => (
                <TableRow key={video.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-24">
                  <TableCell className="pl-6 max-w-0">
                    <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                      <div className="relative w-12 h-8 rounded-md overflow-hidden border border-zinc-800 bg-black shrink-0 shadow-lg">
                        {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />}
                      </div>
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="font-bold text-zinc-100 truncate text-[11px] leading-tight block w-full" title={video.title}>
                          {video.title}
                        </span>
                        <span className="text-[8px] text-zinc-600 truncate uppercase mt-0.5 block w-full">
                          {channels?.find(c => c.id === video.channelId)?.title || video.channelId}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Smartphone className="w-2.5 h-2.5 text-zinc-600" />
                        <span className="text-[9px] font-bold">{video.appViewCount?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-600">
                        <Eye className="w-2.5 h-2.5" />
                        <span className="text-[7px] font-medium">{video.youtubeViewCount?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-zinc-500 text-[9px] font-medium">
                      {new Date(video.publishedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {video.isTrending ? (
                      <Badge className="bg-amber-500/10 text-amber-500 border-none rounded-lg text-[7px] font-black uppercase flex items-center gap-0.5 w-fit px-1.5 py-0">
                        <TrendingUp className="w-2 h-2" /> Featured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-800 text-zinc-700 rounded-lg text-[7px] font-black uppercase w-fit px-1.5 py-0">Standard</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <a href={video.externalUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-zinc-600 hover:text-white hover:bg-zinc-900">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-lg h-8 w-8 text-zinc-600 hover:text-destructive transition-colors"
                        onClick={() => { if(confirm("Permanently remove this video from catalog?")) deleteDocumentNonBlocking(doc(db, 'videos', video.id)); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                       <p className="text-zinc-600 font-medium">No videos found matching your criteria.</p>
                       <Button variant="link" onClick={resetFilters} className="text-white">Clear filters</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-zinc-900/30 border-t border-zinc-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-400">Showing {paginatedVideos.length} of {filteredVideos.length} videos</span>
              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="rounded-xl border-zinc-800 bg-zinc-950 h-10 px-4 font-bold text-zinc-400 hover:text-white transition-all"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  if (pageNum <= 0) return null;
                  if (pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                        currentPage === pageNum 
                          ? "bg-zinc-100 text-black shadow-lg" 
                          : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="rounded-xl border-zinc-800 bg-zinc-950 h-10 px-4 font-bold text-zinc-400 hover:text-white transition-all"
              >
                Next <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
