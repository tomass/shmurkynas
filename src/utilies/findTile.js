import { maps } from '../components/Map.js';
import { logWithTimestamp } from '../../server/server.js';

export function findTile(tileTypes) {
    const tiles = [];
    for (const [mapName, map] of Object.entries(maps)) {
      if (map.type === 'public') {
        const mapTiles = map.tiles;
        for (let y = 0; y < mapTiles.length; y++) {
          for (let x = 0; x < mapTiles[y].length; x++) {
            if (tileTypes.includes(mapTiles[y][x])) {
                tiles.push({ x, y, mapName, tileLength: mapTiles.length });
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
