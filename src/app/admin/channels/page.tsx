
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { ChannelHub } from '@/features/admin/components/ChannelHub';

export default function AdminChannelsPage() {
  const db = useFirestore();
  const videosQuery = useMemoFirebase(() => query(collection(db, 'videos'), limit(1000)), [db]);
  const { data: videos } = useCollection(videosQuery);

  return <ChannelHub videos={videos || []} />;
}
