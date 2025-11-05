'use client';
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full border-b border-gray-200">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold">🎬 Watchlist</Link>
        <nav className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm hover:underline">Dashboard</Link>
        </nav>
      </div>
    </header>
  );
}
