import { livingPrices } from '../src/constants.js';
import { toWorld } from './mapCoords.js';

// How the living spaces are named for the players.
const livingTypeNames = {
  flat1: 'Butas',
  flat2: 'Didelis butas',
  house1: 'Namas',
  house2: 'Didelis namas',
};

// A living space is remembered by the id its point has in the map file. That
// id never changes, so the child who bought a flat keeps it even when the
// house is later drawn somewhere else. Old map files have no ids yet, so for
// such a point the map and the place still have to do.
export function livingKey(mapName, point) {
  if (point && point.id) {
    return `id:${point.id}`;
  }
  return `place:${mapName}:${point ? point.x : ''},${point ? point.y : ''}`;
}

// What a living space costs. The map can name its own price for a single
// point, otherwise the price of that kind of living space - flat1, house1 and
// so on - is taken. Returns null when the price is
// not known at all, so such a place can not be bought.
export function livingPrice(point) {
  const mapPrice = Number(point.price);
  if (Number.isFinite(mapPrice) && mapPrice > 0) {
    return mapPrice;
  }
  const typePrice = livingPrices[point.livingType];
  return Number.isFinite(typePrice) ? typePrice : null;
}

// The map drawn when the owner walks into his home. The kind of living space
// is also the name of the map which shows its inside - a flat1 is seen from
// the inside as the map called flat1 - so a living point does not have to say
// it. One which wants an inside of its own says so with map=.
export function livingInsideMap(point) {
  return (point && (point.map || point.livingType)) || null;
}

// The tile the owner lands on when he walks into his home. The inside map
// says where its own door is, because many homes are seen from the inside as
// one and the same map. A single living point can still land its owner
// somewhere else with map_x and map_y, written the way that inside is drawn -
// counted from its left and from its top.
export function livingEntryTile(point, inside) {
  if (!inside || !inside.tiles) {
    return null;
  }
  const map_x = writtenNumber(point, 'map_x');
  const map_y = writtenNumber(point, 'map_y');
  if (map_x !== null && map_y !== null) {
    return toWorld(inside, map_x, inside.tiles.length - 1 - map_y);
  }
  return inside.entry || null;
}

// A number written down in a point, or null when the line is not there or is
// left empty.
function writtenNumber(point, name) {
  const value = point ? point[name] : undefined;
  if (value === undefined || value === '' || value === null) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function livingTypeName(type) {
  return livingTypeNames[type] || 'Gyvenamoji vieta';
}
