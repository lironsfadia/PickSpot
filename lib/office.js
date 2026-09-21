import database from "./db";

// Each coordinate is sampled from the centre of a chair in the 1613 × 975
// office illustration. Hotspot uses these same coordinates when it zooms the
// real plan, so a seat marker always sits on the matching chair.
const sourcePoint = (x, y) => [(x / 1613) * 100, (y / 975) * 100];

const chairBanks = (banks) => banks.flatMap(({ left, right, rows }) => rows.flatMap((y) => [
  [left, y], [right, y],
]));

const blueChairs = chairBanks([
  { left: 123, right: 174, rows: [177, 212, 247] },
  { left: 195, right: 247, rows: [163, 195, 229] },
  { left: 266, right: 319, rows: [144, 178, 211] },
  { left: 339, right: 392, rows: [128, 160, 193] },
  { left: 411, right: 463, rows: [111, 142, 174] },
  { left: 484, right: 537, rows: [95, 126, 157] },
  { left: 559, right: 614, rows: [77, 109, 140] },
  { left: 336, right: 392, rows: [255, 287, 318] },
  { left: 414, right: 468, rows: [269, 301, 333] },
]).map(([x, y]) => sourcePoint(x, y));

const northChairs = [
    [1454, 350], [1480, 350], [1454, 396], [1480, 396],
    [1418, 439], [1449, 439], [1480, 439], [1418, 476], [1449, 476], [1480, 476],
    [1418, 523], [1449, 523], [1480, 523], [1418, 563], [1449, 563], [1480, 563],
    [1423, 606], [1452, 606], [1484, 606], [1423, 647], [1452, 647], [1484, 647],
    [1423, 693], [1454, 693], [1485, 693], [1423, 734], [1454, 734], [1485, 734],
].map(([x, y]) => sourcePoint(x, y));

const eastAChairs = chairBanks([
  { left: 125, right: 172, rows: [592, 624, 656] },
  { left: 197, right: 241, rows: [615, 646, 680] },
]).map(([x, y]) => sourcePoint(x, y));

const greenChairs = [...northChairs, ...eastAChairs];

const yellowChairs = [
  // Left desk: one chair on each side.
  [247, 672], [285, 672],
  // Middle desk: two chairs on each side.
  [312, 693], [358, 693], [312, 758], [358, 758],
  // Right desk: two chairs along its open side.
  [385, 707], [385, 772],
].map(([x, y]) => sourcePoint(x, y));

const ZONE_SEATS = [
  ["B", "Blue", blueChairs],
  ["G", "Green", greenChairs],
  ["Y", "Yellow", yellowChairs],
];

function seatLayout() {
  return ZONE_SEATS.flatMap(([prefix, zone, coordinates]) => coordinates.map(([x, y], index) => ({
    label: `${prefix}-${String(index + 1).padStart(2, "0")}`,
    zone,
    x,
    y,
  })));
}

export function seedOffice() {
  const site = database.prepare("SELECT id FROM sites LIMIT 1").get();
  let siteId = site?.id;

  if (!siteId) {
    siteId = Number(database.prepare("INSERT INTO sites (name, map_path) VALUES (?, ?)").run("Site 1 — Main Office", "/office-2d-map.png").lastInsertRowid);
  }

  const layout = seatLayout();
  const currentSeats = database.prepare("SELECT id, label FROM seats WHERE site_id = ? ORDER BY id").all(siteId);
  if (currentSeats.length) {
    // Apply the complete chair-aligned layout to an early Hotspot setup
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
    // Earlier prototypes included duplicate green seats, seats in meeting rooms,
    // and extra East B chairs not present in the detailed plan.
    // Keep their history, but remove them from booking views.
    database.prepare("UPDATE seats SET active = 0 WHERE site_id = ? AND label IN ('B-55','B-56','B-57','B-58','B-59','B-60','G-41','G-42','G-43','G-44','G-45','G-46','G-47','G-48','G-49','G-50','G-51','G-52','Y-09','Y-10','Y-11','Y-12','Y-13','Y-14','Y-15','Y-16','Y-17','Y-18')").run(siteId);
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
