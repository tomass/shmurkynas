import * as THREE from "three";
import { Grass } from "./Grass";
import { Road } from "./Road";
import { Tree } from "./Tree";
import { Building } from "./Building";
import { Water } from "./Water";
import { ActivePoint } from "./ActivePoint";
import { Coin } from "./Coin.js";
import { findFirstWalkablePosition } from "../utilies/findFirstWalkablePosition";
import { initializePlayer } from "./Player";

let maps = {};
export let mapData = [];
export let currentPoints = [];
export let gamePoints = [];
export const map = new THREE.Group();
const gamePointsGroup = new THREE.Group();
map.add(gamePointsGroup);

export function drawGamePoints() {
    gamePointsGroup.remove(...gamePointsGroup.children);
    gamePoints.forEach(point => {
        if (point.type === 'coin') {
            const coin = Coin(point.x, point.y, 0xffd700);
            gamePointsGroup.add(coin);
        }
    });
}

export function setGamePoints(points) {
    gamePoints.length = 0;
    if (points) {
        gamePoints.push(...points);
    }
    drawGamePoints();
}

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
  map.add(gamePointsGroup);

  for (let y = 0; y < mapData.length; y++) {
    for (let x = 0; x < mapData[y].length; x++) {
      addTile(x, y, mapData[y][x]);
    }
  }
  drawGamePoints();
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

  const point = currentPoints.find(p => p.x === x && p.y === y);
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

export function switchToMap(mapName) {
  if (maps[mapName]) {
    const newMapData = maps[mapName].tiles;
    const newPosition = findFirstWalkablePosition(newMapData);

    if (newPosition) {
      // The y-coordinate needs to be inverted because the findFirstWalkablePosition
      // works with the raw tile data, where y=0 is the top.
      // The player's logical position has y=0 at the bottom.
      const logicalY = newMapData.length - 1 - newPosition.y;

      initialiseMap(mapName);
      initializePlayer(newPosition.x, logicalY);
      initializePathfinding(); // Re-initialize pathfinding with the new map
    } else {
      console.error(`No walkable position found on map: ${mapName}`);
    }
  } else {
    console.error(`Map '${mapName}' not found for transfer.`);
  }
}
