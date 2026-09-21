import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { bookingWindow, prunePastBookings, seedOffice } from "@/lib/office";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to view the office map." }, { status: 401 });

  seedOffice();
  prunePastBookings();
  const window = bookingWindow();
  const site = database.prepare("SELECT id, name, map_path AS mapPath FROM sites WHERE active = 1 ORDER BY id LIMIT 1").get();
  const seats = database.prepare(`
    SELECT seats.id, seats.label, seats.zone, seats.x, seats.y, seats.active,
      EXISTS(SELECT 1 FROM seat_blocks WHERE seat_blocks.seat_id = seats.id AND seat_blocks.unblocked_at IS NULL) AS blocked,
      bookings.user_id AS bookedByUserId
    FROM seats
    LEFT JOIN bookings ON bookings.seat_id = seats.id AND bookings.reserved_date = ? AND bookings.cancelled_at IS NULL
    WHERE seats.site_id = ? AND seats.active = 1
    ORDER BY seats.zone, seats.label
  `).all(window.date, site.id).map((seat) => ({
    ...seat,
    status: !seat.active || seat.blocked ? "blocked" : seat.bookedByUserId === user.id ? "mine" : seat.bookedByUserId ? "occupied" : "available",
  }));

  const booking = database.prepare(`
    SELECT bookings.id, bookings.reserved_date AS reservedDate, seats.label AS seatLabel
    FROM bookings JOIN seats ON seats.id = bookings.seat_id
    WHERE bookings.user_id = ? AND bookings.reserved_date = ? AND bookings.cancelled_at IS NULL
  `).get(user.id, window.date) || null;

  return NextResponse.json({ site, seats, window, booking });
}
