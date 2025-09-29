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

export const position = {
    x: 0,
    y: 2,
    isActive: true,
}

export const movesQueue = [];

export function queueMove(direction) {
    const isValidMove = endsUpInValidPosition(
        {
            x: position.x,
            y: position.y,
        },
        [...movesQueue, direction]
    );
    if (!isValidMove) return;

    movesQueue.push(direction);
}

export function stepCompleted() {
    const direction = movesQueue.shift();

    if (direction === "forward")  position.y += 1;
    if (direction === "backward") position.y -= 1;
    if (direction === "left")     position.x -= 1;
    if (direction === "right")    position.x += 1;
}

export function initializePlayer(x, y) {
  position.x = x;
  position.y = y;

  player.position.x = position.x * tileSize;
  player.position.y = position.y * tileSize;
  player.children[0].position.z = 0;

  position.isActive = true;

  movesQueue.length = 0;
}
