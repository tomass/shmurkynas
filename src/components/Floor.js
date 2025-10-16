import * as THREE from "three";
import { tileSize } from "../constants.js";

export function Floor(x, y) {
    const floor = new THREE.Group();
    floor.position.x = x * tileSize;
    floor.position.y = y * tileSize;

    const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, tileSize, 3),
        new THREE.MeshLambertMaterial({ color: 0x5e5c64 })
    );
    foundation.position.z = 1.5;
    foundation.receiveShadow = true;
    floor.add(foundation);

    return floor;
}
