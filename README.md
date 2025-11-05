# Watchlists (Upstash + Next.js)

v15.4
- **Removed ratings** entirely (types, APIs, UI).
- **Animated progress bar** for watched percentage (CSS `transition: width .35s ease`).
- Kept: Upstash Redis storage, autocomplete via TMDB, hourly auto-sync, manual Sync button, posters, unified icon buttons with role colors on hover only.

Env:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TMDB_API_KEY`
