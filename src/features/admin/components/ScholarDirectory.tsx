'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Loader2,
  Settings,
  UserCheck,
  UserPlus,
  Mic2,
  Type,
  Link as LinkIcon,
  Image as ImageIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

export function ScholarDirectory() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newScholar, setNewScholar] = useState({ id: '', name: '', profileImageUrl: '' });

  const scholarsQuery = useMemoFirebase(() => query(
    collection(db, 'speakers'),
    orderBy('name', 'asc'),
    limit(50)
  ), [db]);

  const { data: scholars, isLoading } = useCollection(scholarsQuery);

  const handleAddScholar = () => {
    if (!newScholar.name || !newScholar.id) {
      toast({ variant: "destructive", title: "Missing Fields" });
      return;
    }

    const scholarRef = doc(db, 'speakers', newScholar.id);
    setDocumentNonBlocking(scholarRef, {
      ...newScholar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    toast({ title: "Scholar Added" });
    setIsAddDialogOpen(false);
    setNewScholar({ id: '', name: '', profileImageUrl: '' });
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteDocumentNonBlocking(doc(db, 'speakers', deleteConfirmId));
      setDeleteConfirmId(null);
      toast({ title: "Scholar Removed" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-6">
        <Loader2 className="w-14 h-14 animate-spin text-zinc-200" />
        <p className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.3em]">Opening registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 shadow-inner">
              <Mic2 className="w-6 h-6 text-zinc-400" />
            </div>
            <h2 className="text-3xl font-headline font-bold text-zinc-900 tracking-tight">Scholar Registry</h2>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Manage featured spiritual teachers and their digital profiles.</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="rounded-2xl h-14 px-10 font-bold bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl flex items-center gap-3 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm uppercase tracking-widest">Register Scholar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl bg-white border-zinc-200 text-zinc-900 rounded-[3rem] p-0 outline-none shadow-2xl overflow-hidden">
            <DialogHeader className="p-10 border-b border-zinc-100 bg-zinc-50">
              <DialogTitle className="text-2xl font-headline font-bold">Create Scholar Profile</DialogTitle>
              <DialogDescription className="text-zinc-500 text-sm mt-2">Initialize a digital identity for a spiritual teacher.</DialogDescription>
            </DialogHeader>
            <div className="p-10 space-y-8">
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <Type className="w-4 h-4 text-zinc-400" />
                  <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Display Name</Label>
                </div>
                <Input placeholder="e.g. Dr. Israr Ahmed" className="bg-zinc-50 border-zinc-200 h-14 rounded-2xl text-zinc-900 font-bold focus:ring-zinc-900 focus:bg-white transition-all shadow-inner" value={newScholar.name} onChange={(e) => setNewScholar({ ...newScholar, name: e.target.value })} />
              </div>
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <LinkIcon className="w-4 h-4 text-zinc-400" />
                  <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Identification Slug</Label>
                </div>
                <Input placeholder="e.g. dr-israr-ahmed" className="bg-zinc-50 border-zinc-200 h-14 rounded-2xl text-zinc-900 font-mono text-xs focus:ring-zinc-900 focus:bg-white transition-all shadow-inner" value={newScholar.id} onChange={(e) => setNewScholar({ ...newScholar, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
              </div>
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-4 h-4 text-zinc-400" />
                  <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Profile Graphic URL</Label>
                </div>
                <Input placeholder="https://..." className="bg-zinc-50 border-zinc-200 h-14 rounded-2xl text-zinc-900 text-xs focus:ring-zinc-900 focus:bg-white transition-all shadow-inner" value={newScholar.profileImageUrl} onChange={(e) => setNewScholar({ ...newScholar, profileImageUrl: e.target.value })} />
              </div>
              <Button 
                className="w-full h-14 font-bold rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl transition-all flex items-center justify-center gap-3 mt-4 active:scale-95" 
                onClick={handleAddScholar}
              >
                <UserPlus className="w-5 h-5" />
                <span className="text-sm uppercase tracking-widest">Persist Profile</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-white border-zinc-200 text-zinc-900 rounded-[3rem] p-12 max-w-md shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline font-bold">Remove Scholar?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 mt-2">This action will delete the profile permanently. Associated content will remain but lose categorization.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 gap-4">
            <AlertDialogCancel className="bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100 rounded-xl h-12 font-bold px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white hover:bg-red-700 rounded-xl h-12 font-bold px-8 shadow-lg shadow-red-500/20">Purge Record</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {scholars?.map((scholar) => (
          <Card key={scholar.id} className="bg-white border-zinc-200 rounded-[3rem] overflow-hidden hover:border-zinc-400 transition-all group shadow-sm border-t-4 border-t-transparent hover:border-t-zinc-900">
            <CardHeader className="p-10 border-b border-zinc-50 bg-zinc-50/30">
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-zinc-100 bg-white shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                  <Image src={scholar.profileImageUrl || 'https://picsum.photos/seed/scholar/200'} alt={scholar.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold text-zinc-900 truncate tracking-tight">{scholar.name}</CardTitle>
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <Badge variant="outline" className="bg-white border-zinc-100 text-zinc-400 text-[9px] font-black uppercase px-3 py-0.5 shadow-inner">{scholar.id}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="p-8 bg-zinc-50/30 border-t border-zinc-100 flex justify-between gap-4">
               <Button variant="outline" size="sm" className="flex-1 rounded-xl font-bold h-12 border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:border-zinc-900 transition-all shadow-sm flex items-center justify-center gap-3">
                 <Settings className="w-4 h-4" /> 
                 <span className="text-[10px] uppercase tracking-widest">Manage</span>
               </Button>
               <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 text-zinc-300 hover:text-red-600 hover:bg-red-50 transition-all" onClick={() => setDeleteConfirmId(scholar.id)}>
                 <Trash2 className="w-5 h-5" />
               </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}