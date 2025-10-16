import { calculateFinalPosition } from "./calculateFinalPosition.js";
import { mapData } from "../components/Map.js";

export function endsUpInValidPosition(currentPosition, moves) {
  const finalPosition = calculateFinalPosition(currentPosition, moves);

  if (
    finalPosition.x === -1 ||
    finalPosition.y === -1 ||
    finalPosition.x === mapData[0].length ||
    finalPosition.y === mapData.length
  ) {
    return false;
  }
  if (mapData[finalPosition.y][finalPosition.x] === "M" ||
      mapData[finalPosition.y][finalPosition.x] === "P" ||
      mapData[finalPosition.y][finalPosition.x] === "V"
  ) return false;

  return true;
}
