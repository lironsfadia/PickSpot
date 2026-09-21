import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  const setupComplete = database.prepare("SELECT COUNT(*) AS count FROM users").get().count > 0;
  return NextResponse.json({ user, setupComplete });
}
