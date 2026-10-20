import { calculateFinalPosition } from "./calculateFinalPosition.js";
import { mapData, currentOrigin } from "../components/Map.js";

export function endsUpInValidPosition(currentPosition, moves) {
  const finalPosition = calculateFinalPosition(currentPosition, moves);
  // The player walks in the world, the tiles lay in an array, so the place he
  // would end up in has to be looked for where that tile really is.
  const index = {
    x: finalPosition.x - currentOrigin.x,
    y: finalPosition.y - currentOrigin.y
  };

  if (
    index.x < 0 ||
    index.y < 0 ||
    index.x >= mapData[0].length ||
    index.y >= mapData.length
  ) {
    return false;
  }
  if (mapData[index.y][index.x] === "M" ||
      mapData[index.y][index.x] === "P" ||
      mapData[index.y][index.x] === "V"
  ) return false;

  return true;
}
