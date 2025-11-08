export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { newId, now, saveList, toPublicList, type List } from '@/lib/db';
import { hashPassword } from '@/lib/password';
export async function POST(req: NextRequest){
  const { name, password } = await req.json().catch(() => ({ name: '' }));
  const id = newId();
  const trimmedName = name?.toString()?.trim() || 'Watchlist';
  const trimmedPassword = typeof password === 'string' ? password.trim() : '';
  const passwordHash = trimmedPassword ? await hashPassword(trimmedPassword) : undefined;
  const list: List = {
    id,
    name: trimmedName,
    items: [],
    updatedAt: now(),
    passwordHash
  };
  await saveList(list);
  return NextResponse.json(toPublicList(list), { status: 201 });
}
