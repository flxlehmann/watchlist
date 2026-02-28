export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toString().trim();
  if (!q) return NextResponse.json({ results: [] });

  const key = process.env.TMDB_API_KEY;
  if (!key) {
    return NextResponse.json({ results: [] });
  }

  const url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1`;
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) {
    return NextResponse.json({ results: [] });
  }

  const data = await r.json();
  const base = 'https://image.tmdb.org/t/p/w500';
  const results = Array.isArray(data?.results)
    ? data.results.slice(0, 8).map((m: { id: number; title?: string; original_title?: string; release_date?: string; poster_path?: string }) => ({
        id: m.id,
        title: m.title || m.original_title || '',
        year: (m.release_date || '').slice(0, 4) || undefined,
        poster: m.poster_path ? `${base}${m.poster_path}` : undefined,
        releaseDate: m.release_date || undefined
      }))
    : [];

  return NextResponse.json({ results });
}
