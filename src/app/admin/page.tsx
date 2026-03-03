
"use client";

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc, setDoc, addDoc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, ShieldAlert, Youtube, Video, Book, Trash2, Edit3, Plus, Loader2 } from 'lucide-react';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function AdminPanel() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  // Admin Check
  const adminRef = useMemoFirebase(() => (user ? doc(db, 'roles_admin', user.uid) : null), [db, user]);
  const { data: adminData, isLoading: isAdminLoading } = useDoc(adminRef);

  // Collections
  const channelsRef = useMemoFirebase(() => collection(db, 'channels'), [db]);
  const { data: channels } = useCollection(channelsRef);

  const videosRef = useMemoFirebase(() => collection(db, 'videos'), [db]);
  const { data: videos } = useCollection(videosRef);

  const surahsRef = useMemoFirebase(() => collection(db, 'quran_surahs'), [db]);
  const { data: surahs } = useCollection(surahsRef);

  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying administrative access...</p>
      </div>
    );
  }

  if (!user || !adminData) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-headline font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have administrative privileges. Please contact the system administrator to grant your UID ({user?.uid || 'N/A'}) access in the 'roles_admin' collection.
        </p>
        {!user && (
          <Button onClick={() => window.location.href = '/login'} className="w-full">
            Login as Admin
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold flex items-center gap-3">
            <ShieldCheck className="text-accent" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">Welcome, {user.email}. Manage global application state.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Audit Logs</Button>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/'}>View Site</Button>
        </div>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="bg-secondary p-1 h-12 mb-6">
          <TabsTrigger value="channels" className="px-6 rounded-lg">
            <Youtube className="w-4 h-4 mr-2" /> Channels
          </TabsTrigger>
          <TabsTrigger value="videos" className="px-6 rounded-lg">
            <Video className="w-4 h-4 mr-2" /> Videos
          </TabsTrigger>
          <TabsTrigger value="quran" className="px-6 rounded-lg">
            <Book className="w-4 h-4 mr-2" /> Quran
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels">
          <ChannelManagement channels={channels || []} />
        </TabsContent>

        <TabsContent value="videos">
          <VideoManagement videos={videos || []} />
        </TabsContent>

        <TabsContent value="quran">
          <QuranManagement surahs={surahs || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChannelManagement({ channels }: { channels: any[] }) {
  const db = useFirestore();
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this channel?')) {
      deleteDocumentNonBlocking(doc(db, 'channels', id));
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>YouTube Channels</CardTitle>
          <CardDescription>Manage verified creators and linked channels.</CardDescription>
        </div>
        <Button size="sm" className="bg-accent text-accent-foreground font-bold">
          <Plus className="w-4 h-4 mr-2" /> Add Channel
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel Title</TableHead>
              <TableHead>Subscribers</TableHead>
              <TableHead>Videos</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell className="font-medium">{channel.title}</TableCell>
                <TableCell>{channel.subscribersCount?.toLocaleString() || '0'}</TableCell>
                <TableCell>{channel.videoCount || '0'}</TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Edit3 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(channel.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function VideoManagement({ videos }: { videos: any[] }) {
  const db = useFirestore();
  const handleDelete = (id: string) => {
    if (confirm('Delete this video?')) {
      deleteDocumentNonBlocking(doc(db, 'videos', id));
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Video Catalog</CardTitle>
          <CardDescription>Curate and manage trending or featured videos.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Trending</TableHead>
              <TableHead>Uploader UID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {videos.map((video) => (
              <TableRow key={video.id}>
                <TableCell className="font-medium line-clamp-1 max-w-[300px]">{video.title}</TableCell>
                <TableCell>{video.isTrending ? '✅' : '❌'}</TableCell>
                <TableCell className="text-xs font-mono">{video.uploadedByUserId}</TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Edit3 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(video.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function QuranManagement({ surahs }: { surahs: any[] }) {
  const db = useFirestore();
  const handleDelete = (id: string) => {
    if (confirm('Delete Surah record?')) {
      deleteDocumentNonBlocking(doc(db, 'quran_surahs', id));
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Quranic Metadata</CardTitle>
          <CardDescription>Manage chapters and featured verses.</CardDescription>
        </div>
        <Button size="sm" variant="outline">Import All Surahs</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Name (En)</TableHead>
              <TableHead>Name (Ar)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surahs.sort((a,b) => a.number - b.number).map((surah) => (
              <TableRow key={surah.id}>
                <TableCell>{surah.number}</TableCell>
                <TableCell className="font-medium">{surah.nameEnglish}</TableCell>
                <TableCell className="font-arabic text-primary">{surah.nameArabic}</TableCell>
                <TableCell className="text-right flex justify-end gap-2">
                  <Button variant="ghost" size="icon"><Edit3 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(surah.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
