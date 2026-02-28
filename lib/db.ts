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

type Store = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<void>;
  del: (key: string) => Promise<void>;
};

const memoryStore = new Map<string, unknown>();

function getStore(): Store {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const redis = Redis.fromEnv();
    return {
      get: key => redis.get(key),
      set: (key, value) => redis.set(key, value).then(() => undefined),
      del: key => redis.del(key).then(() => undefined)
    };
  }

  return {
    get: async <T>(key: string) => (memoryStore.get(key) as T | undefined) ?? null,
    set: async (key: string, value: unknown) => {
      memoryStore.set(key, value);
    },
    del: async (key: string) => {
      memoryStore.delete(key);
    }
  };
}

const key = (id: string) => `list:${id}`;

export async function getList(id: string): Promise<List | null> {
  return (await getStore().get<List>(key(id))) ?? null;
}

export async function saveList(list: List): Promise<void> {
  await getStore().set(key(list.id), list);
}

export async function deleteList(id: string): Promise<void> {
  await getStore().del(key(id));
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

export function now() {
  return Date.now();
}
