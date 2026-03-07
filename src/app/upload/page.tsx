
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Youtube, Globe } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-32">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold">Creator Studio</h1>
        <p className="text-muted-foreground">Upload and manage your spiritual content directly to YouTube.</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Content Upload</CardTitle>
          <CardDescription>Connect your YouTube account to publish directly from VlogNest.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-muted rounded-2xl p-12 flex flex-col items-center justify-center space-y-4 hover:border-primary transition-colors cursor-pointer group">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-all">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop your video files here</p>
              <p className="text-sm text-muted-foreground">MP4, MOV, or AVI (Max 500MB)</p>
            </div>
            <Button variant="outline" size="sm">Select Files</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-secondary/50 border-none p-4 flex items-center space-x-4">
               <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                 <Youtube className="w-6 h-6 text-red-500" />
               </div>
               <div className="flex-1">
                 <p className="text-xs font-bold uppercase text-muted-foreground">Platform</p>
                 <p className="text-sm font-medium">YouTube Connected</p>
               </div>
            </Card>
            <Card className="bg-secondary/50 border-none p-4 flex items-center space-x-4">
               <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                 <Globe className="w-6 h-6 text-primary" />
               </div>
               <div className="flex-1">
                 <p className="text-xs font-bold uppercase text-muted-foreground">Visibility</p>
                 <p className="text-sm font-medium">Public</p>
               </div>
            </Card>
          </div>

          <Button className="w-full h-12 bg-primary text-white font-bold text-lg rounded-2xl">
            Publish to YouTube
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
