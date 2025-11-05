export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { getList, saveList, now, type Item } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string }}){
  const list = await getList(params.id);
  if(!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest, { params }: { params: { id: string }}){
  const list = await getList(params.id);
  if(!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { title, addedBy, poster, releaseYear } = await req.json();
  const item: Item = {
    id: crypto.randomUUID(),
    title: String(title || '').trim().slice(0, 140),
    watched: false,
    addedBy: addedBy ? String(addedBy).trim().slice(0, 40) : undefined,
    poster: poster ? String(poster) : undefined,
    releaseYear: releaseYear != null ? Number(releaseYear) || undefined : undefined,
    createdAt: now(),
    updatedAt: now(),
  };
  if(!item.title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  list.items.unshift(item);
  list.updatedAt = now();
  await saveList(list);
  return NextResponse.json(list);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}){
  const list = await getList(params.id);
  if(!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await req.json();
  const { itemId, watched, title } = body || {};
  if (itemId) {
    const idx = list.items.findIndex(i => i.id === itemId);
    if (idx === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    if (typeof watched === 'boolean') list.items[idx].watched = watched;
    if (typeof title === 'string') list.items[idx].title = title.trim().slice(0, 140);
    list.items[idx].updatedAt = now();
  } else if (typeof title === 'string') {
    // update list name
    list.name = title.trim().slice(0, 80) || list.name;
  } else {
    return NextResponse.json({ error: 'No changes' }, { status: 400 });
  }
  list.updatedAt = now();
  await saveList(list);
  return NextResponse.json(list);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string }}){
  const list = await getList(params.id);
  if(!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { itemId } = await req.json();
  const before = list.items.length;
  list.items = list.items.filter(i => i.id !== itemId);
  if(list.items.length === before) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  list.updatedAt = now();
  await saveList(list);
  return NextResponse.json(list);
}
