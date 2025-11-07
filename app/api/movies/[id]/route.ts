export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const key = process.env.TMDB_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'TMDB_API_KEY is not set' }, { status: 500 });
  }

  const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}?api_key=${key}&language=en-US`;
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return NextResponse.json({ error: 'Upstream error', detail: text }, { status: response.status });
  }

  const data = await response.json();
  const runtimeMinutes =
    typeof data?.runtime === 'number' && Number.isFinite(data.runtime) && data.runtime > 0
      ? Math.round(data.runtime)
      : null;
  const releaseDate =
    typeof data?.release_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.release_date)
      ? data.release_date
      : null;

  return NextResponse.json({ runtimeMinutes, releaseDate });
}
