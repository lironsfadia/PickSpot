import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(_request, { params }) {
  const user = await currentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const { id } = await params;
  const result = database.prepare("UPDATE seat_blocks SET unblocked_at = CURRENT_TIMESTAMP, unblocked_by = ? WHERE seat_id = ? AND unblocked_at IS NULL")
    .run(user.id, Number(id));
  if (!result.changes) return NextResponse.json({ error: "That seat is not blocked." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
