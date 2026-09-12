import * as THREE from "three";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { Grass } from "./Grass.js";
import { Road } from "./Road.js";
import { Tree } from "./Tree.js";
import { Building } from "./Building.js";
import { Water } from "./Water.js";
import { ActivePoint } from "./ActivePoint.js";
import { Coin } from "./Coin.js";
import { TreasureMap } from "./TreasureMap.js";
import { Floor } from "./Floor.js";
import { Chair } from "./Chair.js";
import { findFirstWalkablePosition } from "../utilies/findFirstWalkablePosition.js";
import { initializePlayer } from "./Player.js";
import { updateAllOtherPlayers } from "../otherPlayers.js";

export let maps = {}; // Data of ALL maps
export let mapData = []; // data of the CURRENT map being rendered
export let currentPoints = []; // active points of the CURRENT map being rendered
export let gamePoints = []; // list of all game points (coins, treasure maps, etc) on all maps
export let currentMapName = 'base'; // This should not be required, server sends our initial map and position
export const map = new THREE.Group();
export const gamePointsGroup = new THREE.Group();
map.add(gamePointsGroup);

// The tiles of the drawn map, glued together into a few big meshes. Kept here
// so that they can be thrown away when another map is drawn.
let mergedTiles = null;

export function drawGamePoints() {
    gamePointsGroup.remove(...gamePointsGroup.children);
    gamePoints.forEach(point => {
        if (point.type === 'coin' && point.map === currentMapName) {
            const coin = Coin(point.x, point.y, 0xffd700);
            gamePointsGroup.add(coin);
        }
        if (point.type === 'treasureMap' && point.map === currentMapName) {
            const treasureMap = TreasureMap(point.x, point.y);
            gamePointsGroup.add(treasureMap);
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
    console.log('!!!!!!!!!!!!!!!!!!!!!! reversing here, this should not be required anymore !!!!!!!!!!!!!!!!!!!!!!');
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
  currentMapName = mapName;
  mapData = [...maps[mapName].tiles];
  currentPoints = maps[mapName].points;

  map.remove(...map.children);
  disposeMergedTiles();
  map.add(gamePointsGroup);

  // Tiles are built one by one and then glued together. The map does not change
  // while it is being played, and drawing a few big meshes instead of thousands
  // of small ones is what keeps the game from eating a whole processor core.
  const tiles = new THREE.Group();
  // Active points are left alone, there are only a few of them and they may
  // need to be changed one by one later.
  const activePoints = new THREE.Group();

  for (let y = 0; y < mapData.length; y++) {
    for (let x = 0; x < mapData[y].length; x++) {
      addTile(tiles, activePoints, x, y, mapData[y][x]);
    }
  }

  mergedTiles = mergeTiles(tiles);
  if (mergedTiles) {
    map.add(mergedTiles);
  } else {
    // Gluing failed for some reason, so draw the tiles the slow way rather
    // than showing an empty map.
    map.add(tiles);
  }
  map.add(activePoints);

  drawGamePoints();
}

// Glues the tiles into one mesh per look. Tiles that look the same and throw
// shadows the same way can all live in a single mesh.
function mergeTiles(tiles) {
  const groups = new Map();

  tiles.updateMatrixWorld(true);
  tiles.traverse(object => {
    if (!object.isMesh) {
      return;
    }
    const material = object.material;
    const key = [
      material.type,
      material.color.getHexString(),
      material.flatShading,
      object.castShadow,
      object.receiveShadow
    ].join('|');

    if (!groups.has(key)) {
      groups.set(key, {
        material,
        castShadow: object.castShadow,
        receiveShadow: object.receiveShadow,
        geometries: []
      });
    }
    // Every tile knows its own place, so that place has to be baked into the
    // shape before the shapes are put together.
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    groups.get(key).geometries.push(geometry);
  });

  const merged = new THREE.Group();
  for (const group of groups.values()) {
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(group.geometries, false);
    group.geometries.forEach(geometry => geometry.dispose());
    if (!mergedGeometry) {
      console.error('Could not glue the map tiles together.');
      merged.children.forEach(mesh => mesh.geometry.dispose());
      return null;
    }
    const mesh = new THREE.Mesh(mergedGeometry, group.material);
    mesh.castShadow = group.castShadow;
    mesh.receiveShadow = group.receiveShadow;
    merged.add(mesh);
  }

  console.log(`Map tiles glued into ${merged.children.length} meshes.`);
  return merged;
}

// Frees the memory of the previously drawn map.
function disposeMergedTiles() {
  if (!mergedTiles) {
    return;
  }
  mergedTiles.children.forEach(mesh => {
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
  mergedTiles = null;
}

function addTile(tiles, activePoints, x, y, type) {
  if (type === "G") {
    tiles.add(Road(x, y));
  } else if (type === "P") {
    tiles.add(Building(x, y));
  } else if (type === "M") {
    tiles.add(Grass(x, y));
    tiles.add(Tree(x, y));
  } else if (type === "V") {
    tiles.add(Water(x, y));
  } else if (type === "R") {
    tiles.add(Floor(x, y));
  } else if (type === "K") {
    tiles.add(Floor(x, y));
    tiles.add(Chair(x, y));
  } else /*(type === "Ž")*/ {
    tiles.add(Grass(x, y));
  }

  const point = currentPoints.find(p => p.x === x && p.y === y);
  if (point) {
    if (point.type === 'transfer') {
      activePoints.add(ActivePoint(x, y, 0xffff00));
    } else if (point.type === 'living') {
      activePoints.add(ActivePoint(x, y, 0x00ff00));
    }
  }
}

export function switchToMap(mapName, initializePathfinding, map_x, map_y) {
  if (maps[mapName]) {
    const newMapData = maps[mapName].tiles;
    let newPosition;
    console.log('switching to map:', mapName, map_x, map_y);
    if (map_x === undefined || map_y === undefined) {
      // This should not be happening if map data is captured correctly and
      // all transfer points have map and position defined.
      console.log('No map_x or map_y provided, finding first walkable position.');
      newPosition = findFirstWalkablePosition(newMapData);
    } else {
      newPosition = { x: map_x, y: map_y };
    }

    if (newPosition) {
      // The y-coordinate needs to be inverted because the findFirstWalkablePosition
      // works with the raw tile data, where y=0 is the top.
      // The player's logical position has y=0 at the bottom.
      const logicalY = newMapData.length - 1 - newPosition.y;

      initialiseMap(mapName);
      initializePlayer(newPosition.x, logicalY);
      initializePathfinding(); // Re-initialize pathfinding with the new map
      updateAllOtherPlayers(); // Update visibility of other players on the new map
    } else {
      console.error(`No walkable position found on map: ${mapName}`);
    }
  } else {
    console.error(`Map '${mapName}' not found for transfer.`);
  }
}
