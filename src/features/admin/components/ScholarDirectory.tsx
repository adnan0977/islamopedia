
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
  Mic2, 
  Search, 
  Plus, 
  Trash2, 
  Loader2,
  Settings,
  UserCheck,
  Video,
  UserPlus
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
import { Badge } from '@/components/ui/badge';

export function ScholarDirectory() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newScholar, setNewScholar] = useState({ id: '', name: '', profileImageUrl: '' });

  const scholarsQuery = useMemoFirebase(() => query(
    collection(db, 'speakers'),
    orderBy('name', 'asc'),
    limit(50)
  ), [db]);

  const { data: scholars, isLoading } = useCollection(scholarsQuery);

  const filteredScholars = scholars?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
        <p className="text-zinc-600 font-medium">Loading scholars...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input placeholder="Search scholars..." className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              className="rounded-xl h-12 px-8 font-bold border-white text-white hover:bg-white hover:text-black shadow-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Add Scholar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-0 outline-none shadow-2xl overflow-hidden">
            <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
              <DialogTitle className="text-xl font-bold">Register Scholar</DialogTitle>
              <DialogDescription className="text-zinc-500 text-xs mt-1">Create a profile for a spiritual teacher.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="grid gap-2">
                <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Name</Label>
                <Input placeholder="e.g. Dr. Israr Ahmed" className="bg-zinc-900 border-zinc-800 h-12 rounded-xl" value={newScholar.name} onChange={(e) => setNewScholar({ ...newScholar, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">ID Slug</Label>
                <Input placeholder="e.g. dr-israr-ahmed" className="bg-zinc-900 border-zinc-800 h-12 rounded-xl" value={newScholar.id} onChange={(e) => setNewScholar({ ...newScholar, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Profile Image URL</Label>
                <Input placeholder="https://..." className="bg-zinc-900 border-zinc-800 h-12 rounded-xl" value={newScholar.profileImageUrl} onChange={(e) => setNewScholar({ ...newScholar, profileImageUrl: e.target.value })} />
              </div>
              <Button 
                variant="outline"
                className="w-full h-12 font-bold rounded-xl border-white text-white hover:bg-white hover:text-black shadow-xl transition-all flex items-center justify-center gap-2 mt-4" 
                onClick={handleAddScholar}
              >
                <UserPlus className="w-5 h-5" />
                <span>Save Profile</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2rem] p-10 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Remove Scholar?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">This action will delete the profile permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold">Remove Scholar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredScholars?.map((scholar) => (
          <Card key={scholar.id} className="bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden hover:border-zinc-700 transition-all group shadow-xl">
            <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
              <div className="flex items-center gap-5">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-zinc-800 bg-black shrink-0 shadow-lg">
                  <Image src={scholar.profileImageUrl || 'https://picsum.photos/seed/scholar/200'} alt={scholar.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-white truncate">{scholar.name}</CardTitle>
                    <UserCheck className="w-3 h-3 text-emerald-500" />
                  </div>
                  <CardDescription className="text-xs text-zinc-600 truncate">{scholar.id}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="p-6 bg-zinc-900/10 border-t border-zinc-900 flex justify-between gap-2">
               <Button variant="ghost" size="sm" className="flex-1 rounded-xl font-bold h-11 text-zinc-500 hover:text-white hover:bg-zinc-900"><Settings className="w-4 h-4 mr-2" /> Manage</Button>
               <Button variant="ghost" size="icon" className="rounded-xl h-11 w-11 text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirmId(scholar.id)}><Trash2 className="w-4 h-4" /></Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
