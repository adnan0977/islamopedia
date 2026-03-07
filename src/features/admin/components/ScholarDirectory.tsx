
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
  Video
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
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function ScholarDirectory() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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
      toast({ variant: "destructive", title: "Missing Fields", description: "Name and ID (slug) are required." });
      return;
    }

    const scholarRef = doc(db, 'speakers', newScholar.id);
    setDocumentNonBlocking(scholarRef, {
      ...newScholar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    toast({ title: "Scholar Added", description: `${newScholar.name} has been saved.` });
    setIsAddDialogOpen(false);
    setNewScholar({ id: '', name: '', profileImageUrl: '' });
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 shadow-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search scholars..." 
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
                <span className="text-sm">Add New Scholar</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-10 outline-none max-w-xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Register Scholar</DialogTitle>
                <DialogDescription className="text-zinc-500">Create a new profile for a spiritual teacher.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Scholar Name</Label>
                  <Input 
                    placeholder="e.g. Dr. Israr Ahmed" 
                    className="bg-zinc-900 border-zinc-800 h-12 rounded-xl text-white"
                    value={newScholar.name}
                    onChange={(e) => setNewScholar({ ...newScholar, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Identifier (ID)</Label>
                  <Input 
                    placeholder="e.g. dr-israr-ahmed" 
                    className="bg-zinc-900 border-zinc-800 h-12 rounded-xl text-white"
                    value={newScholar.id}
                    onChange={(e) => setNewScholar({ ...newScholar, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Profile Image URL</Label>
                  <Input 
                    placeholder="https://..." 
                    className="bg-zinc-900 border-zinc-800 h-12 rounded-xl text-white"
                    value={newScholar.profileImageUrl}
                    onChange={(e) => setNewScholar({ ...newScholar, profileImageUrl: e.target.value })}
                  />
                </div>
              </div>
              <Button 
                className="w-full h-14 font-bold rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl border border-zinc-800" 
                onClick={handleAddScholar}
              >
                Save Scholar Profile
              </Button>
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="h-14 px-6 rounded-2xl bg-zinc-900 border-zinc-800 text-zinc-300 font-bold flex items-center gap-2">
            {scholars?.length || 0} Listed
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredScholars?.map((scholar) => (
          <Card key={scholar.id} className="bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden hover:border-zinc-700 transition-all group shadow-xl">
            <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
              <div className="flex items-center gap-5">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-zinc-800 bg-black shrink-0 group-hover:scale-105 transition-transform shadow-lg">
                  <Image 
                    src={scholar.profileImageUrl || 'https://picsum.photos/seed/scholar/200'} 
                    alt={scholar.name} 
                    fill 
                    className="object-cover" 
                  />
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
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-900 flex flex-col items-center">
                    <Video className="w-4 h-4 text-zinc-700 mb-2" />
                    <span className="text-lg font-bold text-white">0</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Videos</span>
                 </div>
                 <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-900 flex flex-col items-center">
                    <Settings className="w-4 h-4 text-zinc-700 mb-2" />
                    <span className="text-lg font-bold text-white">Active</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Status</span>
                 </div>
              </div>
            </CardContent>
            <CardFooter className="p-6 bg-zinc-900/10 border-t border-zinc-900 flex justify-between gap-2">
               <Button variant="ghost" size="sm" className="flex-1 rounded-xl font-bold h-11 text-zinc-500 hover:text-white hover:bg-zinc-900">
                  <Settings className="w-4 h-4 mr-2" /> Manage
               </Button>
               <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl h-11 w-11 text-destructive hover:bg-destructive/10"
                onClick={() => deleteDocumentNonBlocking(doc(db, 'speakers', scholar.id))}
               >
                  <Trash2 className="w-4 h-4" />
               </Button>
            </CardFooter>
          </Card>
        ))}
        {(!filteredScholars || filteredScholars.length === 0) && (
          <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-3xl border-2 border-dashed border-zinc-900 flex flex-col items-center justify-center space-y-4">
             <Mic2 className="w-12 h-12 text-zinc-900" />
             <p className="text-zinc-600 font-medium">No scholars found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
