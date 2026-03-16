
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { DashboardOverview } from '@/features/admin/components/DashboardOverview';

export default function AdminDashboardPage() {
  const db = useFirestore();

  // Real Data Queries for Dashboard
  const channelsQuery = useMemoFirebase(() => query(collection(db, 'channels'), limit(1000)), [db]);
  const { data: channels } = useCollection(channelsQuery);

  const videosQuery = useMemoFirebase(() => query(collection(db, 'videos'), limit(1000)), [db]);
  const { data: videos } = useCollection(videosQuery);

  const speakersQuery = useMemoFirebase(() => query(collection(db, 'speakers'), limit(1000)), [db]);
  const { data: speakers } = useCollection(speakersQuery);

  const editionsQuery = useMemoFirebase(() => query(collection(db, 'quran_editions'), limit(1000)), [db]);
  const { data: editions } = useCollection(editionsQuery);

  return (
    <DashboardOverview 
      channels={channels || []} 
      videos={videos || []} 
      speakers={speakers || []} 
      editions={editions || []} 
    />
  );
}
