import * as THREE from "three";
import { Grass } from "./Grass";
import { Road } from "./Road";
import { Tree } from "./Tree";
import { Building } from "./Building";
import { Water } from "./Water";
import { ActivePoint } from "./ActivePoint";

let maps = {};
export let mapData = [];
export let currentMapName = 'base';
let currentPoints = [];
export const map = new THREE.Group();

// This function replaces `initialiseMapData`. It stores all maps and sets the initial map data.
export function initialiseMapData(downloadedMaps) {
  maps = downloadedMaps;
  if (maps[currentMapName]) {
    // Set initial mapData for other modules that might need it before rendering
    mapData = [...maps[currentMapName].tiles].reverse();
    currentPoints = maps[currentMapName].points;
  }
}

// This function replaces the old `initialiseMap` and will render the map.
export function initialiseMap(mapName = 'base') {
  if (!maps[mapName]) {
    console.error(`Map '${mapName}' not found.`);
    return;
  }
  // Update mapData to the one being rendered.
  currentMapName = mapName;
  mapData = [...maps[mapName].tiles].reverse();
  currentPoints = maps[mapName].points;

  map.remove(...map.children);

  for (let y = 0; y < mapData.length; y++) {
    for (let x = 0; x < mapData[y].length; x++) {
      addTile(x, y, mapData[y][x]);
    }
  }
}

export function switchMap(mapName) {
  initialiseMap(mapName);
}

export function getMapPoints(mapName) {
    if (maps[mapName]) {
        return maps[mapName].points;
    }
    return [];
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
      const transferPoint = ActivePoint(x, y, 0xffff00);
      map.add(transferPoint);
    } else if (point.type === 'living') {
      const transferPoint = ActivePoint(x, y, 0x00ff00);
      map.add(transferPoint);
    }
  }
}
