import type { Readable } from 'node:stream';

export interface StoragePutObject {
  key: string;
  body: Buffer | Readable;
  contentType: string;
  contentLength?: number | undefined;
  metadata?: Record<string, string> | undefined;
}

export interface StorageObjectInfo {
  key: string;
  size: number;
  contentType: string;
  etag?: string | undefined;
  lastModified: Date;
  metadata?: Record<string, string> | undefined;
}

export interface StorageDriver {
  name: string;
  putObject(input: StoragePutObject): Promise<StorageObjectInfo>;
  getObject(key: string): Promise<{ body: Readable; info: StorageObjectInfo }>;
  headObject(key: string): Promise<StorageObjectInfo | null>;
  deleteObject(key: string): Promise<void>;
  presignGet(key: string, ttlSeconds: number): Promise<string>;
  presignPut(key: string, ttlSeconds: number): Promise<string>;
}

let activeDriver: StorageDriver | null = null;

export function setStorageDriver(driver: StorageDriver): void {
  activeDriver = driver;
}

export function getStorageDriver(): StorageDriver {
  if (!activeDriver) {
    throw new Error('storage driver not configured');
  }
  return activeDriver;
}

export function resetStorageDriverForTests(): void {
  activeDriver = null;
}
