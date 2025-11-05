import { Redis } from '@upstash/redis';

export type Item = {
  id: string;
  title: string;
  watched: boolean;
  addedBy?: string;
  poster?: string;
  releaseYear?: number;
  createdAt: number;
  updatedAt: number;
};

export type List = {
  id: string;
  name: string;
  items: Item[];
  updatedAt: number;
};

const redis = Redis.fromEnv();

const PREFIX = 'wl:';
const key = (id: string) => `${PREFIX}${id}`;

export async function getList(id: string): Promise<List | null> {
  if (!id) return null;
  const res = await redis.get<List>(key(id));
  return (res as any) || null;
}

export async function saveList(list: List): Promise<void> {
  await redis.set(key(list.id), list);
}

export async function upsertListName(id: string, name: string): Promise<List> {
  const list = (await getList(id)) || { id, name: 'Watchlist', items: [], updatedAt: Date.now() };
  list.name = (name ?? '').toString().trim().slice(0, 80) || 'Watchlist';
  list.updatedAt = Date.now();
  await saveList(list);
  return list;
}

export function newId(len = 8) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => alphabet[n % alphabet.length]).join('');
}

export function now(){ return Date.now(); }
