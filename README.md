# Watchlists (Next.js + Upstash Redis)

**v16.0 (clean layout)**

- Single **app/** folder at project root (no nested `app/app`).
- Types updated to include **releaseYear** on `Item`.
- Autocomplete anchored width, posters, unified dark icon buttons (color on hover).
- Filter row: watched/unwatched chips + sort (date added / release year).
- Grid/List toggle on filter row (right).
- Hourly auto-sync; manual Sync button; times show HH:MM.
- Footer shows Share link and list ID.

## Env
Create `.env.local`:

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TMDB_API_KEY=
```

## Deploy
Push to Vercel (Next.js). Attach an Upstash Redis database and set env vars above.


---

**v16.1**

- Fixed TMDB search URL.
- Completed Redis data layer (`lib/db.ts`).
- Completed REST routes for items (add/toggle/delete) and list rename.
- Implemented filters (watched/unwatched), sorting (date added / release year), grid/list views.
- Unified dark icon buttons + improved styles.
- Hourly autosync + manual Sync.

- **v16.1.1** Hotfix: fixed TypeScript build error in Unwatched chip onClick.
