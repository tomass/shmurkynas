import * as THREE from "three";
import { movesQueue, stepCompleted } from "./components/Player";
import { player, playerData } from "./components/Player";
import { tileSize } from "./constants";
import { sendPosition, sendMessage } from "./websocket";
import { gamePoints, currentMapName } from "./components/Map";

const moveTimer = new THREE.Timer();
let movedTime = 0; // seconds already spent on the step being animated now

export function animatePlayer() {
  if (!movesQueue.length) {
    // Standing still: keep forgetting the passing time, so that the next step
    // does not begin with the whole waiting time already counted into it.
    moveTimer.reset();
    movedTime = 0;
    return;
  }

  moveTimer.update();
  movedTime += moveTimer.getDelta();

  const stepTime = 0.2;
  const progress = Math.min(1, movedTime / stepTime);

  setPosition(progress);
  setRotation(progress);

  // Once step has ended
  if (progress >= 1) {
    stepCompleted();
    sendPosition(playerData.x, playerData.y);

    const coin = gamePoints.find(p => p.type === 'coin' && p.x === playerData.x && p.y === playerData.y && p.map === currentMapName);
    if (coin) {
      sendMessage({ type: 'coinCollected', x: coin.x, y: coin.y, map: currentMapName });
    }

    movedTime = 0;
  }
}

function setPosition(progress) {
  const startX = playerData.x * tileSize;
  const startY = playerData.y * tileSize;
  let endX = startX;
  let endY = startY;

  if (movesQueue[0] === "left") endX -= tileSize;
  if (movesQueue[0] === "right") endX += tileSize;
  if (movesQueue[0] === "forward") endY += tileSize;
  if (movesQueue[0] === "backward") endY -= tileSize;

  player.position.x = THREE.MathUtils.lerp(startX, endX, progress);
  player.position.y = THREE.MathUtils.lerp(startY, endY, progress);
  player.children[0].position.z = Math.sin(progress * Math.PI) * 8;
}

function setRotation(progress) {
  let endRotation = 0;
  if (movesQueue[0] == "forward")  endRotation = 0;
  if (movesQueue[0] == "left")     endRotation = Math.PI / 2;
  if (movesQueue[0] == "right")    endRotation = -Math.PI / 2;
  if (movesQueue[0] == "backward") endRotation = Math.PI;

  player.children[0].rotation.z = THREE.MathUtils.lerp(
    player.children[0].rotation.z,
    endRotation,
    progress
  );
}
