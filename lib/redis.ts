import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export const keys = {
  appLists: "app:lists",
  list: (id: string) => `list:${id}`,
  listItems: (id: string) => `list:${id}:items`,
  item: (id: string) => `item:${id}`,
};
