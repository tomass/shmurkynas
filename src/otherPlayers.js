import * as THREE from "three";
import { createPlayerMesh } from "./components/Player";
import { tileSize } from "./constants";
import { currentMapName } from "./components/Map.js";

export const otherPlayers = new THREE.Group();
const otherPlayersMap = new Map(); // Will store { playerInfo: {}, mesh: THREE.Mesh | undefined }

export function removeOtherPlayer(playerId) {
    const playerRecord = otherPlayersMap.get(playerId);
    if (playerRecord) {
        if (playerRecord.mesh) {
            otherPlayers.remove(playerRecord.mesh);
        }
        otherPlayersMap.delete(playerId);
    }
}

export function updateOtherPlayer(playerInfo) {
    const { id, x, y, colour, map } = playerInfo;

    let playerRecord = otherPlayersMap.get(id);

    // If player is new, create a record
    if (!playerRecord) {
        playerRecord = { playerInfo: {}, mesh: undefined };
        otherPlayersMap.set(id, playerRecord);
    }

    // Always update player info
    playerRecord.playerInfo = playerInfo;

    const isOnSameMap = (map === currentMapName);

    if (isOnSameMap) {
        // Player is on the same map
        if (playerRecord.mesh) {
            // Mesh exists, update it
            if (x !== undefined && y !== undefined) {
                playerRecord.mesh.position.x = x * tileSize;
                playerRecord.mesh.position.y = y * tileSize;
            }
            if (colour) {
                playerRecord.mesh.children[0].children[0].material.color.set(colour);
            }
        } else {
            // Mesh doesn't exist, create it
            const newMesh = createPlayerMesh(colour || "blue");
            newMesh.position.x = x * tileSize;
            newMesh.position.y = y * tileSize;
            otherPlayers.add(newMesh);
            playerRecord.mesh = newMesh;
        }
    } else {
        // Player is on a different map
        if (playerRecord.mesh) {
            // If a mesh exists, remove it
            otherPlayers.remove(playerRecord.mesh);
            playerRecord.mesh = undefined;
        }
    }
}