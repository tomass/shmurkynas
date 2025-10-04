export function findFirstWalkablePosition(mapTiles) {
  for (let y = 0; y < mapTiles.length; y++) {
    for (let x = 0; x < mapTiles[y].length; x++) {
      const tile = mapTiles[y][x];
      // A tile is walkable if it's not a Mountain, Building, or Water tile.
      if (tile !== "M" && tile !== "P" && tile !== "V") {
        return { x, y };
      }
    }
  }
  return null; // Or some default position if no walkable tile is found
}
