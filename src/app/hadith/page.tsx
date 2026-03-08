"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Quote, 
  Search, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw,
  BookMarked,
  FilterX
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// Simplified Hadith mock data for MVP
const MOCK_HADITHS = [
  {
    id: 1,
    book: "Sahih Bukhari",
    chapter: "Revelation",
    text: "Actions are but by intentions and every man shall have only that which he intended.",
    arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    reference: "Book 1, Hadith 1"
  },
  {
    id: 2,
    book: "Sahih Muslim",
    chapter: "Faith",
    text: "None of you truly believes until he loves for his brother what he loves for himself.",
    arabic: "لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
    reference: "Book 1, Hadith 72"
  },
  {
    id: 3,
    book: "40 Hadith Nawawi",
    chapter: "General",
    text: "The best of you are those who learn the Quran and teach it.",
    arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    reference: "Hadith 3"
  }
];

export default function HadithPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelected_Book] = useState('all');
  const [loading, setLoading] = useState(false);
  const [hadiths, setHadiths] = useState(MOCK_HADITHS);

  useEffect(() => {
    // In a real app, we'd fetch from an API like sunnah.com or similar
    const filtered = MOCK_HADITHS.filter(h => {
      const matchesSearch = h.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           h.arabic.includes(searchTerm);
      const matchesBook = selectedBook === 'all' || h.book === selectedBook;
      return matchesSearch && matchesBook;
    });
    setHadiths(filtered);
  }, [searchTerm, selectedBook]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
              <Quote className="w-5 h-5 text-zinc-500 fill-zinc-500" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-zinc-100">Hadith Library</h1>
          </div>
          <p className="text-zinc-500 text-sm">Sacred traditions and sayings of the Prophet Muhammad (PBUH).</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-zinc-950/50 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search hadith text, keywords, or Arabic..." 
            className="bg-zinc-900 border-zinc-800 pl-12 rounded-2xl h-14 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedBook} onValueChange={setSelected_Book}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 h-14 rounded-2xl text-white w-full md:w-64">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-zinc-600" />
              <SelectValue placeholder="All Books" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="Sahih Bukhari">Sahih Bukhari</SelectItem>
            <SelectItem value="Sahih Muslim">Sahih Muslim</SelectItem>
            <SelectItem value="40 Hadith Nawawi">40 Hadith Nawawi</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => {setSearchTerm(''); setSelected_Book('all');}} className="h-14 w-14 shrink-0 rounded-2xl border-zinc-900 bg-zinc-950">
          <FilterX className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {hadiths.map((hadith) => (
          <Card key={hadith.id} className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl hover:border-zinc-700 transition-all group">
            <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-500">{hadith.book}</CardTitle>
                <CardDescription className="text-xs text-zinc-600 font-bold">{hadith.chapter}</CardDescription>
              </div>
              <span className="text-[10px] font-mono text-zinc-700 uppercase bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">{hadith.reference}</span>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <p className="text-right text-3xl font-arabic leading-relaxed text-zinc-100" dir="rtl">
                {hadith.arabic}
              </p>
              <div className="border-l-4 border-zinc-800 pl-6 py-2">
                <p className="text-lg text-zinc-400 font-medium leading-relaxed italic">
                  "{hadith.text}"
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {hadiths.length === 0 && (
          <div className="py-32 text-center bg-zinc-950/30 rounded-[3rem] border-2 border-dashed border-zinc-900">
            <Quote className="w-16 h-16 text-zinc-900 mx-auto mb-6 opacity-20" />
            <p className="text-zinc-600 font-medium text-lg">No hadiths found matching your search.</p>
            <Button variant="link" onClick={() => {setSearchTerm(''); setSelected_Book('all');}} className="text-zinc-400 mt-2">Clear all filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}
