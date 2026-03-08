
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Trash2, 
  Smartphone,
  Eye,
  Loader2,
  TrendingUp,
  Plus,
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
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
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

  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    return videos.filter(v => 
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.channelId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [videos, searchTerm]);

  const paginatedVideos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVideos.slice(start, start + itemsPerPage);
  }, [filteredVideos, currentPage]);

  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenEdit = (video: any) => {
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
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    toast({ title: "Video Updated" });
    setIsVideoDialogOpen(false);
  };

  const toggleVideoStatus = (video: any) => {
    updateDocumentNonBlocking(doc(db, 'videos', video.id), { isActive: !video.isActive });
    toast({ title: !video.isActive ? "Video Enabled" : "Video Disabled" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search library..." 
            className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          variant="outline"
          className="rounded-full h-14 px-8 font-bold border-white text-white hover:bg-white hover:text-black transition-all shadow-lg flex items-center gap-2"
          onClick={() => {
            setVideoFormData({ id: '', title: '', description: '', thumbnailUrl: '', channelId: '', publishedAt: new Date().toISOString(), isTrending: false, isActive: true });
            setIsVideoDialogOpen(true);
          }}
        >
          <Plus className="w-5 h-5" />
          <span>Catalog Video</span>
        </Button>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="text-[9px] font-black uppercase py-6 text-zinc-600 pl-8 w-[35%]">Metadata</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-600 text-center w-[20%]">Status</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-600 text-center w-[20%]">Engagement</TableHead>
              <TableHead className="text-right text-[9px] font-black uppercase text-zinc-600 pr-8 w-[25%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingVideos ? (
              <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-zinc-800" /></TableCell></TableRow>
            ) : paginatedVideos.map((video) => (
              <TableRow key={video.id} className="hover:bg-zinc-900/40 border-zinc-900 h-24 transition-colors">
                <TableCell className="pl-8 max-w-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative w-12 h-8 rounded-lg overflow-hidden border border-zinc-800 bg-black shrink-0">
                      {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-zinc-100 truncate text-[11px] block">{video.title}</span>
                      <span className="text-[8px] text-zinc-600 truncate mt-0.5">{video.channelId}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex flex-col items-center gap-1.5">
                    <Badge className={cn("border-none text-[7px] font-black px-1.5 py-0", video.isActive !== false ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                      {video.isActive !== false ? 'ACTIVE' : 'OFF'}
                    </Badge>
                    {video.isTrending && <Badge className="bg-amber-500/10 text-amber-500 border-none text-[6px] font-black px-1 py-0 uppercase">Trending</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                      <Smartphone className="w-3 h-3" />
                      {video.appViewCount?.toLocaleString() || 0}
                    </div>
                    <span className="text-[8px] text-zinc-600 uppercase font-black tracking-tight">{new Date(video.publishedAt).toLocaleDateString()}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-8">
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
        
        {totalPages > 1 && (
          <div className="bg-zinc-900/30 border-t border-zinc-900 p-6 flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl border-white text-white font-bold h-10 px-6 hover:bg-white hover:text-black transition-all" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4 mr-2" /> Prev</Button>
              <Button variant="outline" className="rounded-xl border-white text-white font-bold h-10 px-6 hover:bg-white hover:text-black transition-all" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* Optimized Video Editor Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-0 outline-none overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40 shrink-0">
            <DialogTitle className="text-xl font-bold">Update Video Metadata</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-1">Refine visibility and content categorization.</DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            <div className="grid gap-2">
              <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Video Title</Label>
              <Input className="bg-zinc-900 border-zinc-800 h-12 rounded-xl text-white" value={videoFormData.title} onChange={(e) => setVideoFormData({ ...videoFormData, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Description</Label>
              <Textarea className="bg-zinc-900 border-zinc-800 min-h-[120px] rounded-xl text-xs text-zinc-300" value={videoFormData.description} onChange={(e) => setVideoFormData({ ...videoFormData, description: e.target.value })} />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-900">
                <span className="text-xs font-bold text-zinc-400">Featured</span>
                <Switch checked={videoFormData.isTrending} onCheckedChange={(val) => setVideoFormData({ ...videoFormData, isTrending: val })} />
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-900">
                <span className="text-xs font-bold text-zinc-400">Published</span>
                <Switch checked={videoFormData.isActive} onCheckedChange={(val) => setVideoFormData({ ...videoFormData, isActive: val })} />
              </div>
            </div>
          </div>

          <div className="p-8 bg-zinc-900/20 border-t border-zinc-900 shrink-0 flex justify-end">
            <Button 
              variant="outline"
              className="rounded-xl border-white text-white hover:bg-white hover:text-black font-bold h-12 px-10 transition-all flex items-center gap-2" 
              onClick={handleSaveVideo}
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-10 max-w-md">
          <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold">Remove Content?</AlertDialogTitle><AlertDialogDescription className="text-zinc-500">This action permanently deletes the video record from the local feed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteDocumentNonBlocking(doc(db, 'videos', deleteConfirmId!)); setDeleteConfirmId(null); toast({ title: "Deleted" }); }} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
