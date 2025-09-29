import * as THREE from "three";
import { createPlayerMesh } from "./components/Player";
import { tileSize } from "./constants";

export const otherPlayers = new THREE.Group();
const otherPlayersMap = new Map();

export function addOtherPlayer(playerInfo) {
    const { id, x, y } = playerInfo;
    const playerMesh = createPlayerMesh("blue");
    playerMesh.position.x = x * tileSize;
    playerMesh.position.y = y * tileSize;
    otherPlayers.add(playerMesh);
    otherPlayersMap.set(id, playerMesh);
}

export function removeOtherPlayer(playerId) {
    const playerMesh = otherPlayersMap.get(playerId);
    if (playerMesh) {
        otherPlayers.remove(playerMesh);
        otherPlayersMap.delete(playerId);
    }
}

export function updateOtherPlayer(playerInfo) {
    const { id, x, y } = playerInfo;
    const playerMesh = otherPlayersMap.get(id);
    if (playerMesh) {
        playerMesh.position.x = x * tileSize;
        playerMesh.position.y = y * tileSize;
    }
}