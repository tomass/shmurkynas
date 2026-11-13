// The furniture a player can buy for his own home. The browser and the server
// both ask here, so that a new kind of furniture only has to be written down
// in one place - and so that both of them answer the very same way when asked
// whether a chair may stand on a certain tile.

import { tileAt } from './mapCoords.js';
import { tileIsWalkable } from './tiles.js';

// Every kind of furniture: what it is called, what it costs and how many tiles
// it takes up. A thing which is not square can be turned around, a chair has
// nothing to turn.
export const livingItemTypes = {
  chair: { name: 'Kėdė', price: 1, width: 1, height: 1 },
  bed: { name: 'Lova', price: 3, width: 2, height: 1 },
};

export function livingItemType(type) {
  return livingItemTypes[type] || null;
}

export function livingItemName(type) {
  const kind = livingItemType(type);
  return kind ? kind.name : 'Daiktas';
}

export function livingItemPrice(type) {
  const kind = livingItemType(type);
  return kind ? kind.price : null;
}

// Can this kind of furniture be turned around? Only a thing whose sides are
// not the same length looks any different afterwards.
export function canTurnItem(type) {
  const kind = livingItemType(type);
  return Boolean(kind) && kind.width !== kind.height;
}

// How wide and how tall an item stands. A turned item lays the other way
// round: a bed of two tiles by one becomes one tile by two.
export function itemSize(item) {
  const kind = livingItemType(item.type);
  if (!kind) {
    return { width: 0, height: 0 };
  }
  return item.turned
    ? { width: kind.height, height: kind.width }
    : { width: kind.width, height: kind.height };
}

// All the tiles an item covers. The place of an item is its lower left tile,
// the rest it takes up to the right and upwards.
export function itemTiles(item) {
  const size = itemSize(item);
  const tiles = [];
  for (let dx = 0; dx < size.width; dx++) {
    for (let dy = 0; dy < size.height; dy++) {
      tiles.push({ x: item.x + dx, y: item.y + dy });
    }
  }
  return tiles;
}

export function itemCovers(item, x, y) {
  return itemTiles(item).some(tile => tile.x === x && tile.y === y);
}

// The item standing on a tile, if there is one.
export function itemAt(items, x, y) {
  return (items || []).find(item => itemCovers(item, x, y)) || null;
}

// Can a player stand on this tile: is the tile itself one to walk on and is
// there no furniture in the way.
function placeIsFree(map, items, x, y) {
  return tileIsWalkable(tileAt(map, x, y)) && !itemAt(items, x, y);
}

// Can a player walk from one place to another without climbing over the
// furniture? The rooms of a home are small, so simply trying every way out of
// the starting tile until the wanted one is met is quick enough.
export function canWalkBetween(map, items, from, to) {
  if (!from || !to) {
    return true;
  }
  if (from.x === to.x && from.y === to.y) {
    return true;
  }
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length > 0) {
    const place = queue.shift();
    const steps = [
      { x: place.x + 1, y: place.y },
      { x: place.x - 1, y: place.y },
      { x: place.x, y: place.y + 1 },
      { x: place.x, y: place.y - 1 },
    ];
    for (const step of steps) {
      const key = `${step.x},${step.y}`;
      if (seen.has(key) || !placeIsFree(map, items, step.x, step.y)) {
        continue;
      }
      if (step.x === to.x && step.y === to.y) {
        return true;
      }
      seen.add(key);
      queue.push(step);
    }
  }
  return false;
}

// Why this item can not stand here, told in words a child can read, or null
// when it can. `items` are the other things already standing in the home - the
// item being moved must not be among them, otherwise it would be in its own
// way. `playerAt` is where the owner is standing and `entryAt` is the tile he
// came in through; both of them have to stay reachable, so that nobody can
// wall himself into a corner of his own home.
export function itemPlacementRefusal(map, items, item, playerAt, entryAt) {
  const kind = livingItemType(item.type);
  if (!kind) {
    return 'Tokio daikto nėra.';
  }
  const tiles = itemTiles(item);
  for (const tile of tiles) {
    if (!tileIsWalkable(tileAt(map, tile.x, tile.y))) {
      return 'Čia padėti negalima.';
    }
    if (itemAt(items, tile.x, tile.y)) {
      return 'Čia jau kažkas stovi.';
    }
    if (playerAt && tile.x === playerAt.x && tile.y === playerAt.y) {
      return 'Čia stovi tu pats.';
    }
    if (entryAt && tile.x === entryAt.x && tile.y === entryAt.y) {
      return 'Čia durys, jų užstatyti negalima.';
    }
  }
  if (!canWalkBetween(map, items.concat([item]), playerAt, entryAt)) {
    return 'Tada nebeprieitum prie durų.';
  }
  return null;
}
