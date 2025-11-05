import { Redis } from '@upstash/redis';

export type Item = {
  id: string;
  title: string;
  rating?: number; // 0–5
  watched: boolean;
  addedBy?: string;
  poster?: string; // image URL
  createdAt: number; // ms
  updatedAt: number; // ms
};

export type List = {
  id: string;
  name: string;
  items: Item[];
  updatedAt: number;
};

const redis = Redis.fromEnv();
const key = (id: string) => `list:${id}`;

export async function getList(id: string): Promise<List | null> {
  return (await redis.get<List>(key(id))) ?? null;
}

export async function saveList(list: List): Promise<void> {
  await redis.set(key(list.id), list);
}

export function newId(len = 8) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => alphabet[n % alphabet.length]).join('');
}

export function now(){ return Date.now(); }
