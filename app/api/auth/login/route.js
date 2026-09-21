import { NextResponse } from "next/server";
import database from "@/lib/db";
import { attachSession, cleanEmail, createSession, passwordMatches } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json();
  const user = database.prepare("SELECT id, email, display_name AS displayName, password_hash, role FROM users WHERE email = ?")
    .get(cleanEmail(body.email));
  if (!user || !passwordMatches(body.password || "", user.password_hash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  const response = NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role } });
  return attachSession(response, createSession(user.id));
}
