import { maps } from '../components/Map.js';
import { toWorld } from '../../shared/mapCoords.js';
import { logWithTimestamp } from '../../server/server.js';

// A random free place of one of the given kinds, somewhere on the public maps.
// The answer is a place in the world, which is what everything the server
// remembers is written down in.
export function findTile(tileTypes) {
    const tiles = [];
    for (const [mapName, map] of Object.entries(maps)) {
      if (map.type === 'public') {
        const mapTiles = map.tiles;
        for (let row = 0; row < mapTiles.length; row++) {
          for (let col = 0; col < mapTiles[row].length; col++) {
            if (tileTypes.includes(mapTiles[row][col])) {
                const place = toWorld(map, col, row);
                tiles.push({ x: place.x, y: place.y, mapName });
            }
          }
        }
      }
    }

    if (tiles.length === 0) {
        logWithTimestamp(`No tiles found on all maps.`);
        return;
    }

    const randomTile = tiles[Math.floor(Math.random() * tiles.length)];

    return { x: randomTile.x, y: randomTile.y, mapName: randomTile.mapName };
}
