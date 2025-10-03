import * as THREE from "three";
import { Grass } from "./Grass";
import { Road } from "./Road";
import { Tree } from "./Tree";
import { Building } from "./Building";
import { Water } from "./Water";
import { TransferPoint } from "./TransferPoint";

let maps = {};
export let mapData = [];
let currentPoints = [];
export const map = new THREE.Group();

// This function replaces `initialiseMapData`. It stores all maps and sets the initial map data.
export function initialiseMapData(downloadedMaps) {
  maps = downloadedMaps;
  if (maps['base']) {
    // Set initial mapData for other modules that might need it before rendering
    mapData = [...maps['base'].tiles].reverse();
    currentPoints = maps['base'].points;
  }
}

// This function replaces the old `initialiseMap` and will render the map.
export function initialiseMap(mapName = 'base') {
  if (!maps[mapName]) {
    console.error(`Map '${mapName}' not found.`);
    return;
  }
  // Update mapData to the one being rendered.
  mapData = [...maps[mapName].tiles].reverse();
  currentPoints = maps[mapName].points;

  map.remove(...map.children);

  for (let y = 0; y < mapData.length; y++) {
    for (let x = 0; x < mapData[y].length; x++) {
      addTile(x, y, mapData[y][x]);
    }
  }
}

function addTile(x, y, type) {
  if (type === "G") {
    const road = Road(x, y);
    map.add(road);
  } else if (type === "P") {
    const building = Building(x, y);
    map.add(building);
  } else if (type === "M") {
    const grass = Grass(x, y);
    map.add(grass);
    const tree = Tree(x, y);
    map.add(tree);
  } else if (type === "V") {
    const water = Water(x, y);
    map.add(water);
  } else /*(type === "Ž")*/ {
    const grass = Grass(x, y);
    map.add(grass);
  }

  const point = currentPoints.find(p => p.x === x && p.y === (mapData.length - 1 - y));
  if (point) {
    if (point.type === 'transfer') {
      const transferPoint = TransferPoint(x, y);
      map.add(transferPoint);
    }
  }
}
