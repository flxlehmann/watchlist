import { NextResponse } from "next/server";
import { getListWithItems } from "../../_util";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const data = await getListWithItems(params.id);
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, data });
}
