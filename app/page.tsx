import Link from "next/link";

export default function HomePage() {
  return (
    <div className="text-center py-24">
      <h1 className="text-4xl font-semibold mb-4">🎬 Open Watchlist</h1>
      <p className="text-gray-600 mb-8">Add movies, mark as watched, and rate — no login required.</p>
      <Link href="/dashboard" className="inline-block bg-black text-white px-5 py-3 rounded-2xl">Go to dashboard</Link>
    </div>
  );
}
