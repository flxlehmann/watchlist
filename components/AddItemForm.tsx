'use client';
import { useState } from "react";
import Input from "./Input";
import Button from "./Button";
import { mutate } from "swr";

export default function AddItemForm({ listId }: { listId: string }) {
  const [title, setTitle] = useState("");
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch(`/api/lists/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const json = await res.json();
    if (json.ok) {
      setTitle("");
      mutate(`/api/lists/${listId}`);
    } else {
      alert(json.error || "Failed to add");
    }
  };
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input placeholder="Add a movie title…" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button type="submit">Add</Button>
    </form>
  );
}
