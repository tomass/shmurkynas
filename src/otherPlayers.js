import * as THREE from "three";
import { createPlayerMesh } from "./components/Player";
import { tileSize } from "./constants";

export const otherPlayers = new THREE.Group();
const otherPlayersMap = new Map();

export function addOtherPlayer(playerInfo) {
    const { id, x, y, colour } = playerInfo;
    const playerMesh = createPlayerMesh(colour || "blue");
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
    const { id, x, y, name, colour } = playerInfo;
    const playerMesh = otherPlayersMap.get(id);
    if (playerMesh) {
        if (x !== undefined && y !== undefined) {
            playerMesh.position.x = x * tileSize;
            playerMesh.position.y = y * tileSize;
        }
        if (colour) {
            // two children[0].children[0] here represent the threejs object inside:
            // there is a group (first child) and then there is a body (second child)
            playerMesh.children[0].children[0].material.color.set(colour);
        }
    } else {
        addOtherPlayer(playerInfo);
    }
}