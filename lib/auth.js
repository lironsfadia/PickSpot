import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import database from "./db";

export const SESSION_COOKIE = "att-seat-hub-session";

export function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateRegistration({ email, password, displayName }) {
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
  if (String(displayName || "").trim().length < 2) return "Enter your name.";
  if (String(password || "").length < 8) return "Use a password of at least 8 characters.";
  return null;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function passwordMatches(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const calculated = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === calculated.length && timingSafeEqual(expected, calculated);
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
  database.prepare("DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP").run();
  database.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(tokenHash(token), userId, expiresAt);
  return { token, expiresAt };
}

export function attachSession(response, session) {
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
  return response;
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return database.prepare(`
    SELECT users.id, users.email, users.display_name AS displayName, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > CURRENT_TIMESTAMP
  `).get(tokenHash(token)) || null;
}

export function isAdmin(user) {
  return user?.role === "admin" || user?.role === "owner";
}

export function isOwner(user) {
  return user?.role === "owner";
}

export async function clearSession(response) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) database.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
  response.cookies.set(SESSION_COOKIE, "", { path: "/", expires: new Date(0) });
  return response;
}
