import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser, isAdmin } from "@/lib/auth";
import { createNotification, israelDateTime } from "@/lib/office";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const user = await currentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  const { id } = await params;
  const seat = database.prepare("SELECT id, label FROM seats WHERE id = ?").get(Number(id));
  if (!seat) return NextResponse.json({ error: "Seat not found." }, { status: 404 });
  const existing = database.prepare("SELECT id FROM seat_blocks WHERE seat_id = ? AND unblocked_at IS NULL").get(seat.id);
  if (existing) return NextResponse.json({ error: "That seat is already blocked." }, { status: 409 });
  const body = await request.json();
  const reason = String(body.reason || "Unavailable").trim().slice(0, 140);
  const { date } = israelDateTime();

  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("INSERT INTO seat_blocks (seat_id, blocked_by, reason) VALUES (?, ?, ?)").run(seat.id, user.id, reason);
    const affected = database.prepare(`
      SELECT bookings.id, bookings.user_id AS userId, bookings.reserved_date AS reservedDate
      FROM bookings WHERE seat_id = ? AND reserved_date >= ? AND cancelled_at IS NULL
    `).all(seat.id, date);
    database.prepare("UPDATE bookings SET cancelled_at = CURRENT_TIMESTAMP, cancelled_reason = 'Seat blocked by an admin' WHERE seat_id = ? AND reserved_date >= ? AND cancelled_at IS NULL")
      .run(seat.id, date);
    for (const booking of affected) {
      createNotification(booking.userId, "Reservation cancelled", `Your reservation for ${seat.label} on ${booking.reservedDate} was cancelled because the seat is unavailable.`);
    }
    database.exec("COMMIT");
    return NextResponse.json({ ok: true, cancelledBookings: affected.length });
  } catch (error) {
    try { database.exec("ROLLBACK"); } catch { /* no active transaction */ }
    throw error;
  }
}
