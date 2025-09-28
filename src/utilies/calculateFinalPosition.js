export function calculateFinalPosition(currentPosition, moves) {
  return moves.reduce((position, direction) => {
    if (direction === "forward")
      return {
        x: position.x,
        y: position.y + 1,
      };
    if (direction === "backward")
      return {
        x: position.x,
        y: position.y - 1,
      };
    if (direction === "left")
      return {
        x: position.x - 1,
        y: position.y,
      };
    if (direction === "right")
      return {
        x: position.x + 1,
        y: position.y,
      };
    return position;
  }, currentPosition);
}
