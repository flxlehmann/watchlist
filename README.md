# Watchlists (Upstash + Next.js)

v12: UI polish (per your spec)
- **Trash can** remove button (small icon).
- **Eye** button to toggle watched.
- **Watched rows** get a darkish green tint and subtle text lighten.

Also includes:
- TMDB-based autocomplete + posters.
- Hourly auto-sync + manual Sync button.

Install:
```bash
npm i
npm run dev
```
Deploy to Vercel with env vars:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TMDB_API_KEY`
