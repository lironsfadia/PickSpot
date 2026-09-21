import { NextResponse } from "next/server";
import database from "@/lib/db";
import { attachSession, cleanEmail, createSession, hashPassword, validateRegistration } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const existing = database.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (existing) return NextResponse.json({ error: "Owner setup is already complete." }, { status: 409 });

  const body = await request.json();
  const email = cleanEmail(body.email);
  const displayName = String(body.displayName || "").trim();
  const error = validateRegistration({ email, password: body.password, displayName });
  if (error) return NextResponse.json({ error }, { status: 400 });

  const userId = Number(database.prepare("INSERT INTO users (email, display_name, password_hash, role) VALUES (?, ?, ?, 'owner')")
    .run(email, displayName, hashPassword(body.password)).lastInsertRowid);
  const response = NextResponse.json({ user: { id: userId, email, displayName, role: "owner" } }, { status: 201 });
  return attachSession(response, createSession(userId));
}
