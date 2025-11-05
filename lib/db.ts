import { kv } from '@vercel/kv';
export type Item = { id: string; title: string; rating?: number; watched: boolean; addedBy?: string; createdAt: number; updatedAt: number; };
export type List = { id: string; name: string; items: Item[]; updatedAt: number; };
const key = (id: string) => `list:${id}`;
export async function getList(id: string): Promise<List | null> { return (await kv.get<List>(key(id))) ?? null; }
export async function saveList(list: List): Promise<void> { await kv.set(key(list.id), list); }
export function newId(len = 8) { const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; const arr = new Uint32Array(len); crypto.getRandomValues(arr); return Array.from(arr, n => alphabet[n % alphabet.length]).join(''); }
export function now(){ return Date.now(); }