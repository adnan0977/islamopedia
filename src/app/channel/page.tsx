
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, BarChart3, Settings, Link2, ExternalLink, ShieldCheck, Plus, Youtube } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function MyChannelPage() {
  const myVideos = [
    { id: 1, title: 'Getting Started with VlogNest', views: '12K', status: 'Published', img: PlaceHolderImages[0] },
    { id: 2, title: 'My Daily Routine 2024', views: '4.5K', status: 'Published', img: PlaceHolderImages[1] },
    { id: 3, title: 'Tech Review: New Smartwatch', views: '800', status: 'Draft', img: PlaceHolderImages[2] },
  ];

  const youtubeChannelUrl = "https://youtube.com/@alexwright_vlogs"; // Placeholder link

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
             <ShieldCheck className="text-primary-foreground w-5 h-5" />
           </div>
        </div>
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold">Alexander Wright</h1>
            <p className="text-muted-foreground">@alexwright_vlogs • 14.2K Subscribers</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <Button className="bg-primary text-primary-foreground font-bold rounded-xl h-11 px-6">Edit Profile</Button>
            <a href={youtubeChannelUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="font-bold rounded-xl h-11 px-6 flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                Visit YouTube
              </Button>
            </a>
            <Button variant="outline" className="font-bold rounded-xl h-11 px-6 flex items-center border-border/50">
              <Link2 className="w-4 h-4 mr-2" />
              Manage Linkage
            </Button>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="text-center bg-secondary/30 px-6 py-4 rounded-2xl border border-border/50 min-w-[100px]">
             <p className="text-2xl font-bold">124</p>
             <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Videos</p>
           </div>
           <div className="text-center bg-secondary/30 px-6 py-4 rounded-2xl border border-border/50 min-w-[100px]">
             <p className="text-2xl font-bold">2.1M</p>
             <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Views</p>
           </div>
        </div>
      </section>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="bg-secondary/50 p-1.5 rounded-2xl h-14 border border-border/50 mb-8">
          <TabsTrigger value="videos" className="px-8 rounded-xl h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><Video className="w-4 h-4 mr-2" /> My Videos</TabsTrigger>
          <TabsTrigger value="analytics" className="px-8 rounded-xl h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><BarChart3 className="w-4 h-4 mr-2" /> Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="px-8 rounded-xl h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"><Settings className="w-4 h-4 mr-2" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myVideos.map((video) => (
              <Card key={video.id} className="bg-card border-border overflow-hidden group hover:border-primary/50 transition-all rounded-2xl">
                <div className="relative aspect-video">
                  <Image src={video.img.imageUrl} alt={video.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3">
                    <Badge className={video.status === 'Published' ? "bg-green-500 text-white" : "bg-yellow-500 text-black"}>
                      {video.status}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-bold line-clamp-1 text-lg leading-tight">{video.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/30">
                    <span className="font-bold uppercase tracking-wider">{video.views} total views</span>
                    <button className="text-primary font-bold hover:underline flex items-center gap-1.5">
                      Details <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="bg-secondary/10 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-8 space-y-4 hover:border-primary/50 hover:bg-secondary/20 transition-all cursor-pointer group">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="text-primary w-7 h-7" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Add New Content</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="bg-card border-border p-20 text-center rounded-3xl">
             <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
               <BarChart3 className="w-10 h-10 text-muted-foreground opacity-30" />
             </div>
             <h3 className="text-2xl font-headline font-bold text-foreground">Analytics Insight</h3>
             <p className="max-w-sm mx-auto mt-3 text-muted-foreground leading-relaxed">
               Connecting to YouTube Data API to fetch your real-time performance metrics and audience growth insights.
             </p>
             <Button variant="outline" className="mt-8 rounded-xl px-10 h-11 border-border/50 font-bold">Refresh Stats</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
