import easystarjs from "easystarjs";
import { mapData, currentOrigin } from "../components/Map";
import { pathableTiles } from "../../shared/tiles.js";
import { blockedTiles } from "../livingItems.js";

const easystar = new easystarjs.js();

export function initializePathfinding() {
  // The furniture of a home is not written in the map file, so the tiles it
  // takes up are walled off in a copy of the map before the path finder is
  // given it. Everywhere else there is no furniture and the copy is the map
  // itself. This has to be done again every time something is moved.
  const grid = mapData.map(row => [...row]);
  blockedTiles().forEach(tile => {
    const x = tile.x - currentOrigin.x;
    const y = tile.y - currentOrigin.y;
    if (grid[y] && grid[y][x] !== undefined) {
      grid[y][x] = 'S';
    }
  });
  easystar.setGrid(grid);
  easystar.setAcceptableTiles(pathableTiles);
}

// The path finder knows nothing about the world, it only walks the tile array
// it was given. So the places it is asked about are moved by the origin of the
// map on the way in, and the path it gives back is moved out again.
export function findPath(start, end) {
  const origin = currentOrigin;
  return new Promise((resolve, reject) => {
    easystar.findPath(
      start.x - origin.x, start.y - origin.y,
      end.x - origin.x, end.y - origin.y,
      (path) => {
      if (path === null) {
        reject("Path not found");
      } else {
        resolve(path.map(step => ({ x: step.x + origin.x, y: step.y + origin.y })));
      }
    });
    easystar.calculate();
  });
}
