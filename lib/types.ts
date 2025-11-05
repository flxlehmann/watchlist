export type List = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type ListItem = {
  id: string;
  listId: string;
  title: string;
  addedBy?: string; // optional in open mode
  createdAt: number;
  watched: boolean;
  rating?: number; // 0-5
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
