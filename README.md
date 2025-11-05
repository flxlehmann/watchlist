# Watchlist (Open — No Auth)

Public/open version of the collaborative watchlist. No login required — useful for private/self-hosted deployments.

## Features
- Create multiple watchlists
- Add / remove movies
- Mark as watched
- Rate 0–5 stars
- Copy/share list URL (no invites)
- Upstash Redis (REST) + Vercel friendly
- TypeScript, Tailwind, SWR

## Quickstart
1) Create an **Upstash Redis** DB and copy REST URL + TOKEN.
2) Copy env:
```bash
cp .env.example .env.local
```
3) Install & run:
```bash
pnpm i
pnpm dev
```
4) Deploy to **Vercel** and set the same envs in Project Settings → Environment Variables.

## Data Model (Redis keys)
- `app:lists` -> SET of listIds
- `list:{listId}` -> JSON list
- `list:{listId}:items` -> ZSET of itemIds (score = timestamp)
- `item:{itemId}` -> JSON movie item

> Everything is world-readable/writeable because there’s no auth. If you put this on the public internet, consider adding simple admin protection (basic auth or IP restriction) or re-enable OAuth.
