"use client";
import useSWR from "swr";
import AddItemForm from "../../../components/AddItemForm";
import ItemRow from "../../../components/ItemRow";
import Button from "../../../components/Button";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ListPage({ params }: { params: { id: string } }) {
  const listId = params.id;
  const { data } = useSWR(`/api/lists/${listId}`, fetcher, { refreshInterval: 5000 });
  const list = data?.data?.list;
  const items = data?.data?.items || [];

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard!");
  };

  if (!data) return <div>Loading…</div>;
  if (!list) return <div>List not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{list.name}</h2>
        <Button variant="ghost" onClick={copyLink}>Copy link</Button>
      </div>

      <AddItemForm listId={listId} />

      <div className="grid gap-2">
        {items.length === 0 ? <div className="text-sm text-gray-500">No items yet.</div> : null}
        {items.map((it: any) => <ItemRow key={it.id} listId={listId} item={it} />)}
      </div>
    </div>
  );
}
