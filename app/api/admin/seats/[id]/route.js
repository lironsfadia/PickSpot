import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser, isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  const user = await currentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const { id } = await params;
  const { label } = await request.json();
  const nextLabel = String(label || "").trim().toUpperCase();
  if (!/^[A-Z]+-\d{2,}$/.test(nextLabel)) {
    return NextResponse.json({ error: "Use a label such as B-01 or G-12." }, { status: 400 });
  }
  try {
    const result = database.prepare("UPDATE seats SET label = ? WHERE id = ?").run(nextLabel, Number(id));
    if (!result.changes) return NextResponse.json({ error: "Seat not found." }, { status: 404 });
    return NextResponse.json({ ok: true, label: nextLabel });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return NextResponse.json({ error: "That seat label already exists." }, { status: 409 });
    throw error;
  }
}
