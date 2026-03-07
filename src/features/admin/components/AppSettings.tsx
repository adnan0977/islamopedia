
"use client";

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Settings, Image as ImageIcon, Layout, Save, Loader2, Hash } from 'lucide-react';
import { AYAT_FRAMES, AyatFrame } from '@/components/quran/AyatFrame';
import { cn } from '@/lib/utils';

export function AppSettings() {
  const db = useFirestore();
  const { toast } = useToast();
  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'app_config'), [db]);
  const { data: settings, isLoading } = useDoc(settingsRef);

  const [localSettings, setLocalSettings] = useState({
    logoUrl: '',
    ayatFrameId: 'star',
    navigationVisibility: {
      home: true,
      upload: true,
      quran: true,
      speakers: true
    }
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        logoUrl: settings.logoUrl || '',
        ayatFrameId: settings.ayatFrameId || 'star',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
        <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-zinc-500" />
            <CardTitle className="text-xl font-bold text-white">Global Configuration</CardTitle>
          </div>
          <CardDescription className="text-zinc-500 text-sm">Manage your platform's branding and layout settings.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-12">
          {/* Branding Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-zinc-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">Branding</h3>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="logo" className="text-zinc-400">Logo Image URL</Label>
                <div className="flex gap-4">
                  <Input 
                    id="logo"
                    placeholder="https://example.com/logo.png"
                    className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-12"
                    value={localSettings.logoUrl}
                    onChange={(e) => setLocalSettings({ ...localSettings, logoUrl: e.target.value })}
                  />
                  {localSettings.logoUrl && (
                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      <img src={localSettings.logoUrl} alt="Preview" className="w-8 h-8 object-contain" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ayat Number Frames Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-4 h-4 text-zinc-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-600">Verse Numbering Style</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {AYAT_FRAMES.map((frame) => (
                <button
                  key={frame.id}
                  onClick={() => setLocalSettings({ ...localSettings, ayatFrameId: frame.id })}
                  className={cn(
                    "flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all group",
                    localSettings.ayatFrameId === frame.id 
                      ? "bg-zinc-900 border-zinc-500 shadow-lg" 
                      : "bg-zinc-950 border-zinc-900 hover:border-zinc-700"
                  )}
                >
                  <AyatFrame number={7} frameId={frame.id} size="lg" />
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-tight text-center",
                    localSettings.ayatFrameId === frame.id ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"
                  )}>
                    {frame.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Section */}
          <div className="space-y-6">
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
          </div>
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
