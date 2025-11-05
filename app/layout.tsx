import "./globals.css";
import { ReactNode } from "react";
import Header from "../components/Header";

export const metadata = {
  title: "Watchlist (Open)",
  description: "Open watchlist (Next.js + Upstash)"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
