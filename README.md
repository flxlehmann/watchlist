# Watchlists (Upstash + Next.js)

Changes in v7:
- **No more auto-join** from localStorage. The main screen shows if the URL has no `?list=` param.
- **Leave** button removes `?list`, clears localStorage, and returns to the main screen.
- Optional **Resume last list** button is shown if a previous list ID exists.

Env vars:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
