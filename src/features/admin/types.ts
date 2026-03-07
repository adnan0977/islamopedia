
export type AdminTab = 'dashboard' | 'channels' | 'videos' | 'scholars' | 'quran-tools' | 'settings';

export interface SyncState {
  isSyncing: boolean;
  progress: number;
  status: 'idle' | 'fetching' | 'saving' | 'success' | 'error';
}
