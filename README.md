# Watchlist — Vercel + Upstash (Manual Sync)

This repo is ready for **GitHub → Vercel**. It serves static files from **/public** and a serverless endpoint at **/api/rooms** that stores state in **Upstash Redis**.

## Deploy
1. Push this folder to a new GitHub repo.
2. In Vercel: **Add New Project → Import Git Repository**.
3. In **Project → Settings → Environment Variables**, add:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy. If needed, set **Framework preset: Other** and **Output Directory: public**.

## API
- GET `/api/rooms?id=<room>` → `{ version, items }`
- POST `/api/rooms?id=<room>` with `{ baseVersion, mutation }` → updated state

## App behavior
- **Manual sync only**: Nothing hits the API until you press **Sync now**.
- Create or join a human-readable room (e.g., `mint-otter-42`).
- Add movies locally, then press **Sync now** to push/pull.
- Autocomplete uses iTunes Search (no key). Posters fall back to a placeholder on failure.

If you prefer TMDB-based autocomplete, realtime push sync, or auth, say the word and I’ll ship a variant.
