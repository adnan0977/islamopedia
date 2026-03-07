
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Video as VideoIcon, 
  Youtube, 
  Mic2, 
  Languages, 
  TrendingUp, 
  History 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip as RechartsTooltip
} from "recharts";
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

interface DashboardProps {
  channels: any[];
  videos: any[];
  speakers: any[];
  editions: any[];
}

export function DashboardOverview({ channels, videos, speakers, editions }: DashboardProps) {
  const stats = [
    { label: 'Total Videos', value: videos.length, icon: VideoIcon, color: 'text-blue-500' },
    { label: 'Active Channels', value: channels.length, icon: Youtube, color: 'text-red-500' },
    { label: 'Featured Scholars', value: speakers.length, icon: Mic2, color: 'text-amber-500' },
    { label: 'Active Editions', value: editions.length, icon: Languages, color: 'text-emerald-500' },
  ];

  const chartData = [
    { name: 'Mon', views: 4000 },
    { name: 'Tue', views: 3000 },
    { name: 'Wed', views: 2000 },
    { name: 'Thu', views: 2780 },
    { name: 'Fri', views: 1890 },
    { name: 'Sat', views: 2390 },
    { name: 'Sun', views: 3490 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-zinc-950 border-zinc-900 rounded-2xl overflow-hidden shadow-xl hover:border-zinc-800 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {stat.label}
              </CardTitle>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-headline font-bold text-white">{stat.value}</div>
              <p className="text-[10px] text-zinc-600 mt-1 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +12.5% from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-zinc-950 border-zinc-900 rounded-3xl p-6 shadow-2xl">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-zinc-500" />
              Platform Engagement
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">View analytics across all cataloged videos</CardDescription>
          </CardHeader>
          <div className="h-[300px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis dataKey="name" stroke="#3f3f46" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#3f3f46" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '10px' }} />
                <Area type="monotone" dataKey="views" stroke="#ffffff" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-zinc-950 border-zinc-900 rounded-3xl p-6 shadow-2xl">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-500" />
              Recent Cataloging
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">Latest additions to the video feed</CardDescription>
          </CardHeader>
          <ScrollArea className="h-[300px] mt-6">
            <div className="space-y-4">
              {videos.slice(0, 10).map((video) => (
                <div key={video.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer group">
                  <div className="relative w-12 h-8 rounded-md overflow-hidden shrink-0">
                    <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate group-hover:text-zinc-300">{video.title}</span>
                    <span className="text-[10px] text-zinc-600 truncate">{video.channelId}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
