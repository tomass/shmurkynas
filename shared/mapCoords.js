// A map can be extended in any direction, which moves every tile of it inside
// the tile array. To keep the places which are already remembered - coins,
// treasures, bought living spaces, players - pointing at the very same tiles,
// every map carries an origin: the place of its lower left tile in the world.
// Extending a map on the left or at the bottom only moves its origin, nothing
// else has to be touched.
//
// World coordinates are what the whole game speaks: the server, the saved
// files and the players all use them. The tile array is only ever reached
// through the conversions below.

const noOrigin = { x: 0, y: 0 };

export function mapOrigin(map) {
  return (map && map.origin) || noOrigin;
}

// A place in the world turned into a place in the tile array of a map. The
// parser has already turned the drawn map the right way up, so row 0 of the
// array is the bottom row of the map.
export function toIndex(map, x, y) {
  const origin = mapOrigin(map);
  return { x: x - origin.x, y: y - origin.y };
}

// A place in the tile array turned into a place in the world.
export function toWorld(map, ix, iy) {
  const origin = mapOrigin(map);
  return { x: ix + origin.x, y: iy + origin.y };
}

// The tile standing at a place in the world, or undefined when that place is
// outside the map.
export function tileAt(map, x, y) {
  if (!map || !map.tiles) {
    return undefined;
  }
  const index = toIndex(map, x, y);
  const row = map.tiles[index.y];
  return row ? row[index.x] : undefined;
}
