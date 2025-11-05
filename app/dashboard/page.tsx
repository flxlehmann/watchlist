"use client";
import useSWR from "swr";
import CreateListForm from "../../components/CreateListForm";
import ListCard from "../../components/ListCard";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DashboardPage() {
  const { data } = useSWR("/api/lists", fetcher, { refreshInterval: 5000 });
  const lists = data?.data || [];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">All lists</h2>
      <CreateListForm />
      <div className="grid gap-3">
        {lists.length === 0 ? <div className="text-sm text-gray-500">No lists yet.</div> : null}
        {lists.map((l: any) => <ListCard key={l.id} id={l.id} name={l.name} />)}
      </div>
    </div>
  );
}
