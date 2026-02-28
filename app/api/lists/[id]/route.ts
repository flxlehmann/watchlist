export const runtime = 'edge';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'List management has been removed.' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'List management has been removed.' }, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json({ error: 'List management has been removed.' }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'List management has been removed.' }, { status: 410 });
}
