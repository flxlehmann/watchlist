# Watchlists (Upstash + Next.js)

v14: Input row + plus icon
- Movie and name inputs share one row.
- Add button is now icon-only plus (white), same height as inputs, accent-green background.
- Keeps autocomplete aligned under the title input.

Includes previous features:
- Lucide icons, watched toggle, trash
- Dark-green tint for watched items
- Stats in footer
- TMDB autocomplete + posters
- Hourly auto-sync + manual Sync button

Env:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TMDB_API_KEY`
