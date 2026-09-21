import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { activeBlockForSeat, bookingWindow, prunePastBookings } from "@/lib/office";

export const runtime = "nodejs";

function noSession() {
  return NextResponse.json({ error: "Sign in first." }, { status: 401 });
}

export async function POST(request) {
  const user = await currentUser();
  if (!user) return noSession();
  prunePastBookings();
  const window = bookingWindow();
  if (!window.open) return NextResponse.json({ error: window.message }, { status: 403 });
  const { seatId } = await request.json();
  const seat = database.prepare("SELECT id, label, active FROM seats WHERE id = ?").get(Number(seatId));
  if (!seat || !seat.active) return NextResponse.json({ error: "That seat is not available." }, { status: 404 });
  if (activeBlockForSeat(seat.id)) return NextResponse.json({ error: "That seat is currently blocked." }, { status: 409 });

  try {
    database.exec("BEGIN IMMEDIATE");
    const occupied = database.prepare("SELECT id FROM bookings WHERE seat_id = ? AND reserved_date = ? AND cancelled_at IS NULL").get(seat.id, window.date);
    if (occupied) throw new Error("OCCUPIED");
    database.prepare("UPDATE bookings SET cancelled_at = CURRENT_TIMESTAMP, cancelled_reason = 'Changed reservation' WHERE user_id = ? AND reserved_date = ? AND cancelled_at IS NULL")
      .run(user.id, window.date);
    database.prepare("INSERT INTO bookings (user_id, seat_id, reserved_date) VALUES (?, ?, ?)").run(user.id, seat.id, window.date);
    database.exec("COMMIT");
    return NextResponse.json({ ok: true, booking: { seatLabel: seat.label, reservedDate: window.date } });
  } catch (error) {
    try { database.exec("ROLLBACK"); } catch { /* no active transaction */ }
    if (error.message === "OCCUPIED" || String(error.message).includes("UNIQUE")) {
      return NextResponse.json({ error: "That seat was just booked. Choose another seat." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return noSession();
  const window = bookingWindow();
  database.prepare("UPDATE bookings SET cancelled_at = CURRENT_TIMESTAMP, cancelled_reason = 'Cancelled by employee' WHERE user_id = ? AND reserved_date = ? AND cancelled_at IS NULL")
    .run(user.id, window.date);
  return NextResponse.json({ ok: true });
}
