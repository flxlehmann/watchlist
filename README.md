# Watchlists 1.0

A collaborative watchlist app for planning film nights without the usual friction. Create a list in seconds, invite friends with a single link, and keep track of what everyone wants to stream next. Release **1.0** focuses on polish, reliability, and a mobile-friendly experience so the app feels as good on the couch as it does on a desktop.

## Highlights

- ⚡️ Instant list creation with optional password protection for private groups.
- 🔄 Real-time syncing and conflict-safe updates backed by Upstash Redis.
- 🎯 Smart tools for sorting, filtering, and surfacing unwatched titles.
- 📱 Responsive layout tuned for smartphones and small tablets.
- 🔒 Password workflows with contextual dialogs to protect or remove access.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000 in your browser to start collaborating on watchlists.

> **Tip:** The landing page offers a quick-start option that spins up a sample list so you can explore the experience instantly.

## Production Builds

```bash
npm run build
npm run start
```

These commands compile the Next.js app for production and boot a server that mirrors the deployed behavior.

## Deployment

The project is configured for Vercel. The included `vercel.json` file ensures the correct build command (`npm run build`) and output directory (`.next`). Push to a connected Git repository or use the Vercel CLI to deploy.

## Tech Stack

- [Next.js 14](https://nextjs.org) with the App Router
- [React 18](https://react.dev)
- [TypeScript 5](https://www.typescriptlang.org)
- [Upstash Redis](https://upstash.com) for storage
- [lucide-react](https://lucide.dev) for icons

## Mobile Experience

Release 1.0 ships refinements to spacing, typography, and controls so the interface scales gracefully down to 320 px wide screens. Buttons, dialogs, and notifications now adapt to narrow viewports, making it easy to manage watchlists from a phone.

## License

This repository is distributed under the MIT License. See the [LICENSE](LICENSE) file if present for details.
