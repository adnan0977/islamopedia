
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
  quranEditions: any[];
  hadithEditions: any[];
}

export function DashboardOverview({ channels, videos, speakers, quranEditions, hadithEditions }: DashboardProps) {
  const stats = [
    { label: 'Total Videos', value: videos.length, icon: VideoIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Active Channels', value: channels.length, icon: Youtube, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Featured Scholars', value: speakers.length, icon: Mic2, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Library Editions', value: quranEditions.length + hadithEditions.length, icon: Languages, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  const chartData = [
    { name: 'Mon', views: 4000 },
    { name: 'Tue', views: 3000 },
    { name: 'Wed', views: 5000 },
    { name: 'Thu', views: 4200 },
    { name: 'Fri', views: 6800 },
    { name: 'Sat', views: 5900 },
    { name: 'Sun', views: 7490 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-white border-zinc-200 rounded-[2rem] overflow-hidden shadow-sm hover:border-zinc-400 transition-all group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-8 pb-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {stat.label}
              </CardTitle>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-100 transition-colors", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="text-4xl font-headline font-bold text-zinc-900 tracking-tight">{stat.value}</div>
              <p className="text-[10px] text-zinc-400 mt-2 font-medium flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> 
                <span className="text-emerald-600 font-bold">+12.5%</span> this month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-white border-zinc-200 rounded-[2.5rem] p-10 shadow-sm">
          <CardHeader className="px-0 pt-0 mb-8">
            <CardTitle className="text-xl font-bold text-zinc-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                <TrendingUp className="w-5 h-5 text-zinc-400" />
              </div>
              Platform Growth
            </CardTitle>
            <CardDescription className="text-sm text-zinc-500 mt-1">Cross-collection view engagement analytics.</CardDescription>
          </CardHeader>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dy={15} />
                <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dx={-15} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '16px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="views" stroke="#18181b" fillOpacity={1} fill="url(#colorViews)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white border-zinc-200 rounded-[2.5rem] p-10 shadow-sm">
          <CardHeader className="px-0 pt-0 mb-8">
            <CardTitle className="text-xl font-bold text-zinc-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                <History className="w-5 h-5 text-zinc-400" />
              </div>
              Recent Catalog
            </CardTitle>
            <CardDescription className="text-sm text-zinc-500 mt-1">Latest spiritual content ingestion.</CardDescription>
          </CardHeader>
          <ScrollArea className="h-[350px]">
            <div className="space-y-5 pr-4">
              {videos.slice(0, 10).map((video) => (
                <div key={video.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-all cursor-pointer group">
                  <div className="relative w-14 h-9 rounded-lg overflow-hidden shrink-0 shadow-sm">
                    <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-zinc-900 truncate leading-tight group-hover:text-zinc-600">{video.title}</span>
                    <span className="text-[10px] text-zinc-400 truncate mt-1 uppercase font-black tracking-widest">{video.channelId}</span>
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
