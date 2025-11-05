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
  const { title, rating, addedBy, poster } = await req.json();
  const item: Item = {
    id: crypto.randomUUID(),
    title: String(title || '').trim().slice(0, 140),
    rating: typeof rating === 'number' ? Math.max(0, Math.min(5, rating)) : undefined,
    watched: false,
    addedBy: addedBy ? String(addedBy).slice(0, 40) : undefined,
    poster: poster ? String(poster) : undefined,
    createdAt: now(),
    updatedAt: now()
  };
  if(!item.title) return NextResponse.json({ error: 'Title required' }, { status: 422 });
  list.items.unshift(item);
  list.updatedAt = now();
  await saveList(list);
  return NextResponse.json(list);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string }}){
  const list = await getList(params.id);
  if(!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { itemId, title, rating, watched, poster } = await req.json();
  const idx = list.items.findIndex(i => i.id === itemId);
  if(idx === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  const item = list.items[idx];
  if(typeof title === 'string') item.title = title.trim().slice(0, 140);
  if(typeof rating === 'number') item.rating = Math.max(0, Math.min(5, rating));
  if(typeof watched === 'boolean') item.watched = watched;
  if(typeof poster === 'string' || poster === null) item.poster = poster || undefined;
  item.updatedAt = now();
  list.items[idx] = item;
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
