// What a player may walk on. The browser and the server both ask here, so that
// a new kind of tile only has to be written down in one place.

import { deskTiles } from './subjects.js';

// Tiles a player can not stand on: a tree, a house, the water, an indoor wall
// and a school desk. Everything else is a place to stand on.
export const unwalkableTiles = ['M', 'P', 'V', 'S', ...deskTiles];

// Tiles the path finder may lead a player through. It wants the walkable kinds
// named one by one, and it is only allowed to use the ones a single step is
// allowed onto as well.
export const pathableTiles = ['G', 'Ž', 'R', 'g', 'p'];

// Whether a player may stand on a tile. A tile which is not there - a place
// outside the map - is not a place to stand on.
export function tileIsWalkable(tile) {
  return tile !== undefined && !unwalkableTiles.includes(tile);
}
