import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser, hashPassword, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const user = await currentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const { id } = await params;
  const { password } = await request.json();
  if (String(password || "").length < 8) return NextResponse.json({ error: "Use a temporary password of at least 8 characters." }, { status: 400 });
  const result = database.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), Number(id));
  if (!result.changes) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
