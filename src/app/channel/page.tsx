
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, BarChart3, Settings, Link2, ExternalLink, ShieldCheck, Plus } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function MyChannelPage() {
  const myVideos = [
    { id: 1, title: 'Getting Started with VlogNest', views: '12K', status: 'Published', img: PlaceHolderImages[0] },
    { id: 2, title: 'My Daily Routine 2024', views: '4.5K', status: 'Published', img: PlaceHolderImages[1] },
    { id: 3, title: 'Tech Review: New Smartwatch', views: '800', status: 'Draft', img: PlaceHolderImages[2] },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-32">
      {/* Profile Header */}
      <section className="bg-card p-8 rounded-3xl border border-border flex flex-col md:flex-row items-center gap-8 shadow-xl">
        <div className="relative w-32 h-32 md:w-40 md:h-40">
           <Image 
             src={PlaceHolderImages[5].imageUrl} 
             alt="Profile" 
             fill 
             className="rounded-3xl object-cover border-4 border-secondary"
           />
           <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center border-4 border-card shadow-lg">
             <ShieldCheck className="text-white w-5 h-5" />
           </div>
        </div>
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold">Alexander Wright</h1>
            <p className="text-muted-foreground">@alexwright_vlogs • 14.2K Subscribers</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <Button className="bg-primary text-white font-bold">Edit Profile</Button>
            <Button variant="secondary" className="font-bold flex items-center">
              <Link2 className="w-4 h-4 mr-2" />
              Manage Linkage
            </Button>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="text-center bg-secondary/50 px-6 py-4 rounded-2xl">
             <p className="text-2xl font-bold">124</p>
             <p className="text-[10px] text-muted-foreground uppercase font-bold">Videos</p>
           </div>
           <div className="text-center bg-secondary/50 px-6 py-4 rounded-2xl">
             <p className="text-2xl font-bold">2.1M</p>
             <p className="text-[10px] text-muted-foreground uppercase font-bold">Views</p>
           </div>
        </div>
      </section>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="bg-secondary p-1 rounded-xl h-12">
          <TabsTrigger value="videos" className="px-6 rounded-lg"><Video className="w-4 h-4 mr-2" /> My Videos</TabsTrigger>
          <TabsTrigger value="analytics" className="px-6 rounded-lg"><BarChart3 className="w-4 h-4 mr-2" /> Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="px-6 rounded-lg"><Settings className="w-4 h-4 mr-2" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myVideos.map((video) => (
              <Card key={video.id} className="bg-card border-border overflow-hidden">
                <div className="relative aspect-video">
                  <Image src={video.img.imageUrl} alt={video.title} fill className="object-cover" />
                  <div className="absolute top-2 right-2">
                    <Badge className={video.status === 'Published' ? "bg-green-500" : "bg-yellow-500"}>
                      {video.status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold line-clamp-1">{video.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{video.views} total views</span>
                    <button className="text-primary hover:underline flex items-center">
                      Details <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="bg-secondary/30 border-2 border-dashed border-muted rounded-2xl flex flex-col items-center justify-center p-8 space-y-4 hover:border-primary transition-all cursor-pointer">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Plus className="text-primary w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Add New Content</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-8">
          <Card className="bg-card border-border p-12 text-center text-muted-foreground">
             <BarChart3 className="w-16 h-16 mx-auto opacity-10 mb-4" />
             <h3 className="text-xl font-headline font-bold text-foreground">Analytics Insight</h3>
             <p className="max-w-xs mx-auto mt-2">Connecting to YouTube Data API to fetch your real-time performance metrics.</p>
             <Button variant="outline" className="mt-6">Refresh Stats</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
