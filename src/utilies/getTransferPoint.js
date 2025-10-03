import { mapData, currentMapName } from "../components/Map";

export function getTransferPoint(x, y) {
  if (!mapData || !mapData[currentMapName]) {
    return null;
  }

  const point = mapData[currentMapName].points.find(p => p.x === x && p.y === y && p.type === 'transfer');
  return point || null;
}