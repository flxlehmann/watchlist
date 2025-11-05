# Watchlists (Upstash + Next.js)

v15.1: Fix build error
- Corrected a JSX conditional (`!list && (...)`) that caused a syntax error during build.
- All v15 features remain: unified icon buttons, colored roles, header stats with progress bar.

Env:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TMDB_API_KEY`
