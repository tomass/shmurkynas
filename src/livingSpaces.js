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
    boughtSpaces.set(livingKey(space.map, space), space);
  });
}

// point is the living point of the map, which knows its id and its place.
export function livingSpaceOwner(mapName, point) {
  return boughtSpaces.get(livingKey(mapName, point)) || null;
}

export function isLivingOccupied(mapName, point) {
  return Boolean(livingSpaceOwner(mapName, point));
}

export function isMyLivingSpace(mapName, point) {
  const space = livingSpaceOwner(mapName, point);
  return Boolean(space && myId && space.owner === myId);
}
