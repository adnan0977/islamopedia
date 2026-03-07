'use client';

/**
 * @fileOverview A utility for managing local storage of Quranic editions using IndexedDB.
 */

const DB_NAME = 'QuranOfflineDB';
const DB_VERSION = 1;
const STORE_EDITIONS = 'editions';
const STORE_SURAHS = 'surahs';

export interface OfflineSurah {
  id: string; // {editionId}_surah_{number}
  editionId: string;
  number: number;
  data: any;
}

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_EDITIONS)) {
        db.createObjectStore(STORE_EDITIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SURAHS)) {
        db.createObjectStore(STORE_SURAHS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineSurah(surah: OfflineSurah): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SURAHS, 'readwrite');
    const store = transaction.objectStore(STORE_SURAHS);
    const request = store.put(surah);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineSurah(id: string): Promise<any | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SURAHS, 'readonly');
    const store = transaction.objectStore(STORE_SURAHS);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineEditionStatus(editionId: string): Promise<boolean> {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_SURAHS, 'readonly');
    const store = transaction.objectStore(STORE_SURAHS);
    const index = store.openCursor();
    let found = false;
    index.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        if (cursor.value.editionId === editionId) {
          found = true;
          return resolve(true);
        }
        cursor.continue();
      } else {
        resolve(found);
      }
    };
  });
}
