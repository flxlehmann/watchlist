'use client';
import { useState } from "react";
import Input from "./Input";
import Button from "./Button";
import { mutate } from "swr";

export default function CreateListForm() {
  const [name, setName] = useState("");
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (json.ok) {
      setName("");
      mutate("/api/lists");
    } else {
      alert(json.error || "Failed to create list");
    }
  };
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input placeholder="New list name…" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit">Create</Button>
    </form>
  );
}
