"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Video as VideoIcon, 
  Youtube, 
  Mic2, 
  Languages, 
  TrendingUp, 
  History,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  RefreshCcw
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
import { Badge } from '@/components/ui/badge';

interface DashboardProps {
  channels: any[];
  videos: any[];
  speakers: any[];
  quranEditions: any[];
  hadithEditions: any[];
}

export function DashboardOverview({ channels, videos, speakers, quranEditions, hadithEditions }: DashboardProps) {
  const stats = [
    { label: 'Video Catalog', value: videos.length, icon: VideoIcon, color: 'text-zinc-900', bg: 'bg-zinc-50' },
    { label: 'Platform Creators', value: channels.length, icon: Youtube, color: 'text-zinc-900', bg: 'bg-zinc-50' },
    { label: 'Active Scholars', value: speakers.length, icon: Mic2, color: 'text-zinc-900', bg: 'bg-zinc-50' },
    { label: 'Library Editions', value: quranEditions.length + hadithEditions.length, icon: Languages, color: 'text-zinc-900', bg: 'bg-zinc-50' },
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-10 rounded-[3rem] border shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-2xl">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Studio Overview</h1>
            <p className="text-sm text-muted-foreground font-medium">Monitoring platform health and content distribution across nodes.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Badge className="bg-zinc-50 text-zinc-900 border px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Platform Live
          </Badge>
          <Badge className="bg-zinc-50 text-zinc-900 border px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
            <RefreshCcw className="w-3 h-3 text-zinc-400" /> Auto-Syncing
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="bg-white border-zinc-200 rounded-[2.5rem] overflow-hidden shadow-sm hover:border-zinc-400 transition-all group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-8 pb-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {stat.label}
              </CardTitle>
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-zinc-100 shadow-inner group-hover:bg-zinc-900 transition-colors", stat.bg)}>
                <stat.icon className={cn("w-6 h-6 transition-colors", stat.color, "group-hover:text-white")} />
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="text-5xl font-black text-zinc-900 tracking-tighter">{stat.value}</div>
              <p className="text-[9px] text-zinc-400 mt-4 font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-emerald-500" /> 
                Steady Growth <span className="text-emerald-600">+12%</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-white border-zinc-200 rounded-[3rem] p-12 shadow-sm">
          <CardHeader className="px-0 pt-0 mb-10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
                  Engagement Velocity
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 font-medium uppercase tracking-widest">Daily audience interactions across all reflection nodes.</CardDescription>
              </div>
              <div className="p-3 bg-zinc-50 border rounded-2xl">
                <Zap className="w-5 h-5 text-zinc-400" />
              </div>
            </div>
          </CardHeader>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dy={15} />
                <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dx={-15} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: '24px', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', border: 'none' }} />
                <Area type="monotone" dataKey="views" stroke="#18181b" fillOpacity={1} fill="url(#colorViews)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white border-zinc-200 rounded-[3rem] p-10 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="px-0 pt-0 mb-8 shrink-0">
            <CardTitle className="text-xl font-bold text-zinc-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100 shadow-inner">
                <History className="w-5 h-5 text-zinc-400" />
              </div>
              Studio Logs
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2">Latest content synchronization events.</CardDescription>
          </CardHeader>
          <ScrollArea className="flex-1 -mx-4 px-4">
            <div className="space-y-6">
              {videos.slice(0, 12).map((video) => (
                <div key={video.id} className="flex items-center gap-4 p-4 rounded-[1.5rem] hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-all cursor-pointer group">
                  <div className="relative w-16 h-10 rounded-xl overflow-hidden shrink-0 shadow-sm border border-zinc-100">
                    <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-zinc-900 truncate leading-tight group-hover:text-zinc-600 transition-colors">{video.title}</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[7px] font-black uppercase tracking-tighter px-1.5 py-0 border-zinc-100 bg-white">Sync</Badge>
                      <span className="text-[8px] text-zinc-400 truncate uppercase font-black tracking-widest">{video.channelId}</span>
                    </div>
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
