import { livingPrices } from '../src/constants.js';

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

export function livingTypeName(type) {
  return livingTypeNames[type] || 'Gyvenamoji vieta';
}
