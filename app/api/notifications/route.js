import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const notifications = database.prepare("SELECT id, title, message, read_at AS readAt, created_at AS createdAt FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20").all(user.id);
  return NextResponse.json({ notifications });
}

export async function PATCH() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  database.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL").run(user.id);
  return NextResponse.json({ ok: true });
}
