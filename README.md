# Watchlist (Single Protected List)

This app now exposes exactly one watchlist protected by a fixed password gate.

## Password

`Test123456`

## Behavior

- Visiting the site immediately shows a password form.
- Only the correct password unlocks the list.
- Incorrect passwords are denied.
- There is no list creation, deletion, renaming, or password-management flow.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.
