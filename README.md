# Watchlists

Lightweight shared watchlists on Vercel with **Upstash Redis**.

## Deploy
1. Create a Vercel project (Next.js, App Router).
2. Create an Upstash Redis database.
3. Add env vars in Vercel (or `.env.local`):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy and open the app. Create a list and share the `?list=ABCD1234` link.

## Notes
- 1.5s polling for near‑real‑time sync; simple and robust on serverless/edge.
- Data stored under Redis keys `list:{id}`. Add TTLs with `set(..., { ex: seconds })` if you want cleanup.
- For push updates later, consider an SSE route with Upstash Redis Pub/Sub.
