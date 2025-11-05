import { NextResponse } from "next/server";
import { addItemSchema } from "../../../../../lib/validation";
import { addItem } from "../../../_util";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = addItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    const it = await addItem(params.id, parsed.data.title);
    return NextResponse.json({ ok: true, data: it });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}
