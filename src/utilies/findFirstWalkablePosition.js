import { tileIsWalkable } from "../../shared/tiles.js";

export function findFirstWalkablePosition(mapTiles) {
  for (let y = 0; y < mapTiles.length; y++) {
    for (let x = 0; x < mapTiles[y].length; x++) {
      if (tileIsWalkable(mapTiles[y][x])) {
        return { x, y };
      }
    }
  }
  return null; // Or some default position if no walkable tile is found
}
