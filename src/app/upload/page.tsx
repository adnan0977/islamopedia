
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Wand2, Tag, Loader2, Youtube, Globe } from 'lucide-react';
import { generateVideoMetadata } from '@/ai/flows/ai-generated-video-metadata';
import { aiVideoCategorizationAndTagging } from '@/ai/flows/ai-video-categorization-and-tagging';
import { Badge } from '@/components/ui/badge';

export default function UploadPage() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [keywords, setKeywords] = useState('');
  const [aiResult, setAiResult] = useState<{
    titles: string[],
    descriptions: string[],
    categories: string[],
    tags: string[]
  } | null>(null);

  const handleGenerateMetadata = async () => {
    setLoading(true);
    try {
      const metadata = await generateVideoMetadata({
        videoSummary: summary,
        keywords: keywords.split(',').map(k => k.trim())
      });
      
      const categorization = await aiVideoCategorizationAndTagging({
        videoTitle: metadata.titles[0],
        videoDescription: metadata.descriptions[0]
      });

      setAiResult({
        ...metadata,
        ...categorization
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-32">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold">Creator Studio</h1>
        <p className="text-muted-foreground">Upload, optimize, and share your content with the power of AI.</p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary">
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Upload Content</span>
          </TabsTrigger>
          <TabsTrigger value="ai-tools" className="flex items-center space-x-2">
            <Wand2 className="w-4 h-4" />
            <span>AI Optimizer</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Direct Upload</CardTitle>
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

              <Button className="w-full h-12 bg-primary text-white font-bold text-lg">
                Publish to YouTube
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-tools" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-card border-border h-fit">
              <CardHeader>
                <CardTitle>Optimize with AI</CardTitle>
                <CardDescription>Enter details about your video to generate viral titles and descriptions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Video Content Summary</label>
                  <Textarea 
                    placeholder="Briefly describe what happens in your video..." 
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="min-h-[120px] bg-secondary border-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Focus Keywords (Comma separated)</label>
                  <Input 
                    placeholder="e.g. vlog, travel, tutorial..." 
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="bg-secondary border-none"
                  />
                </div>
                <Button 
                  onClick={handleGenerateMetadata} 
                  disabled={loading || !summary} 
                  className="w-full bg-accent text-accent-foreground font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing Content...
                    </>
                  ) : (
                    <>
                      <Tag className="mr-2 h-4 w-4" />
                      Generate Suggestions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {aiResult ? (
                <>
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm uppercase text-primary font-bold">Title Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {aiResult.titles.map((t, i) => (
                        <div key={i} className="p-3 bg-secondary rounded-xl text-sm font-medium border border-border/50 cursor-pointer hover:border-primary transition-all">
                          {t}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm uppercase text-accent font-bold">Categories & Tags</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {aiResult.categories.map((c, i) => (
                          <Badge key={i} className="bg-primary/20 text-primary border-none">
                            {c}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {aiResult.tags.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-muted-foreground border-muted-foreground/30">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="h-full border-2 border-dashed border-muted rounded-2xl flex items-center justify-center p-8 text-center text-muted-foreground">
                  Your AI optimizations will appear here.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
