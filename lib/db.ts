import { Redis } from '@upstash/redis';

export type Item = {
  id: string;
  title: string;
  watched: boolean;
  addedBy?: string;
  poster?: string;
  runtimeMinutes?: number;
  releaseDate?: string;
  createdAt: number;
  updatedAt: number;
};

export type List = {
  id: string;
  name: string;
  items: Item[];
  updatedAt: number;
  passwordHash?: string | null;
};

const redis = Redis.fromEnv();
const key = (id: string) => `list:${id}`;

export async function getList(id: string): Promise<List | null> {
  return (await redis.get<List>(key(id))) ?? null;
}

export async function saveList(list: List): Promise<void> {
  await redis.set(key(list.id), list);
}

export async function deleteList(id: string): Promise<void> {
  await redis.del(key(id));
}

export type PublicList = Omit<List, 'passwordHash'> & { protected: boolean };

export function toPublicList(list: List): PublicList {
  const { passwordHash, ...rest } = list;
  return { ...rest, protected: Boolean(passwordHash) };
}

export function newId(len = 8) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => alphabet[n % alphabet.length]).join('');
}

export function now(){ return Date.now(); }
