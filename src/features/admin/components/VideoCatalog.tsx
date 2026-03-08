
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
  Trash2, 
  Smartphone,
  Eye,
  Loader2,
  TrendingUp,
  Plus,
  FilterX,
  Youtube,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Power,
  PowerOff,
  Save
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function VideoCatalog() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChannel, setFilterChannel] = useState('all');
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [videoFormData, setVideoFormData] = useState({
    id: '',
    title: '',
    description: '',
    thumbnailUrl: '',
    channelId: '',
    publishedAt: new Date().toISOString(),
    isTrending: false,
    isActive: true
  });

  const videosQuery = useMemoFirebase(() => query(
    collection(db, 'videos'),
    orderBy('publishedAt', 'desc'),
    limit(1000)
  ), [db]);
  const { data: videos, isLoading: isLoadingVideos } = useCollection(videosQuery);

  const channelsQuery = useMemoFirebase(() => query(
    collection(db, 'channels'),
    orderBy('title', 'asc')
  ), [db]);
  const { data: channels } = useCollection(channelsQuery);

  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    return videos.filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           v.channelId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesChannel = filterChannel === 'all' || v.channelId === filterChannel;
      return matchesSearch && matchesChannel;
    });
  }, [videos, searchTerm, filterChannel]);

  const paginatedVideos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVideos.slice(start, start + itemsPerPage);
  }, [filteredVideos, currentPage]);

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterChannel]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setVideoFormData({
      id: '', title: '', description: '', thumbnailUrl: '', channelId: '',
      publishedAt: new Date().toISOString(), isTrending: false, isActive: true
    });
    setIsVideoDialogOpen(true);
  };

  const handleOpenEdit = (video: any) => {
    setIsEditing(true);
    setVideoFormData({
      id: video.id, title: video.title || '', description: video.description || '',
      thumbnailUrl: video.thumbnailUrl || '', channelId: video.channelId || '',
      publishedAt: video.publishedAt || new Date().toISOString(),
      isTrending: !!video.isTrending, isActive: video.isActive !== false
    });
    setIsVideoDialogOpen(true);
  };

  const handleSaveVideo = () => {
    const videoRef = doc(db, 'videos', videoFormData.id);
    setDocumentNonBlocking(videoRef, {
      ...videoFormData,
      externalUrl: `https://youtube.com/watch?v=${videoFormData.id}`,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    toast({ title: "Updated Successfully" });
    setIsVideoDialogOpen(false);
  };

  const toggleVideoStatus = (video: any) => {
    const newStatus = !video.isActive;
    updateDocumentNonBlocking(doc(db, 'videos', video.id), { isActive: newStatus });
    toast({ title: newStatus ? "Enabled" : "Disabled" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex flex-col xl:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto flex-1">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input 
              placeholder="Search library..." 
              className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Button 
          variant="outline"
          onClick={handleOpenAdd}
          className="rounded-full h-14 px-8 font-bold border-white text-white hover:bg-white hover:text-black transition-all active:scale-95 flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span>Catalog Video</span>
        </Button>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="text-[9px] font-black uppercase py-6 text-zinc-600 pl-6 w-[30%]">Video</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-600 text-center w-[15%]">Views</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-600 text-center w-[15%]">Status</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-600 text-center w-[15%]">Date</TableHead>
              <TableHead className="text-right text-[9px] font-black uppercase text-zinc-600 pr-6 w-[25%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingVideos ? (
              <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></TableCell></TableRow>
            ) : paginatedVideos.map((video) => (
              <TableRow key={video.id} className="hover:bg-zinc-900/40 border-zinc-900 h-24">
                <TableCell className="pl-6 max-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-8 rounded-md overflow-hidden border border-zinc-800 bg-black shrink-0">
                      {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />}
                    </div>
                    <span className="font-bold text-zinc-100 truncate text-[11px] block">{video.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center text-[10px] font-bold text-zinc-400">
                  {video.appViewCount?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex flex-col items-center gap-1">
                    <Badge className={cn("border-none text-[7px] font-black px-1.5 py-0", video.isActive !== false ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                      {video.isActive !== false ? 'ACTIVE' : 'OFF'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-center text-[9px] text-zinc-500 font-medium">
                  {new Date(video.publishedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(video)} className="h-8 w-8 text-zinc-600 hover:text-white"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleVideoStatus(video)} className="h-8 w-8 text-zinc-600">
                      {video.isActive !== false ? <Power className="w-3.5 h-3.5 text-emerald-500" /> : <PowerOff className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(video.id)} className="h-8 w-8 text-zinc-600 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-0 outline-none overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
            <DialogTitle className="text-xl font-bold">Video Editor</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid gap-2">
              <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Title</Label>
              <Input className="bg-zinc-900 border-zinc-800 h-12 rounded-xl" value={videoFormData.title} onChange={(e) => setVideoFormData({ ...videoFormData, title: e.target.value })} />
            </div>
            <Button 
              variant="outline"
              className="w-full h-14 font-bold rounded-2xl border-white text-white hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 mt-4" 
              onClick={handleSaveVideo}
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
