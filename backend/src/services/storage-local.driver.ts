import { existsSync, mkdirSync, promises as fsPromises, createReadStream, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import type {
  StorageDriver,
  StorageObjectInfo,
  StoragePutObject,
} from './storage.service.js';

export interface LocalFsDriverOptions {
  rootDir: string;
  publicBaseUrl?: string | undefined;
}

export function createLocalFsDriver(options: LocalFsDriverOptions): StorageDriver {
  const root = resolve(options.rootDir);
  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true });
  }

  function pathFor(key: string): string {
    if (key.includes('..')) throw new Error(`illegal key: ${key}`);
    return join(root, key);
  }

  return {
    name: 'local-fs',
    async putObject(input: StoragePutObject): Promise<StorageObjectInfo> {
      const fullPath = pathFor(input.key);
      mkdirSync(dirname(fullPath), { recursive: true });
      const body = await streamToBuffer(input.body);
      await fsPromises.writeFile(fullPath, body);
      const stat = statSync(fullPath);
      return {
        key: input.key,
        size: stat.size,
        contentType: input.contentType,
        lastModified: stat.mtime,
        metadata: input.metadata,
      };
    },

    async getObject(key: string): Promise<{ body: Readable; info: StorageObjectInfo }> {
      const fullPath = pathFor(key);
      if (!existsSync(fullPath)) throw new Error(`object not found: ${key}`);
      const stat = statSync(fullPath);
      const info: StorageObjectInfo = {
        key,
        size: stat.size,
        contentType: 'application/octet-stream',
        lastModified: stat.mtime,
      };
      return { body: createReadStream(fullPath), info };
    },

    async headObject(key: string): Promise<StorageObjectInfo | null> {
      const fullPath = pathFor(key);
      if (!existsSync(fullPath)) return null;
      const stat = statSync(fullPath);
      return {
        key,
        size: stat.size,
        contentType: 'application/octet-stream',
        lastModified: stat.mtime,
      };
    },

    async deleteObject(key: string): Promise<void> {
      const fullPath = pathFor(key);
      if (existsSync(fullPath)) await fsPromises.rm(fullPath, { force: true });
    },

    async presignGet(key: string, _ttlSeconds: number): Promise<string> {
      const base = options.publicBaseUrl ?? '/';
      return `${base.replace(/\/$/, '')}/${key}`;
    },

    async presignPut(_key: string, _ttlSeconds: number): Promise<string> {
      throw new Error('presigned PUT not supported by local-fs driver');
    },
  };
}

async function streamToBuffer(body: Buffer | Readable): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}
