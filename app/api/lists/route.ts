import { NextResponse } from "next/server";
import { listSchema } from "../../../lib/validation";
import { createList, getAllLists } from "../_util";

export async function GET() {
  const lists = await getAllLists();
  return NextResponse.json({ ok: true, data: lists });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = listSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    const list = await createList(parsed.data.name);
    return NextResponse.json({ ok: true, data: list });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
