import { itemAt, itemTiles } from '../shared/livingItems.js';

// The furniture standing in the homes of this player. This is only what the
// server has told us; the server is the one who decides where a bed may stand.
let allItems = [];
// The home the player is walking in right now, or null while he is outside.
let insideLiving = null;

export function setLivingItems(items) {
  allItems = Array.isArray(items) ? items : [];
}

export function itemsOfLiving(livingId) {
  return allItems.filter(item => item.living === livingId);
}

export function setInsideLiving(livingId) {
  insideLiving = livingId || null;
}

export function insideLivingId() {
  return insideLiving;
}

// The furniture of the home the player is standing in. Outside a home there is
// none, so everything which asks about furniture gets an empty answer and the
// rest of the game goes on as it always did.
export function currentItems() {
  return insideLiving ? itemsOfLiving(insideLiving) : [];
}

export function itemAtPlace(x, y) {
  return itemAt(currentItems(), x, y);
}

// All the tiles the furniture of this home takes up. The path finder and every
// single step of the player ask here.
export function blockedTiles() {
  const tiles = [];
  currentItems().forEach(item => tiles.push(...itemTiles(item)));
  return tiles;
}

export function placeIsBlockedByItem(x, y) {
  return Boolean(itemAtPlace(x, y));
}
