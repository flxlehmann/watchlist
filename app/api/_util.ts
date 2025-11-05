import { redis, keys } from "../../lib/redis";
import { newId } from "../../lib/ids";
import type { List, ListItem } from "../../lib/types";

export async function createList(name: string): Promise<List> {
  const id = newId();
  const now = Date.now();
  const list: List = { id, name, createdAt: now, updatedAt: now };
  await Promise.all([
    redis.set(keys.list(id), JSON.stringify(list)),
    redis.sadd(keys.appLists, id)
  ]);
  return list;
}

export async function getAllLists() {
  const ids = await redis.smembers<string>(keys.appLists);
  if (!ids || ids.length === 0) return [];
  const data = await Promise.all(ids.map(async (id) => {
    const raw = await redis.get<string>(keys.list(id));
    return raw ? JSON.parse(raw) as List : null;
  }));
  return data.filter(Boolean);
}

export async function getListWithItems(listId: string) {
  const [listRaw, itemIds] = await Promise.all([
    redis.get<string>(keys.list(listId)),
    redis.zrange<string>(keys.listItems(listId), 0, -1),
  ]);
  if (!listRaw) return null;
  const list = JSON.parse(listRaw) as List;
  const items = (await Promise.all(
    itemIds.map(async (id) => {
      const raw = await redis.get<string>(keys.item(id));
      return raw ? JSON.parse(raw) as ListItem : null;
    })
  )).filter(Boolean);
  return { list, items };
}

export async function addItem(listId: string, title: string): Promise<ListItem> {
  const id = newId();
  const now = Date.now();
  const item: ListItem = { id, listId, title, createdAt: now, watched: false };
  await Promise.all([
    redis.set(keys.item(id), JSON.stringify(item)),
    redis.zadd(keys.listItems(listId), { member: id, score: now }),
  ]);
  await redis.hincrby("stats:items", "count", 1).catch(() => {});
  return item;
}

export async function updateItem(listId: string, itemId: string, patch: Partial<ListItem>) {
  const raw = await redis.get<string>(keys.item(itemId));
  if (!raw) return null;
  const item = JSON.parse(raw) as ListItem;
  if (item.listId !== listId) return null;
  const next = { ...item, ...patch };
  await redis.set(keys.item(itemId), JSON.stringify(next));
  return next;
}

export async function removeItem(listId: string, itemId: string) {
  const raw = await redis.get<string>(keys.item(itemId));
  if (!raw) return false;
  const item = JSON.parse(raw) as ListItem;
  if (item.listId !== listId) return false;
  await Promise.all([
    redis.del(keys.item(itemId)),
    redis.zrem(keys.listItems(listId), itemId),
  ]);
  return true;
}
