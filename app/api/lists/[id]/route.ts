export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { getList, saveList, now, type Item } from '@/lib/db';

function normalizeTitle(value: string): string {
  return value.replace(/\s*\(\d{4}\)$/u, '').trim().toLowerCase();
}
export async function GET(_req: NextRequest, { params }: { params: { id: string }}){
  const list = await getList(params.id);
  if(!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(list);
}
export async function POST(req: NextRequest, { params }: { params: { id: string }}){
  const list = await getList(params.id);
  if(!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { title, addedBy, poster, runtimeMinutes, releaseDate } = await req.json();
  const runtimeValue =
    typeof runtimeMinutes === 'number' && Number.isFinite(runtimeMinutes)
      ? Math.max(0, Math.round(runtimeMinutes))
      : undefined;
  const releaseValue =
    typeof releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(releaseDate.trim())
      ? releaseDate.trim()
      : undefined;
  const item: Item = {
    id: crypto.randomUUID(),
    title: String(title || '').trim().slice(0, 140),
    watched: false,
    addedBy: addedBy ? String(addedBy).slice(0, 40) : undefined,
    poster: poster ? String(poster) : undefined,
    runtimeMinutes: runtimeValue,
    releaseDate: releaseValue,
    createdAt: now(),
    updatedAt: now()
  };
  if(!item.title) return NextResponse.json({ error: 'Title required' }, { status: 422 });
  const normalizedIncoming = normalizeTitle(item.title);
  const hasDuplicate = list.items.some(existing => {
    if (normalizeTitle(existing.title) !== normalizedIncoming) {
      return false;
    }
    if (item.releaseDate && existing.releaseDate) {
      return existing.releaseDate === item.releaseDate;
    }
    return true;
  });
  if(hasDuplicate){
    return NextResponse.json({ error: 'That movie is already on this watchlist.' }, { status: 409 });
  }
  list.items.unshift(item);
  list.updatedAt = now();
  await saveList(list);
  return NextResponse.json(list);
}
export async function PATCH(req: NextRequest, { params }: { params: { id: string }}){
  const list = await getList(params.id);
  if(!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const payload = await req.json();
  if(typeof payload.name === 'string' && !payload.itemId){
    const name = payload.name.trim().slice(0, 80);
    if(!name){
      return NextResponse.json({ error: 'Name required' }, { status: 422 });
    }
    list.name = name;
    list.updatedAt = now();
    await saveList(list);
    return NextResponse.json(list);
  }
  const { itemId, title, watched, poster, runtimeMinutes, releaseDate } = payload;
  const idx = list.items.findIndex(i => i.id === itemId);
  if(idx === -1) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  const item = list.items[idx];
  if(typeof title === 'string') item.title = title.trim().slice(0, 140);
  if(typeof watched === 'boolean') item.watched = watched;
  if(typeof poster === 'string' || poster === null) item.poster = poster || undefined;
  if(typeof runtimeMinutes === 'number' && Number.isFinite(runtimeMinutes)){
    item.runtimeMinutes = Math.max(0, Math.round(runtimeMinutes));
  }
  if(runtimeMinutes === null){
    item.runtimeMinutes = undefined;
  }
  if(typeof releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(releaseDate.trim())){
    item.releaseDate = releaseDate.trim();
  }
  if(releaseDate === null){
    item.releaseDate = undefined;
  }
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
