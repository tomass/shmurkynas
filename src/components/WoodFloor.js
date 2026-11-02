import * as THREE from "three";
import { tileSize } from "../constants.js";

// An indoor floor of wooden boards. The boards themselves are thin plates laid
// on top of a darker foundation, so the gaps between them stay dark, and the
// walking surface ends up at the same height as every other tile.
export function WoodFloor(x, y) {
    const floor = new THREE.Group();
    floor.position.x = x * tileSize;
    floor.position.y = y * tileSize;

    const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, tileSize, 3),
        new THREE.MeshLambertMaterial({ color: 0x5a3a24 })
    );
    foundation.position.z = 1.5;
    foundation.receiveShadow = true;
    floor.add(foundation);

    const plankCount = 6;
    const plankWidth = tileSize / plankCount;
    for (let i = 0; i < plankCount; i++) {
        const plank = new THREE.Mesh(
            new THREE.PlaneGeometry(tileSize, plankWidth - 0.6),
            new THREE.MeshLambertMaterial({ color: i % 2 ? 0xb5835a : 0xc69468 })
        );
        plank.position.y = -tileSize / 2 + plankWidth / 2 + i * plankWidth;
        plank.position.z = 3.02;
        plank.receiveShadow = true;
        floor.add(plank);
    }

    return floor;
}
