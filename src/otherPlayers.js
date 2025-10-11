import * as THREE from "three";
import { createPlayerMesh } from "./components/Player";
import { tileSize } from "./constants";
import { currentMapName } from "./components/Map.js";

export const otherPlayers = new THREE.Group();
const otherPlayersMap = new Map();

export function removeOtherPlayer(playerId) {
    const playerMesh = otherPlayersMap.get(playerId);
    if (playerMesh) {
        otherPlayers.remove(playerMesh);
        otherPlayersMap.delete(playerId);
    }
}

export function updateOtherPlayer(playerInfo) {
    const { id, x, y, colour, map } = playerInfo;
    const playerMesh = otherPlayersMap.get(id);

    if (map !== currentMapName) {
        if (playerMesh) {
            removeOtherPlayer(id);
        }
        return;
    }

    if (playerMesh) {
        if (x !== undefined && y !== undefined) {
            playerMesh.position.x = x * tileSize;
            playerMesh.position.y = y * tileSize;
        }
        if (colour) {
            playerMesh.children[0].children[0].material.color.set(colour);
        }
    } else {
        const playerMesh = createPlayerMesh(colour || "blue");
        playerMesh.position.x = x * tileSize;
        playerMesh.position.y = y * tileSize;
        otherPlayers.add(playerMesh);
        otherPlayersMap.set(id, playerMesh);
    }
}