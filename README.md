# Watchlists (Upstash + Next.js)

v10: Autocomplete for real movie titles (TMDB)
- Adds `/api/search` edge route that proxies TMDB search.
- Type in the "Add a movie or show…" field to see suggestions.
- Use arrow keys + Enter, click to pick, or keep typing.

## Setup
Add these environment variables on Vercel (Project → Settings → Environment Variables):
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TMDB_API_KEY` (create one free at https://www.themoviedb.org/settings/api)

No new npm dependencies required.

## Notes
- The proxy keeps your TMDB key server-side.
- We limit suggestions to 8 results, debounced by 250ms, and abort in-flight requests on new input.
