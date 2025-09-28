import easystarjs from "easystarjs";
import { mapData } from "../components/Map";

const easystar = new easystarjs.js();

const walkableTiles = ["G", "Ž"];

export function initializePathfinding() {
  easystar.setGrid(mapData);
  easystar.setAcceptableTiles(walkableTiles);
}

export function findPath(start, end) {
  return new Promise((resolve, reject) => {
    easystar.findPath(start.x, start.y, end.x, end.y, (path) => {
      if (path === null) {
        reject("Path not found");
      } else {
        resolve(path);
      }
    });
    easystar.calculate();
  });
}