
"use client";

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { QuranHub } from '@/features/admin/components/QuranHub';

export default function AdminQuranPage() {
  const db = useFirestore();
  const editionsQuery = useMemoFirebase(() => query(collection(db, 'quran_editions'), limit(1000)), [db]);
  const { data: editions } = useCollection(editionsQuery);

  const [sync, setSync] = useState({ isSyncing: false, progress: 0, status: 'idle' });

  return (
    <QuranHub 
      editions={editions || []} 
      syncing={sync.isSyncing} 
      setSyncing={(val) => setSync(prev => ({ ...prev, isSyncing: val }))}
      progress={sync.progress}
      setProgress={(val) => setSync(prev => ({ ...prev, progress: val }))}
      status={sync.status}
      setSyncStatus={(val) => setSync(prev => ({ ...prev, status: val }))}
    />
  );
}
