export const runtime = 'edge';

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Movie search has been removed.' }, { status: 410 });
}
