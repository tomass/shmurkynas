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
import { WoodFloor } from "./WoodFloor.js";
import { TileFloor } from "./TileFloor.js";
import { Wall } from "./Wall.js";
import { Chair } from "./Chair.js";
import { LivingItem } from "./LivingItem.js";
import { findFirstWalkablePosition } from "../utilies/findFirstWalkablePosition.js";
import { initializePlayer, playerData } from "./Player.js";
import { updateAllOtherPlayers } from "../otherPlayers.js";
import { isLivingOccupied } from "../livingSpaces.js";
import { livingEntryTile, livingInsideMap } from "../../shared/livingSpace.js";
import { currentItems, setInsideLiving } from "../livingItems.js";
import { livingFreeColour, livingOccupiedColour } from "../constants.js";
import { mapOrigin, toWorld, toIndex, tileAt } from "../../shared/mapCoords.js";
import { tileIsWalkable } from "../../shared/tiles.js";

export let maps = {}; // Data of ALL maps
export let mapData = []; // data of the CURRENT map being rendered
// Where the lower left tile of the CURRENT map stands in the world. Everything
// but mapData itself speaks world coordinates, so this is what turns one into
// the other, see shared/mapCoords.js.
export let currentOrigin = { x: 0, y: 0 };
export let currentPoints = []; // active points of the CURRENT map being rendered
export let gamePoints = []; // list of all game points (coins, treasure maps, etc) on all maps
export let currentMapName = 'base'; // This should not be required, server sends our initial map and position
// The home the player has walked into, named by the id of its living space.
// The map being drawn is then the inside the house points at, but the world
// calls the place by this id, so that two children never meet in each other's
// rooms. Outside a home this is null and the place is the map itself.
export let currentLiving = null;
// Where the player stood before he walked into his home, so that he steps back
// out of the very same door.
let livingReturn = null;
export const map = new THREE.Group();
export const gamePointsGroup = new THREE.Group();
// The furniture of the home being walked in. It is kept apart from the glued
// tiles, because a single piece of it can be moved at any moment.
export const livingItemsGroup = new THREE.Group();
map.add(gamePointsGroup);
map.add(livingItemsGroup);

// The name the rest of the world knows the place of the player by.
export function currentPlace() {
  return currentLiving || currentMapName;
}

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
        if (point.type === 'coin' && point.map === currentPlace()) {
            const coin = Coin(point.x, point.y, 0xffd700);
            gamePointsGroup.add(coin);
        }
        if (point.type === 'treasureMap' && point.map === currentPlace()) {
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
// livingId is the home being walked in, when the drawn map is the inside of
// somebody's house.
export function initialiseMap(mapName = 'base', livingId = null) {
  if (!maps[mapName]) {
    console.error(`Map '${mapName}' not found.`);
    return;
  }
  // Update mapData to the one being rendered.
  currentMapName = mapName;
  currentLiving = livingId;
  setInsideLiving(livingId);
  mapData = [...maps[mapName].tiles];
  currentOrigin = mapOrigin(maps[mapName]);
  currentPoints = maps[mapName].points;

  map.remove(...map.children);
  disposeMergedTiles();
  map.add(gamePointsGroup);
  map.add(livingItemsGroup);

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
  drawLivingItems();
}

// Draws the furniture of the home being walked in. Outside a home there is
// nothing to draw.
export function drawLivingItems() {
  livingItemsGroup.remove(...livingItemsGroup.children);
  currentItems().forEach(item => livingItemsGroup.add(LivingItem(item)));
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
  } else if (type === "g") {
    tiles.add(WoodFloor(x, y));
  } else if (type === "p") {
    tiles.add(TileFloor(x, y));
  } else if (type === "S") {
    tiles.add(Wall(x, y));
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

// The living point with this id, wherever in the map file it is drawn. A home
// is found by its id, because the house it belongs to may be drawn somewhere
// else tomorrow.
export function livingPointById(id) {
  if (!id) {
    return null;
  }
  for (const [mapName, oneMap] of Object.entries(maps)) {
    const point = (oneMap.points || []).find(p => p.type === 'living' && p.id === id);
    if (point) {
      return { point, mapName };
    }
  }
  return null;
}

// The tile the player of the home being walked in came in through. The
// furniture is not allowed to stand on it, so that the door is never blocked.
export function currentEntryTile() {
  const home = livingPointById(currentLiving);
  return home ? livingEntryTile(home.point, maps[livingInsideMap(home.point)]) : null;
}

// A free tile right next to a house, for a player who steps out of his home
// and has nowhere remembered to step back onto.
function nextToHouse(home) {
  const outside = maps[home.mapName];
  if (!outside) {
    return null;
  }
  const steps = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }];
  for (const step of steps) {
    const x = home.point.x + step.x;
    const y = home.point.y + step.y;
    if (tileIsWalkable(tileAt(outside, x, y))) {
      return { map: home.mapName, x, y };
    }
  }
  return null;
}

// Walks the player into his own home. Gives back the name the world knows that
// place by, or null when the home has no inside drawn for it yet.
export function enterLiving(livingId, initializePathfinding) {
  const home = livingPointById(livingId);
  const inside = home ? maps[livingInsideMap(home.point)] : null;
  const entry = home && inside ? livingEntryTile(home.point, inside) : null;
  if (!entry) {
    console.error(`The home '${livingId}' has no inside to walk into.`);
    return null;
  }
  livingReturn = { map: currentPlace(), x: playerData.x, y: playerData.y };
  initialiseMap(livingInsideMap(home.point), livingId);
  initializePlayer(entry.x, entry.y);
  initializePathfinding();
  updateAllOtherPlayers();
  return currentPlace();
}

// Steps the player back out of his home, onto the very tile he came in from.
// Gives back the name of the place he ends up in.
export function leaveLiving(initializePathfinding) {
  const home = livingPointById(currentLiving);
  let back = livingReturn;
  if (!back || !maps[back.map] || !tileIsWalkable(tileAt(maps[back.map], back.x, back.y))) {
    back = home ? nextToHouse(home) : null;
  }
  if (!back) {
    console.error('There is no way out of this home.');
    return null;
  }
  livingReturn = null;
  initialiseMap(back.map, null);
  initializePlayer(back.x, back.y);
  initializePathfinding();
  updateAllOtherPlayers();
  return currentPlace();
}

// Draws the place the server says the player is standing in: a map everybody
// can walk on, or the inside of one of his own homes.
export function enterPlace(placeName) {
  if (maps[placeName]) {
    initialiseMap(placeName, null);
    return;
  }
  const home = livingPointById(placeName);
  const inside = home ? livingInsideMap(home.point) : null;
  if (inside && maps[inside]) {
    initialiseMap(inside, placeName);
    return;
  }
  console.error(`Place '${placeName}' not found, going to the base map.`);
  initialiseMap('base', null);
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
      initialiseMap(mapName, null);
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
