import * as THREE from "three";
import { movesQueue, stepCompleted } from "./components/Player";
import { player, playerData } from "./components/Player";
import { tileSize } from "./constants";
import { sendPosition, sendMessage } from "./websocket";
import { gamePoints } from "./components/Map";

const moveClock = new THREE.Clock(false);

export function animatePlayer() {
  if (!movesQueue.length) return;

  if (!moveClock.running) moveClock.start();

  const stepTime = 0.2;
  const progress = Math.min(1, moveClock.getElapsedTime() / stepTime);

  setPosition(progress);
  setRotation(progress);

  // Once step has ended
  if (progress >= 1) {
    stepCompleted();
    sendPosition(playerData.x, playerData.y);

    const coin = gamePoints.find(p => p.type === 'coin' && p.x === playerData.x && p.y === playerData.y);
    if (coin) {
      sendMessage({ type: 'coinCollected', x: coin.x, y: coin.y });
    }

    moveClock.stop();
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
