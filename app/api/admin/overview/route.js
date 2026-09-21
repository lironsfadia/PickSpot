import { NextResponse } from "next/server";
import database from "@/lib/db";
import { currentUser, isAdmin } from "@/lib/auth";
import { bookingWindow, prunePastBookings, seedOffice } from "@/lib/office";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!isAdmin(user)) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  seedOffice();
  prunePastBookings();
  const window = bookingWindow();
  const seats = database.prepare(`
    SELECT seats.id, seats.label, seats.zone, seats.x, seats.y, seats.active,
      blocks.id AS blockId, blocks.reason AS blockReason, blocks.blocked_at AS blockedAt,
      bookings.id AS bookingId, bookings.reserved_date AS reservedDate,
      users.id AS bookedById, users.display_name AS bookedByName, users.email AS bookedByEmail
    FROM seats
    LEFT JOIN seat_blocks blocks ON blocks.id = (
      SELECT id FROM seat_blocks WHERE seat_id = seats.id AND unblocked_at IS NULL ORDER BY id DESC LIMIT 1
    )
    LEFT JOIN bookings ON bookings.seat_id = seats.id AND bookings.reserved_date = ? AND bookings.cancelled_at IS NULL
    LEFT JOIN users ON users.id = bookings.user_id
    WHERE seats.active = 1
    ORDER BY seats.zone, seats.label
  `).all(window.date);
  const users = database.prepare("SELECT id, email, display_name AS displayName, role, created_at AS createdAt FROM users ORDER BY role DESC, display_name").all();
  return NextResponse.json({ window, seats, users, currentUserId: user.id, currentUserRole: user.role });
}
