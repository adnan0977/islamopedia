'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { 
  Card, 
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
  Trash2, 
  Smartphone,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Power,
  PowerOff,
  Save,
  Youtube
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

  const paginatedVideos = useMemo(() => {
    if (!videos) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return videos.slice(start, start + itemsPerPage);
  }, [videos, currentPage]);

  const totalPages = Math.ceil((videos?.length || 0) / itemsPerPage);

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
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] border border-zinc-200 shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100 shadow-inner">
              <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400" />
            </div>
            <h2 className="text-xl sm:text-3xl font-headline font-bold text-zinc-900 tracking-tight">Content Inventory</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium">Categorize and moderate cataloged spiritual reflections.</p>
        </div>
        <Button 
          className="rounded-xl sm:rounded-2xl h-12 sm:h-14 px-6 sm:px-10 font-bold bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl flex items-center gap-3 transition-all active:scale-95 w-full sm:w-auto"
          onClick={() => {
            setVideoFormData({ id: '', title: '', description: '', thumbnailUrl: '', channelId: '', publishedAt: new Date().toISOString(), isTrending: false, isActive: true });
            setIsVideoDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-xs sm:text-sm uppercase tracking-widest">Catalog New Feed</span>
        </Button>
      </div>

      <Card className="bg-white border-zinc-200 overflow-hidden rounded-2xl sm:rounded-[3rem] shadow-sm">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed min-w-[800px] sm:min-w-full">
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="border-zinc-100 h-20 sm:h-24">
                <TableHead className="text-[10px] font-black uppercase py-6 sm:py-8 text-zinc-400 pl-6 sm:pl-12 w-[40%] tracking-[0.2em]">Metadata Feed</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-zinc-400 text-center w-[15%] tracking-[0.2em]">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-zinc-400 text-center w-[20%] tracking-[0.2em]">Engagement</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase text-zinc-400 pr-6 sm:pr-12 w-[25%] tracking-[0.2em]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingVideos ? (
                <TableRow><TableCell colSpan={4} className="h-96 text-center"><div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin h-10 w-10 text-zinc-100" /><p className="text-[10px] font-black uppercase text-zinc-300 tracking-[0.2em]">Hydrating inventory...</p></div></TableCell></TableRow>
              ) : paginatedVideos.map((video) => (
                <TableRow key={video.id} className="hover:bg-zinc-50/50 border-zinc-100 h-24 sm:h-28 transition-colors">
                  <TableCell className="pl-6 sm:pl-12 max-w-0">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                      <div className="relative w-12 h-8 sm:w-16 sm:h-10 rounded-lg overflow-hidden border border-zinc-100 bg-zinc-50 shrink-0 shadow-sm">
                        {video.thumbnailUrl && <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-zinc-900 truncate text-[11px] sm:text-xs block leading-tight">{video.title}</span>
                        <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                          <Youtube className="w-3 h-3 text-red-500" />
                          <span className="text-[8px] sm:text-[9px] text-zinc-400 font-black uppercase tracking-tighter truncate">{video.channelId}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex flex-col items-center gap-1 sm:gap-2">
                      <Badge className={cn("border-none text-[7px] sm:text-[8px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm", video.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                        {video.isActive !== false ? 'ACTIVE' : 'DISABLED'}
                      </Badge>
                      {video.isTrending && <Badge className="bg-amber-50 text-amber-600 border-none text-[6px] sm:text-[7px] font-black px-1.5 sm:px-2 py-0.5 uppercase tracking-widest">Trending</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-zinc-900 bg-zinc-50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-zinc-100 shadow-inner">
                        <Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                        {video.appViewCount?.toLocaleString() || 0}
                      </div>
                      <span className="text-[8px] sm:text-[9px] text-zinc-400 uppercase font-black tracking-tight">{new Date(video.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 sm:pr-12">
                    <div className="flex justify-end gap-1.5 sm:gap-3">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(video)} className="h-9 sm:h-11 px-3 sm:px-6 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:border-zinc-200 hover:shadow-sm rounded-xl transition-all">
                        <Pencil className="w-3.5 h-3.5 sm:mr-3" />
                        <span className="hidden sm:inline font-bold text-[10px] uppercase tracking-widest">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleVideoStatus(video)} className="h-9 w-9 sm:h-11 sm:w-11 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:border-zinc-200 hover:shadow-sm rounded-xl shadow-inner transition-all">
                        {video.isActive !== false ? <PowerOff className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" /> : <Power className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(video.id)} className="h-9 w-9 sm:h-11 sm:w-11 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="bg-zinc-50/50 border-t border-zinc-100 p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-black uppercase tracking-[0.2em] sm:tracking-[0.4em]">Inventory Page {currentPage} / {totalPages}</span>
            <div className="flex gap-3 sm:gap-4 w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none rounded-xl sm:rounded-2xl border-zinc-200 bg-white text-zinc-600 font-bold h-12 sm:h-14 px-6 sm:px-10 hover:bg-zinc-900 hover:text-white transition-all shadow-sm" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-3" /> Prev
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none rounded-xl sm:rounded-2xl border-zinc-200 bg-white text-zinc-600 font-bold h-12 sm:h-14 px-6 sm:px-10 hover:bg-zinc-900 hover:text-white transition-all shadow-sm" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 sm:ml-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="sm:max-w-xl w-[95vw] bg-white border-zinc-200 text-zinc-900 rounded-2xl sm:rounded-[3rem] p-0 outline-none overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 sm:p-10 border-b border-zinc-100 bg-zinc-50 shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-headline font-bold flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 bg-white rounded-xl border border-zinc-100 flex items-center justify-center shadow-sm">
                <VideoIcon className="w-5 h-5 text-zinc-400" />
              </div>
              Record Refinement
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs sm:text-sm mt-1 sm:mt-2">Update content metadata and platform visibility.</DialogDescription>
          </DialogHeader>
          
          <div className="p-6 sm:p-10 space-y-8 sm:space-y-10 overflow-y-auto flex-1 bg-white">
            <div className="grid gap-3 sm:gap-4">
              <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Video Headline</Label>
              <Input className="bg-zinc-50 border-zinc-200 h-12 sm:h-14 rounded-xl sm:rounded-2xl text-zinc-900 font-bold focus:ring-zinc-900 focus:bg-white transition-all shadow-inner" value={videoFormData.title} onChange={(e) => setVideoFormData({ ...videoFormData, title: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:gap-4">
              <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Narrative Context</Label>
              <Textarea className="bg-zinc-50 border-zinc-200 min-h-[150px] sm:min-h-[180px] rounded-xl sm:rounded-2xl text-sm text-zinc-600 leading-relaxed p-4 sm:p-6 focus:ring-zinc-900 focus:bg-white transition-all shadow-inner" value={videoFormData.description} onChange={(e) => setVideoFormData({ ...videoFormData, description: e.target.value })} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-4">
              <div className="flex items-center justify-between p-4 sm:p-6 bg-zinc-50 rounded-2xl sm:rounded-3xl border border-zinc-100 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900">Featured Feed</span>
                  <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest mt-1">Global Carousel</span>
                </div>
                <Switch checked={videoFormData.isTrending} onCheckedChange={(val) => setVideoFormData({ ...videoFormData, isTrending: val })} />
              </div>
              <div className="flex items-center justify-between p-4 sm:p-6 bg-zinc-50 rounded-2xl sm:rounded-3xl border border-zinc-100 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-900">Active Node</span>
                  <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest mt-1">Public Display</span>
                </div>
                <Switch checked={videoFormData.isActive} onCheckedChange={(val) => setVideoFormData({ ...videoFormData, isActive: val })} />
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 bg-zinc-50 border-t border-zinc-100 shrink-0 flex flex-row items-center justify-end gap-3 sm:gap-4">
            <Button variant="ghost" onClick={() => setIsVideoDialogOpen(false)} className="h-12 sm:h-14 px-4 sm:px-8 font-bold text-zinc-400 hover:text-zinc-900">Discard</Button>
            <Button 
              className="rounded-xl sm:rounded-2xl h-12 sm:h-14 px-6 sm:px-12 font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all flex items-center gap-2 sm:gap-3 shadow-xl active:scale-95" 
              onClick={handleSaveVideo}
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm uppercase tracking-widest">Update</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}