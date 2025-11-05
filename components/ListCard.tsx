'use client';
import Link from "next/link";
import Button from "./Button";

export default function ListCard({ id, name }: { id: string; name: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-gray-500">{id}</div>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/l/${id}`}>
          <Button variant="ghost">Open</Button>
        </Link>
      </div>
    </div>
  );
}
