import * as THREE from "three";
import { endsUpInValidPosition } from "../utilies/endsUpInValidPosition";
import { tileSize } from "../constants";

export function createPlayerMesh(color = "white") {
    const player = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(15, 15, 20),
        new THREE.MeshLambertMaterial({
            color: color,
            flatShading: true,
        })
    );
    body.position.z = 10;
    body.castShadow = true;
    body.receiveShadow = true;
    player.add(body);

    const cap = new THREE.Mesh(
        new THREE.BoxGeometry(2, 4, 2),
        new THREE.MeshLambertMaterial({
            color: 0xf0619a,
            flatShading: true,
        })
    );
    cap.position.z = 21;
    cap.castShadow = true;
    cap.receiveShadow = true;
    player.add(cap);

    const playerContainer = new THREE.Group();
    playerContainer.add(player);

    return playerContainer;
}

export const player = createPlayerMesh();

export const playerData = {
    x: 0,
    y: 2,
    name: 'N/A',
    money: 0,
    colour: 'white',
    isActive: true,
}

export const movesQueue = [];

export function queueMove(direction) {
    const isValidMove = endsUpInValidPosition(
        {
            x: playerData.x,
            y: playerData.y,
        },
        [...movesQueue, direction]
    );
    if (!isValidMove) return;

    movesQueue.push(direction);
}

export function stepCompleted() {
    const direction = movesQueue.shift();

    if (direction === "forward")  playerData.y += 1;
    if (direction === "backward") playerData.y -= 1;
    if (direction === "left")     playerData.x -= 1;
    if (direction === "right")    playerData.x += 1;
}

export function initializePlayer(x, y, name = playerData.name, money = playerData.money, colour = playerData.colour) {
  playerData.x = x;
  playerData.y = y;
  playerData.name = name;
  playerData.money = money;
  playerData.colour = colour;

  player.position.x = playerData.x * tileSize;
  player.position.y = playerData.y * tileSize;
  player.children[0].position.z = 0;

  const playerBody = player.children[0].children[0];
  playerBody.material.color.set(colour);

  const playerNameEl = document.getElementById('playerName');
  const playerMoneyEl = document.getElementById('playerMoney');
  const playerColourEl = document.getElementById('playerColour');

  playerNameEl.textContent = name;
  playerNameEl.style.color = colour;
  playerMoneyEl.textContent = `€${money}`;
  playerColourEl.style.backgroundColor = colour;

  playerData.isActive = true;

  movesQueue.length = 0;
}

export function updatePlayerMoney(money) {
  playerData.money = money;
  const playerMoneyEl = document.getElementById('playerMoney');
  if (playerMoneyEl) {
    playerMoneyEl.textContent = `€${money}`;
  }
}

export function updatePlayerColour(colour) {
  playerData.colour = colour;
  const playerBody = player.children[0].children[0];
  playerBody.material.color.set(colour);
}
