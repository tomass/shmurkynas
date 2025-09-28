import * as THREE from "three";
import { endsUpInValidPosition } from "../utilies/endsUpInValidPosition";
import { mapData } from "./Map";

export const player = Player();

function Player() {
    const player = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(15, 15, 20),
        new THREE.MeshLambertMaterial({
            color: "white",
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

export const position = {
    x: 1,
    y: 1,
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

export function initializePlayer() {
  player.position.x = 0;
  player.position.y = 0;
  player.children[0].position.z = 0;

  position.x = 0;
  position.y = 0;
  position.isActive = true;

  movesQueue.length = 0;
}
