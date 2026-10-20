import { livingPrices } from '../src/constants.js';

// How the living spaces are named for the players.
const livingTypeNames = {
  flat1: 'Butas',
  flat2: 'Didelis butas',
  house1: 'Namas',
  house2: 'Didelis namas',
};

// A living space is remembered by the map it is on and its place in that map.
export function livingKey(mapName, x, y) {
  return `${mapName}:${x},${y}`;
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
