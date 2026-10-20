import easystarjs from "easystarjs";
import { mapData, currentOrigin } from "../components/Map";

const easystar = new easystarjs.js();

const walkableTiles = ["G", "Ž", "R"];

export function initializePathfinding() {
  easystar.setGrid(mapData);
  easystar.setAcceptableTiles(walkableTiles);
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
