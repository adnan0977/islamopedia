'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  DialogFooter
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

    toast({ title: "Scholar Profile Created" });
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
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Opening registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Scholars</h1>
          <p className="text-sm text-muted-foreground">Manage featured spiritual teachers and their profiles.</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Register Scholar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Register Scholar</DialogTitle>
              <DialogDescription>Initialize a digital identity for a spiritual teacher.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest">Display Name</Label>
                <Input id="name" placeholder="e.g. Dr. Israr Ahmed" value={newScholar.name} onChange={(e) => setNewScholar({ ...newScholar, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="id" className="text-xs font-bold uppercase tracking-widest">ID Slug</Label>
                <Input id="id" placeholder="e.g. dr-israr-ahmed" value={newScholar.id} onChange={(e) => setNewScholar({ ...newScholar, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="img" className="text-xs font-bold uppercase tracking-widest">Profile Image URL</Label>
                <Input id="img" placeholder="https://..." value={newScholar.profileImageUrl} onChange={(e) => setNewScholar({ ...newScholar, profileImageUrl: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddScholar}>Register Profile</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Scholar?</AlertDialogTitle>
            <AlertDialogDescription>This action will delete the profile permanently. Associated content will remain but lose categorization.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {scholars?.map((scholar) => (
          <Card key={scholar.id} className="group border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border bg-muted shrink-0 shadow-sm">
                  <Image src={scholar.profileImageUrl || 'https://picsum.photos/seed/scholar/200'} alt={scholar.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <CardTitle className="text-base truncate tracking-tight leading-none">{scholar.name}</CardTitle>
                  <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest px-2 py-0">#{scholar.id}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="pt-0 pb-4 gap-2">
               <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] font-bold uppercase tracking-widest gap-2">
                 <Settings className="w-3 h-3" /> 
                 Manage
               </Button>
               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmId(scholar.id)}>
                 <Trash2 className="w-4 h-4" />
               </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
