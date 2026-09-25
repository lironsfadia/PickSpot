import database from "./db";

// Chair centres traced against the supplied 963 × 583 architectural plan.
// Reference audit: see docs/seat-layout-audit.md. Coordinates are image estimates.
const sourcePoint = (x, y) => [(x / 963) * 100, (y / 583) * 100];
const bank = (left, right, rows, stepX = 0, rightOffset = 0) => rows.flatMap((y, i) => [
  [left + i * stepX, y], [right + i * stepX, y + rightOffset],
]);
const blueChairs = [
  ...bank(85, 110, [115, 132, 150], 4, -6),
  ...bank(127, 152, [108, 126, 143], 4, -7),
  ...bank(169, 194, [99, 116, 134], 4, -6),
  ...bank(210, 235, [91, 109, 126], 4, -6),
  ...bank(251, 277, [84, 102, 119], 4, -6),
  ...bank(294, 319, [77, 95, 112], 4, -6),
  ...bank(337, 362, [69, 87, 104], 4, -6),
  [190, 177], [195, 195],
  [210, 175], [234, 170], [214, 193], [238, 189],
  [254, 166], [279, 162], [258, 184], [283, 180],
].map(([x, y]) => sourcePoint(x, y));

const northChairs = [
  [845, 202], [868, 206],
  [864, 226], [882, 226], [864, 249], [882, 249],
  [831, 270], [849, 270], [867, 270], [885, 270],
  ...[287, 311, 331, 355, 373, 398, 415].flatMap((y) => [831, 849, 867, 885].map((x) => [x, y])),
  [853, 440], [871, 440], [889, 440],
  [848, 463], [866, 463],
].map(([x, y]) => sourcePoint(x, y));

const eastAChairs = [
  ...bank(85, 109, [354, 372, 390], -5, 9),
  ...bank(123, 147, [366, 384, 402], -5, 9),
  [157, 395], [151, 413],
].map(([x, y]) => sourcePoint(x, y));
// Keep the established G-29 through G-40 identifiers on the East A desks.
const greenChairs = [...northChairs.slice(0, 28), ...eastAChairs.slice(0, 12), ...northChairs.slice(28), ...eastAChairs.slice(12)];
const yellowChairs = [
  [188, 423], [212, 430],
  [225, 433], [255, 423], [250, 441],
  [269, 427], [265, 444],
].map(([x, y]) => sourcePoint(x, y));
const ZONE_SEATS = [["B", "Blue", blueChairs], ["G", "Green", greenChairs], ["Y", "Yellow", yellowChairs]];
// Omit non-chair positions without renumbering remaining seats or their history.
const nonChairLabels = new Set(["B-01", "B-07", "B-20", "B-37", "B-51", "G-18", "G-33", "G-36"]);
function seatLayout() {
  return ZONE_SEATS.flatMap(([prefix, zone, coordinates]) => coordinates.map(([x, y], index) => ({
    label: `${prefix}-${String(index + 1).padStart(2, "0")}`, zone, x, y,
  }))).filter((seat) => !nonChairLabels.has(seat.label));
}

export function seedOffice() {
  const site = database.prepare("SELECT id FROM sites LIMIT 1").get();
  let siteId = site?.id;

  if (!siteId) {
    siteId = Number(database.prepare("INSERT INTO sites (name, map_path) VALUES (?, ?)").run("Site 1 — Main Office", "/office-reference.png").lastInsertRowid);
  }

  database.prepare("UPDATE sites SET map_path = ? WHERE id = ?").run("/office-reference.png", siteId);
  const layout = seatLayout();
  const currentSeats = database.prepare("SELECT id, label FROM seats WHERE site_id = ? ORDER BY id").all(siteId);
  if (currentSeats.length) {
    // Apply the complete chair-aligned layout to an early PickSpot setup
    // without touching seat labels, bookings, or blocks.
    const byLabel = new Map(layout.map((seat) => [seat.label, seat]));
    const updatePosition = database.prepare("UPDATE seats SET zone = ?, x = ?, y = ?, active = 1 WHERE id = ?");
    currentSeats.forEach((seat) => {
      const position = byLabel.get(seat.label);
      if (position) updatePosition.run(position.zone, position.x, position.y, seat.id);
    });
    const insertSeat = database.prepare("INSERT INTO seats (site_id, label, zone, x, y) VALUES (?, ?, ?, ?, ?)");
    const existingLabels = new Set(currentSeats.map((seat) => seat.label));
    layout.filter((seat) => !existingLabels.has(seat.label)).forEach((seat) => {
      insertSeat.run(siteId, seat.label, seat.zone, seat.x, seat.y);
    });
    // Retain booking/block history for legacy positions absent from this plan.
    const retire = database.prepare("UPDATE seats SET active = 0 WHERE id = ?");
    currentSeats.filter((seat) => /^[BGY]-\d+$/.test(seat.label) && !byLabel.has(seat.label)).forEach((seat) => retire.run(seat.id));
    return;
  }

  const insertSeat = database.prepare("INSERT INTO seats (site_id, label, zone, x, y) VALUES (?, ?, ?, ?, ?)");
  for (const seat of layout) {
    insertSeat.run(siteId, seat.label, seat.zone, seat.x, seat.y);
  }
}

export function israelDateTime() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    hour: Number(value.hour),
  };
}

export function addDays(date, days) {
  const output = new Date(`${date}T12:00:00Z`);
  output.setUTCDate(output.getUTCDate() + days);
  return output.toISOString().slice(0, 10);
}

export function bookingWindow() {
  const { date, hour } = israelDateTime();
  return {
    open: hour >= 6,
    date: addDays(date, 1),
    message: hour >= 6
      ? `Bookings are open for ${addDays(date, 1)}.`
      : "Bookings open at 06:00 Israel time for the following day.",
  };
}

export function prunePastBookings() {
  const { date } = israelDateTime();
  database.prepare("DELETE FROM bookings WHERE reserved_date < ?").run(date);
}

export function activeBlockForSeat(seatId) {
  return database.prepare("SELECT * FROM seat_blocks WHERE seat_id = ? AND unblocked_at IS NULL ORDER BY id DESC LIMIT 1").get(seatId);
}

export function createNotification(userId, title, message) {
  database.prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)").run(userId, title, message);
}
