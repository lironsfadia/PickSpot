// Furniture styling uses reference coordinates; it never rewrites booking data.
export const displayDesks = [
  ...Array.from({ length: 7 }, (_, i) => [102 + i * 42, 130 - i * 7.7, 16, 57, -12]),
  [179,188,13,34,-14], [224,181,17,36,-12], [267,174,17,36,-12],
  [857,204,16,22,8], [873,238,37,16,0], [858,261,73,9,0],
  ...[299,343,386,428].map(y => [858,y,73,18,-1]),
  [857,475,36,12,0], [92,377,17,55,16], [130,389,17,55,16],
  [166,404,12,35,17], [200,427,17,22,17], [242,427,17,36,17], [279,437,12,36,17],
];

// Use physical location so administrator label changes don't change the area.
export function seatAreaLabel(seat) {
  if (seat.zone === "Green" && seat.x > 80) {
    return seat.y * 583 / 100 < 255 ? "North · Office" : "North · Open space";
  }
  return seat.zone === "Blue" ? "West" : seat.zone === "Yellow" ? "East B" : "East A";
}

// The illustrated plan has a wider meeting-room wall than the source drawing.
// Move the two adjacent desk groups together; stored seat locations stay intact.
export function furnitureDisplayPoint(x, y) {
  if (y >= 150 && y <= 205 && x >= 245 && x <= 295) return { x: x - 14, y: y - 8 };
  if (y >= 150 && y <= 205 && x >= 205 && x < 245) return { x: x - 5, y: y - 4 };
  return { x, y };
}
