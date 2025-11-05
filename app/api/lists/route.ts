export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { newId, now, saveList, type List } from '@/lib/db';
export async function POST(req: NextRequest){
  const { name } = await req.json().catch(() => ({ name: '' }));
  const id = newId();
  const list: List = { id, name: name?.toString()?.trim() || 'Watchlist', items: [], updatedAt: now() };
  await saveList(list);
  return NextResponse.json(list, { status: 201 });
}
