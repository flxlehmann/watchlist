# Watchlist (GitHub + Vercel)

**What this is**: A static web app with a Vercel Serverless Function that uses **Upstash Redis** for syncing state between clients.

## Deploy with GitHub + Vercel

1. **Create a new GitHub repo** and add these files.
   - Or unzip and push the folder.
2. **Import the repo on Vercel** (vercel.com → Add New → Project → Import Git Repository).
3. In **Project Settings → Environment Variables**, add:
   - `UPSTASH_REDIS_REST_URL` → from your Upstash Redis database
   - `UPSTASH_REDIS_REST_TOKEN` → from Upstash
   (Create a free Upstash Redis at upstash.com, then copy the REST URL + TOKEN.)
4. Deploy. Vercel will serve:
   - Static files (`index.html`, `style.css`, `app.js`)
   - Serverless endpoint at `/api/rooms/[id]`

## Use

- Create or join a human-readable room (e.g., `mint-otter-42`), then add movies.
- The app polls the function every 2s and uses POST for mutations.
- Autocomplete & posters use the iTunes Search API (no key).

## Notes

- If you'd like TMDB-based autocomplete instead of iTunes, I can ship a variant that reads a TMDB key from an env var or an in-app Settings modal.
- CORS is `*` to keep it simple; tighten if needed.
