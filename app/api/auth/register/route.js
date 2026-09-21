import { NextResponse } from "next/server";
import database from "@/lib/db";
import { attachSession, cleanEmail, createSession, hashPassword, validateRegistration } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const setupComplete = database.prepare("SELECT COUNT(*) AS count FROM users").get().count > 0;
  if (!setupComplete) return NextResponse.json({ error: "Set up the owner account before registering employees." }, { status: 409 });

  const body = await request.json();
  const email = cleanEmail(body.email);
  const displayName = String(body.displayName || "").trim();
  const error = validateRegistration({ email, password: body.password, displayName });
  if (error) return NextResponse.json({ error }, { status: 400 });

  try {
    const userId = Number(database.prepare("INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)")
      .run(email, displayName, hashPassword(body.password)).lastInsertRowid);
    const response = NextResponse.json({ user: { id: userId, email, displayName, role: "employee" } }, { status: 201 });
    return attachSession(response, createSession(userId));
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    throw error;
  }
}
