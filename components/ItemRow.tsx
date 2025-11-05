'use client';
import { useState } from "react";
import Button from "./Button";
import Rating from "./Rating";
import { mutate } from "swr";

type Item = {
  id: string;
  title: string;
  watched: boolean;
  rating?: number;
};

export default function ItemRow({ listId, item }: { listId: string; item: Item }) {
  const [busy, setBusy] = useState(false);

  const patch = async (body: any) => {
    setBusy(true);
    const res = await fetch(`/api/lists/${listId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const json = await res.json();
    if (!json.ok) alert(json.error || "Update failed");
    mutate(`/api/lists/${listId}`);
  };

  const remove = async () => {
    if (!confirm("Remove this item?")) return;
    setBusy(true);
    const res = await fetch(`/api/lists/${listId}/items/${item.id}`, { method: "DELETE" });
    setBusy(false);
    const json = await res.json();
    if (!json.ok) alert(json.error || "Delete failed");
    mutate(`/api/lists/${listId}`);
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 p-3">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={item.watched}
          onChange={(e) => patch({ watched: e.target.checked })}
        />
        <span className={item.watched ? "line-through text-gray-500" : ""}>{item.title}</span>
      </div>
      <div className="flex items-center gap-3">
        <Rating value={item.rating || 0} onChange={(v) => patch({ rating: v })} />
        <Button variant="ghost" onClick={remove} disabled={busy} aria-label="Delete">🗑️</Button>
      </div>
    </div>
  );
}
