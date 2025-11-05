import { NextResponse } from "next/server";
import { updateItemSchema } from "../../../../../../lib/validation";
import { updateItem, removeItem } from "../../../../_util";

export async function PATCH(req: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    const updated = await updateItem(params.id, params.itemId, parsed.data);
    if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string; itemId: string } }) {
  const ok = await removeItem(params.id, params.itemId);
  if (!ok) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
