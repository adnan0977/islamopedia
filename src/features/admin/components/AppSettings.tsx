
"use client";

import { useState, useEffect, useRef } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { 
  Settings, 
  Image as ImageIcon, 
  Layout, 
  Save, 
  Loader2, 
  Hash, 
  Upload, 
  Trash2, 
  Plus, 
  Code,
  CheckCircle2,
  FileImage,
  Sparkles
} from 'lucide-react';
import { AYAT_FRAMES, AyatFrame } from '@/components/quran/AyatFrame';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AppSettings() {
  const db = useFirestore();
  const { toast } = useToast();
  
  // Refs for file inputs
  const svgInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'app_config'), [db]);
  const { data: settings, isLoading } = useDoc(settingsRef);

  const [localSettings, setLocalSettings] = useState({
    logoUrl: '',
    ayatFrameId: 'royal-ornate',
    customAyatFramePath: '',
    frameImageUrl: '',
    savedCustomFrames: [] as any[],
    navigationVisibility: {
      home: true,
      upload: true,
      quran: true,
      speakers: true
    }
  });

  const [newFrame, setNewFrame] = useState({ name: '', path: '', imageUrl: '', type: 'svg' as 'svg' | 'image' });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        logoUrl: settings.logoUrl || '',
        ayatFrameId: settings.ayatFrameId || 'royal-ornate',
        customAyatFramePath: settings.customAyatFramePath || '',
        frameImageUrl: settings.frameImageUrl || '',
        savedCustomFrames: settings.savedCustomFrames || [],
        navigationVisibility: {
          home: settings.navigationVisibility?.home ?? true,
          upload: settings.navigationVisibility?.upload ?? true,
          quran: settings.navigationVisibility?.quran ?? true,
          speakers: settings.navigationVisibility?.speakers ?? true
        }
      });
    }
  }, [settings]);

  const handleSave = () => {
    if (!settingsRef) return;
    updateDocumentNonBlocking(settingsRef, localSettings);
    toast({
      title: "Settings Saved",
      description: "App configuration has been updated successfully."
    });
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1000000) {
      toast({ variant: "destructive", title: "Logo too large", description: "Please upload an image smaller than 1MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setLocalSettings({ ...localSettings, logoUrl: dataUri });
      toast({ title: "Logo Uploaded", description: "Branding updated successfully." });
    };
    reader.readAsDataURL(file);
  };

  const parseSvgPath = (svgString: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const path = doc.querySelector('path');
      return path ? path.getAttribute('d') : null;
    } catch (e) {
      console.error("Failed to parse SVG", e);
      return null;
    }
  };

  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const d = parseSvgPath(content);
      if (d) {
        setNewFrame({ ...newFrame, path: d, type: 'svg', imageUrl: '' });
        toast({ title: "SVG Parsed", description: "Successfully extracted path data." });
      } else {
        toast({ variant: "destructive", title: "Invalid SVG", description: "Could not find path data in the file." });
      }
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) { // 500KB limit for base64
      toast({ variant: "destructive", title: "File too large", description: "Please upload an image smaller than 500KB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setNewFrame({ ...newFrame, imageUrl: dataUri, type: 'image', path: '' });
      toast({ title: "Image Loaded", description: "Custom graphic ready for library." });
    };
    reader.readAsDataURL(file);
  };

  const addCustomFrame = () => {
    if (!newFrame.name || (newFrame.type === 'svg' && !newFrame.path) || (newFrame.type === 'image' && !newFrame.imageUrl)) {
      toast({ variant: "destructive", title: "Error", description: "Name and design data are required." });
      return;
    }

    const frameId = `custom-${Date.now()}`;
    const updatedCustomFrames = [...localSettings.savedCustomFrames, { 
      id: frameId, 
      name: newFrame.name, 
      path: newFrame.path,
      imageUrl: newFrame.imageUrl 
    }];
    
    setLocalSettings({
      ...localSettings,
      savedCustomFrames: updatedCustomFrames
    });
    
    setNewFrame({ name: '', path: '', imageUrl: '', type: 'svg' });
    toast({ title: "Frame Added", description: "Your custom frame is now ready to be selected." });
  };

  const removeCustomFrame = (id: string) => {
    const updated = localSettings.savedCustomFrames.filter(f => f.id !== id);
    setLocalSettings({
      ...localSettings,
      savedCustomFrames: updated,
      ayatFrameId: localSettings.ayatFrameId === id ? 'royal-ornate' : localSettings.ayatFrameId
    });
  };

  const selectFrame = (frame: any) => {
    setLocalSettings({
      ...localSettings,
      ayatFrameId: frame.id,
      customAyatFramePath: frame.path || '',
      frameImageUrl: frame.imageUrl || ''
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
        <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-zinc-500" />
            <CardTitle className="text-xl font-bold text-white">Global Configuration</CardTitle>
          </div>
          <CardDescription className="text-zinc-500 text-sm">Manage your platform's branding and layout settings.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-8 space-y-16">
          {/* Branding Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-zinc-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">Branding</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="logo" className="text-zinc-400">Logo Image URL</Label>
                  <Input 
                    id="logo"
                    placeholder="https://example.com/logo.png"
                    className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-12"
                    value={localSettings.logoUrl}
                    onChange={(e) => setLocalSettings({ ...localSettings, logoUrl: e.target.value })}
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-900" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-zinc-950 px-2 text-zinc-600 font-black">Or</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-zinc-400">Upload Logo File</Label>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl border-zinc-800 bg-zinc-900 h-12 text-zinc-400 font-bold"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                  <input 
                    type="file" 
                    ref={logoInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleLogoFileUpload} 
                  />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center bg-zinc-900/30 rounded-3xl border border-zinc-900 p-8">
                <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest mb-6">Logo Preview</p>
                <div className="w-32 h-32 bg-zinc-950 border border-zinc-800 rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl">
                  {localSettings.logoUrl ? (
                    <img src={localSettings.logoUrl} alt="Preview" className="w-20 h-20 object-contain" />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-zinc-800" />
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Verse Numbering Style Section */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-zinc-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">Verse Numbering Style</h3>
              </div>
              <Badge variant="outline" className="border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                {AYAT_FRAMES.length + localSettings.savedCustomFrames.length} Styles Available
              </Badge>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {/* Built-in Frames */}
              {AYAT_FRAMES.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => selectFrame(frame)}
                  className={cn(
                    "flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all group relative",
                    localSettings.ayatFrameId === frame.id 
                      ? "bg-zinc-900 border-zinc-500 shadow-lg" 
                      : "bg-zinc-950 border-zinc-900 hover:border-zinc-700"
                  )}
                >
                  <AyatFrame number={7} frameId={frame.id} size="lg" />
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-tight text-center",
                    localSettings.ayatFrameId === frame.id ? "text-white" : "text-zinc-600"
                  )}>
                    {frame.name}
                  </span>
                  {localSettings.ayatFrameId === frame.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                    </div>
                  )}
                </button>
              ))}

              {/* Saved Custom Frames */}
              {localSettings.savedCustomFrames.map((frame) => (
                <div key={frame.id} className="relative group/frame">
                  <button
                    onClick={() => selectFrame(frame)}
                    className={cn(
                      "flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all w-full h-full relative",
                      localSettings.ayatFrameId === frame.id 
                        ? "bg-zinc-900 border-zinc-500 shadow-lg" 
                        : "bg-zinc-950 border-zinc-900 hover:border-zinc-700"
                    )}
                  >
                    <AyatFrame 
                      number={7} 
                      customPath={frame.path} 
                      customImageUrl={frame.imageUrl}
                      size="lg" 
                    />
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tight text-center truncate w-full px-2",
                      localSettings.ayatFrameId === frame.id ? "text-white" : "text-zinc-600"
                    )}>
                      {frame.name}
                    </span>
                    {localSettings.ayatFrameId === frame.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                      </div>
                    )}
                  </button>
                  <button 
                    onClick={() => removeCustomFrame(frame.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center opacity-0 group-hover/frame:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Custom Design Management hub */}
            <Card className="bg-zinc-900/20 border-zinc-900 rounded-3xl p-8 border-dashed border-2">
              <div className="flex flex-col md:flex-row gap-10">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-zinc-500" />
                    <h4 className="text-sm font-bold text-white">Create Custom Style</h4>
                  </div>
                  
                  <Tabs defaultValue="svg" className="w-full">
                    <TabsList className="bg-zinc-950 p-1 rounded-xl h-10 border border-zinc-800 mb-6">
                      <TabsTrigger value="svg" className="flex-1 rounded-lg text-xs font-bold"><Code className="w-3 h-3 mr-2" /> SVG Path</TabsTrigger>
                      <TabsTrigger value="image" className="flex-1 rounded-lg text-xs font-bold"><FileImage className="w-3 h-3 mr-2" /> Image File</TabsTrigger>
                    </TabsList>

                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Frame Name</Label>
                        <Input 
                          placeholder="e.g., My Ornate Border"
                          className="bg-zinc-950 border-zinc-800 text-white rounded-xl"
                          value={newFrame.name}
                          onChange={(e) => setNewFrame({ ...newFrame, name: e.target.value })}
                        />
                      </div>

                      <TabsContent value="svg" className="m-0 space-y-4">
                        <div className="grid gap-2">
                          <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">SVG Source</Label>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1 rounded-xl border-zinc-800 bg-zinc-950 h-12 text-zinc-400 font-bold"
                              onClick={() => svgInputRef.current?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload SVG File
                            </Button>
                            <input type="file" ref={svgInputRef} className="hidden" accept=".svg" onChange={handleSvgUpload} />
                          </div>
                          <Textarea 
                            placeholder="Or paste SVG path data (d attribute)..."
                            className="bg-zinc-950 border-zinc-800 text-white font-mono text-[10px] min-h-[100px] mt-2"
                            value={newFrame.path}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.trim().startsWith('<svg')) {
                                const d = parseSvgPath(val);
                                setNewFrame({ ...newFrame, path: d || val, type: 'svg', imageUrl: '' });
                              } else {
                                setNewFrame({ ...newFrame, path: val, type: 'svg', imageUrl: '' });
                              }
                            }}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="image" className="m-0 space-y-4">
                        <div className="grid gap-2">
                          <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Upload Graphic</Label>
                          <Button 
                            variant="outline" 
                            className="w-full rounded-xl border-zinc-800 bg-zinc-950 h-12 text-zinc-400 font-bold"
                            onClick={() => imageInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Choose Image (PNG/JPG)
                          </Button>
                          <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                          <p className="text-[10px] text-zinc-600 italic">Recommended: Transparent PNG, 100x100px size.</p>
                        </div>
                      </TabsContent>

                      <Button 
                        onClick={addCustomFrame}
                        disabled={!newFrame.name || (newFrame.type === 'svg' && !newFrame.path) || (newFrame.type === 'image' && !newFrame.imageUrl)}
                        className="w-full bg-zinc-100 text-black hover:bg-white rounded-xl font-bold h-12"
                      >
                        Save to Library
                      </Button>
                    </div>
                  </Tabs>
                </div>

                <div className="w-full md:w-64 space-y-4">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block text-center">Live Preview</Label>
                  <div className="bg-zinc-950 rounded-3xl border border-zinc-800 aspect-square flex flex-col items-center justify-center p-8 shadow-inner">
                    {(newFrame.path || newFrame.imageUrl) ? (
                      <>
                        <AyatFrame 
                          number={7} 
                          customPath={newFrame.path} 
                          customImageUrl={newFrame.imageUrl}
                          size="lg" 
                          className="scale-150" 
                        />
                        <p className="mt-8 text-[10px] font-black uppercase text-zinc-600 tracking-widest">Preview</p>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-zinc-800">
                        <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-[10px] font-bold text-center">No design loaded</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Navigation Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Layout className="w-4 h-4 text-zinc-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">Navigation Visibility</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'home', label: 'Home Page' },
                { id: 'upload', label: 'Upload Studio' },
                { id: 'quran', label: 'Quran Reader' },
                { id: 'speakers', label: 'Speaker Directory' }
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-900">
                  <span className="text-sm font-bold text-zinc-300">{item.label}</span>
                  <Switch 
                    checked={localSettings.navigationVisibility[item.id as keyof typeof localSettings.navigationVisibility]}
                    onCheckedChange={(val) => setLocalSettings({
                      ...localSettings,
                      navigationVisibility: {
                        ...localSettings.navigationVisibility,
                        [item.id]: val
                      }
                    })}
                  />
                </div>
              ))}
            </div>
          </section>
        </CardContent>

        <CardFooter className="p-8 bg-zinc-900/10 border-t border-zinc-900 flex justify-end">
          <Button 
            className="bg-white text-black hover:bg-zinc-200 rounded-xl font-bold h-12 px-10 transition-transform active:scale-95 flex items-center gap-2"
            onClick={handleSave}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
