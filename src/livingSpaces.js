import { livingKey } from '../shared/livingSpace.js';

// Which living spaces are already bought and by whom. This is only what the
// server has told us, the server is the one who decides.
// Kept free of everything that only a browser has, because the server reads the
// maps with the very same code.
const boughtSpaces = new Map();
let myId = null;

export function setMyPlayerId(id) {
  myId = id;
}

export function setLivingSpaces(spaces) {
  boughtSpaces.clear();
  (spaces || []).forEach(space => {
    boughtSpaces.set(livingKey(space.map, space.x, space.y), space);
  });
}

export function livingSpaceOwner(mapName, x, y) {
  return boughtSpaces.get(livingKey(mapName, x, y)) || null;
}

export function isLivingOccupied(mapName, x, y) {
  return Boolean(livingSpaceOwner(mapName, x, y));
}

export function isMyLivingSpace(mapName, x, y) {
  const space = livingSpaceOwner(mapName, x, y);
  return Boolean(space && myId && space.owner === myId);
}
