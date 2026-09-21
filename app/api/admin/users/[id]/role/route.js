import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser, isOwner } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const user = await currentUser();
  if (!isOwner(user)) return NextResponse.json({ error: "Only the Owner can manage admins." }, { status: 403 });
  const { id } = await params;
  const { role } = await request.json();
  if (!["employee", "admin"].includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  const target = database.prepare("SELECT id, role FROM users WHERE id = ?").get(Number(id));
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === "owner") return NextResponse.json({ error: "The Owner role cannot be changed." }, { status: 403 });
  database.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, target.id);
  return NextResponse.json({ ok: true, role });
}
