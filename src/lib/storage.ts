import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

/**
 * Robust IndexedDB PersistStorage for Zustand with automatic migration from localStorage
 * and graceful fallback to localStorage when IndexedDB is unavailable (e.g. in test envs).
 */
export const indexedDBStorage: PersistStorage<any> = {
  getItem: async (name: string): Promise<StorageValue<any> | null> => {
    // 1. Check if legacy localStorage data exists (migration path)
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        const localData = localStorage.getItem(name);
        if (localData) {
          const parsed = JSON.parse(localData);
          try {
            await set(name, localData);
            localStorage.removeItem(name);
          } catch {
            // Keep in localStorage if IndexedDB write fails
          }
          return parsed;
        }
      } catch (err) {
        console.warn('LocalStorage migration read failed:', err);
      }
    }

    // 2. Read from IndexedDB
    try {
      const value = await get<string>(name);
      return value ? JSON.parse(value) : null;
    } catch {
      // Fallback to localStorage
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const fallback = localStorage.getItem(name);
        return fallback ? JSON.parse(fallback) : null;
      }
      return null;
    }
  },

  setItem: async (name: string, value: StorageValue<any>): Promise<void> => {
    try {
      await set(name, JSON.stringify(value));
    } catch {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        localStorage.setItem(name, JSON.stringify(value));
      }
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await del(name);
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      localStorage.removeItem(name);
    }
  }
};
