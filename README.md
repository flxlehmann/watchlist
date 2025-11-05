# Watchlists (Upstash + Next.js)

v15: Unified buttons + prominent stats
- All buttons now use the same `.iconbtn` style/size.
- Colors by role:
  - Sync = blue (`RefreshCw`)
  - Leave = red (`LogOut`)
  - Add = green (`Plus`)
  - Watched = green (`Eye`)
  - Remove = red (`Trash2`)
- Icons are centered inside buttons.
- Stats moved to header with a progress bar for watched %.

Env:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TMDB_API_KEY`
