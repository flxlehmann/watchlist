export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getList, now, saveList, toPublicList, type Item, type List } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';

const LIST_ID = 'single';
const LIST_PASSWORD = 'Test123456';

async function getOrCreateList(): Promise<List> {
  const existing = await getList(LIST_ID);
  if (existing) return existing;

  const list: List = {
    id: LIST_ID,
    name: 'Single List',
    items: [],
    updatedAt: now(),
    passwordHash: await hashPassword(LIST_PASSWORD)
  };
  await saveList(list);
  return list;
}

async function authorize(req: NextRequest): Promise<List | NextResponse> {
  const list = await getOrCreateList();
  const password = req.headers.get('x-list-password') ?? '';
  const valid = await verifyPassword(password, list.passwordHash ?? '');

  if (!valid) {
    return NextResponse.json({ error: 'Access denied: incorrect password.' }, { status: 401 });
  }

  return list;
}

export async function GET(req: NextRequest) {
  const list = await authorize(req);
  if (list instanceof NextResponse) return list;
  return NextResponse.json(toPublicList(list));
}

export async function POST(req: NextRequest) {
  const list = await authorize(req);
  if (list instanceof NextResponse) return list;

  const payload = await req.json().catch(() => ({}));
  const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 140) : '';
  if (!title) return NextResponse.json({ error: 'Title required.' }, { status: 422 });

  const item: Item = {
    id: crypto.randomUUID(),
    title,
    watched: false,
    createdAt: now(),
    updatedAt: now()
  };

  list.items.unshift(item);
  list.updatedAt = now();
  await saveList(list);
  return NextResponse.json(toPublicList(list));
}

export async function PATCH(req: NextRequest) {
  const list = await authorize(req);
  if (list instanceof NextResponse) return list;

  const payload = await req.json().catch(() => ({}));
  const itemId = typeof payload.itemId === 'string' ? payload.itemId : '';
  const watched = typeof payload.watched === 'boolean' ? payload.watched : null;

  if (!itemId || watched === null) {
    return NextResponse.json({ error: 'itemId and watched are required.' }, { status: 422 });
  }

  const item = list.items.find(entry => entry.id === itemId);
  if (!item) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });

  item.watched = watched;
  item.updatedAt = now();
  list.updatedAt = now();
  await saveList(list);
  return NextResponse.json(toPublicList(list));
}

export async function DELETE(req: NextRequest) {
  const list = await authorize(req);
  if (list instanceof NextResponse) return list;

  const payload = await req.json().catch(() => ({}));
  const itemId = typeof payload.itemId === 'string' ? payload.itemId : '';

  if (!itemId) return NextResponse.json({ error: 'itemId required.' }, { status: 422 });

  const before = list.items.length;
  list.items = list.items.filter(item => item.id !== itemId);
  if (before === list.items.length) {
    return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  }

  list.updatedAt = now();
  await saveList(list);
  return NextResponse.json(toPublicList(list));
}
