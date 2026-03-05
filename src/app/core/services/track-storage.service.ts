import { Injectable } from '@angular/core';
import { GpxTrack } from '../../shared/models/track.model';

const DB_NAME = 'weather-route-advisor';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

@Injectable({ providedIn: 'root' })
export class TrackStorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async save(track: GpxTrack): Promise<void> {
    if (!this.db) await this.init().catch(() => null);
    if (!this.db) { this.saveToLocalStorage(track); return; }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(track);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve();
    });
  }

  async getAll(): Promise<GpxTrack[]> {
    if (!this.db) await this.init().catch(() => null);
    if (!this.db) return this.getFromLocalStorage();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as GpxTrack[]);
    });
  }

  async delete(id: string): Promise<void> {
    if (!this.db) await this.init().catch(() => null);
    if (!this.db) { this.deleteFromLocalStorage(id); return; }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve();
    });
  }

  private saveToLocalStorage(track: GpxTrack): void {
    const tracks = this.getFromLocalStorage();
    const idx = tracks.findIndex((t) => t.id === track.id);
    if (idx >= 0) tracks[idx] = track;
    else tracks.push(track);
    localStorage.setItem('gpx-tracks', JSON.stringify(tracks));
  }

  private getFromLocalStorage(): GpxTrack[] {
    try {
      return JSON.parse(localStorage.getItem('gpx-tracks') ?? '[]') as GpxTrack[];
    } catch {
      return [];
    }
  }

  private deleteFromLocalStorage(id: string): void {
    const tracks = this.getFromLocalStorage().filter((t) => t.id !== id);
    localStorage.setItem('gpx-tracks', JSON.stringify(tracks));
  }
}
