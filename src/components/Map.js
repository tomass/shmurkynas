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
import { isLivingOccupied } from "../livingSpaces.js";
import { livingFreeColour, livingOccupiedColour } from "../constants.js";
import { mapOrigin, toWorld, toIndex } from "../../shared/mapCoords.js";

export let maps = {}; // Data of ALL maps
export let mapData = []; // data of the CURRENT map being rendered
// Where the lower left tile of the CURRENT map stands in the world. Everything
// but mapData itself speaks world coordinates, so this is what turns one into
// the other, see shared/mapCoords.js.
export let currentOrigin = { x: 0, y: 0 };
export let currentPoints = []; // active points of the CURRENT map being rendered
export let gamePoints = []; // list of all game points (coins, treasure maps, etc) on all maps
export let currentMapName = 'base'; // This should not be required, server sends our initial map and position
export const map = new THREE.Group();
export const gamePointsGroup = new THREE.Group();
map.add(gamePointsGroup);

// The tiles of the drawn map, glued together into a few big meshes. Kept here
// so that they can be thrown away when another map is drawn.
let mergedTiles = null;

// The lightbulbs and other active points of the drawn map. They are kept apart
// from the glued tiles, because a single one of them may need to be changed,
// for example when somebody buys a house.
let activePointsGroup = null;

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
    currentOrigin = mapOrigin(maps['base']);
    currentPoints = maps['base'].points;
  }
}

// The tile standing at a place in the world of the map being played now.
export function currentTileAt(x, y) {
  const index = toIndex({ origin: currentOrigin }, x, y);
  const row = mapData[index.y];
  return row ? row[index.x] : undefined;
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
  currentOrigin = mapOrigin(maps[mapName]);
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
  activePointsGroup = activePoints;

  // The tiles are drawn where they stand in the world, not where they happen
  // to lay in the array, so that extending a map does not move anything which
  // is already there.
  for (let row = 0; row < mapData.length; row++) {
    for (let col = 0; col < mapData[row].length; col++) {
      const place = toWorld(maps[mapName], col, row);
      addTile(tiles, activePoints, place.x, place.y, mapData[row][col]);
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
      activePoints.add(ActivePoint(x, y, 0xffff00, type));
    } else if (point.type === 'living') {
      const occupied = isLivingOccupied(currentMapName, point);
      const bulb = ActivePoint(x, y, occupied ? livingOccupiedColour : livingFreeColour, type);
      // The lightbulb remembers the point itself, because who lives in a house
      // is known by the id of its point, not by the place it is drawn at.
      bulb.userData.living = point;
      activePoints.add(bulb);
    }
  }
}

// Repaints the lightbulbs of the living buildings: green while nobody lives
// there, blue once somebody has bought the place.
export function refreshLivingPoints() {
  if (!activePointsGroup) {
    return;
  }
  activePointsGroup.children.forEach(bulb => {
    const living = bulb.userData.living;
    if (!living) {
      return;
    }
    const occupied = isLivingOccupied(currentMapName, living);
    bulb.material.color.set(occupied ? livingOccupiedColour : livingFreeColour);
  });
}

export function switchToMap(mapName, initializePathfinding, map_x, map_y) {
  if (maps[mapName]) {
    const newMap = maps[mapName];
    const newMapData = newMap.tiles;
    let newPosition;
    console.log('switching to map:', mapName, map_x, map_y);
    if (map_x === undefined || map_y === undefined) {
      // This should not be happening if map data is captured correctly and
      // all transfer points have map and position defined.
      console.log('No map_x or map_y provided, finding first walkable position.');
      // findFirstWalkablePosition reads the tile array, which is already the
      // right way up, so its answer only has to be moved by the origin.
      const free = findFirstWalkablePosition(newMapData);
      newPosition = free ? toWorld(newMap, free.x, free.y) : null;
    } else {
      // map_x and map_y are written down the way the map a transfer point
      // leads to is drawn: counted from its left and from its top. Only now,
      // knowing that map, can they be turned into a place in the world.
      newPosition = toWorld(newMap, map_x, newMapData.length - 1 - map_y);
    }

    if (newPosition) {
      initialiseMap(mapName);
      initializePlayer(newPosition.x, newPosition.y);
      initializePathfinding(); // Re-initialize pathfinding with the new map
      updateAllOtherPlayers(); // Update visibility of other players on the new map
    } else {
      console.error(`No walkable position found on map: ${mapName}`);
    }
  } else {
    console.error(`Map '${mapName}' not found for transfer.`);
  }
}
