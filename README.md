# Watchlists (Upstash + Next.js)

Changes in v8:
- Auto-sync reduced to **once per hour** to minimize database requests.
- Added a **Sync** button in the header to fetch updates on demand.
- Shows **Last synced** time in the toolbar when in a list.

Env vars:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
