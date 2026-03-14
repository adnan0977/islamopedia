
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent 
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
import { 
  Quote, 
  Plus, 
  Loader2, 
  Trash2, 
  BookOpen, 
  Hash,
  Save
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function HadithManager() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBook, setNewBook] = useState({ id: '', collectionName: '', englishName: '', arabicName: '' });

  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    orderBy('collectionName', 'asc')
  ), [db]);

  const { data: books, isLoading } = useCollection(booksQuery);

  const handleAddBook = () => {
    if (!newBook.id || !newBook.collectionName) {
      toast({ variant: "destructive", title: "Missing Fields" });
      return;
    }

    const bookRef = doc(db, 'hadith_books', newBook.id);
    setDocumentNonBlocking(bookRef, {
      ...newBook,
      hadithCount: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    }, { merge: true });

    toast({ title: "Book Added" });
    setIsAddDialogOpen(false);
    setNewBook({ id: '', collectionName: '', englishName: '', arabicName: '' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Hadith Book Registry</h2>
          <p className="text-xs text-zinc-500">Manage the primary collections in your library.</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              className="rounded-xl h-12 px-8 font-bold border-white text-white hover:bg-white hover:text-black shadow-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Register Collection</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-0 outline-none overflow-hidden shadow-2xl">
            <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
              <DialogTitle className="text-xl font-bold">New Hadith Collection</DialogTitle>
              <DialogDescription className="text-zinc-500 text-xs mt-1">Register a primary source book.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="grid gap-2">
                <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Collection ID (slug)</Label>
                <Input placeholder="e.g. bukhari" className="bg-zinc-900 border-zinc-800 h-12 rounded-xl" value={newBook.id} onChange={(e) => setNewBook({ ...newBook, id: e.target.value.toLowerCase() })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Internal Name</Label>
                <Input placeholder="e.g. Sahih Bukhari" className="bg-zinc-900 border-zinc-800 h-12 rounded-xl" value={newBook.collectionName} onChange={(e) => setNewBook({ ...newBook, collectionName: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-zinc-500 uppercase text-[9px] font-black tracking-widest">Arabic Title</Label>
                <Input placeholder="صحيح البخاري" className="bg-zinc-900 border-zinc-800 h-12 rounded-xl text-right font-arabic" value={newBook.arabicName} onChange={(e) => setNewBook({ ...newBook, arabicName: e.target.value })} />
              </div>
              <Button 
                variant="outline"
                className="w-full h-12 font-bold rounded-xl border-white text-white hover:bg-white hover:text-black shadow-xl transition-all flex items-center justify-center gap-2 mt-4" 
                onClick={handleAddBook}
              >
                <Save className="w-4 h-4" />
                <span>Save to Registry</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2rem] shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="py-6 text-zinc-600 pl-8 text-[9px] font-black uppercase">Collection</TableHead>
              <TableHead className="text-zinc-600 text-center text-[9px] font-black uppercase">Inventory</TableHead>
              <TableHead className="text-right text-zinc-600 pr-8 text-[9px] font-black uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-zinc-800" /></TableCell></TableRow>
            ) : books?.map((book) => (
              <TableRow key={book.id} className="border-zinc-900 h-24 hover:bg-zinc-900/40 transition-colors">
                <TableCell className="pl-8">
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-100">{book.collectionName}</span>
                    <span className="text-[10px] text-zinc-600 font-arabic">{book.arabicName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                    <Hash className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] font-bold text-zinc-400">{book.hadithCount || 0} Hadiths</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteDocumentNonBlocking(doc(db, 'hadith_books', book.id))} 
                    className="h-9 w-9 text-zinc-600 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(!books || books.length === 0) && !isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <BookOpen className="w-12 h-12 text-zinc-900" />
                    <p className="text-sm font-medium text-zinc-600">The registry is currently empty. Add your first collection to begin.</p>
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
