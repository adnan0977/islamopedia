
"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

const categories = ["Technology", "Lifestyle", "Gaming", "Education", "Islamic", "Travel", "Vlogs", "Finance"];

const channels = [
  { name: "TechInsider", subs: "2.4M", vids: "840", tags: ["Gadgets", "Reviews"] },
  { name: "GlobalExplorer", subs: "1.1M", vids: "320", tags: ["Travel", "Culture"] },
  { name: "CreativeChef", subs: "850K", vids: "450", tags: ["Cooking", "Recipes"] },
  { name: "CodeMaster", subs: "500K", vids: "210", tags: ["Dev", "Tutorials"] },
  { name: "FitLife", subs: "1.5M", vids: "1.2K", tags: ["Health", "Gym"] },
  { name: "QuranicHeart", subs: "3M", vids: "2.1K", tags: ["Spiritual", "Islamic"] },
];

export default function DiscoverPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 pb-32">
      <div className="space-y-4">
        <h1 className="text-3xl font-headline font-bold">Discover Channels</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search channels, creators, or topics..." className="pl-10 bg-card border-border" />
          </div>
          <button className="flex items-center space-x-2 bg-secondary px-4 py-2 rounded-xl text-sm font-medium hover:bg-secondary/80">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Badge key={cat} variant="secondary" className="px-4 py-1.5 cursor-pointer hover:bg-primary hover:text-white transition-all">
            {cat}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel, i) => (
          <Card key={i} className="bg-card border-border overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer group">
            <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20" />
            <CardContent className="relative pt-12 pb-6 px-6">
              <div className="absolute top-0 left-6 -translate-y-1/2 w-20 h-20 rounded-2xl overflow-hidden border-4 border-card">
                <Image 
                  src={`https://picsum.photos/seed/ch${i}/200`} 
                  alt={channel.name} 
                  fill 
                  className="object-cover"
                />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-headline font-bold">{channel.name}</h3>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                    <span>{channel.subs} Subscribers</span>
                    <span>•</span>
                    <span>{channel.vids} Videos</span>
                  </div>
                </div>
                <button className="bg-primary text-white p-2 rounded-xl hover:bg-primary/90 transition-all">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {channel.tags.map(t => (
                  <Badge key={t} className="bg-secondary text-muted-foreground border-none text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 line-clamp-2">
                Join {channel.name} for the latest updates on {channel.tags.join(' and ')}. Our content is designed to inspire and inform.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
