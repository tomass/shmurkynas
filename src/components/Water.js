import * as THREE from "three";
import { tileSize } from "../constants";

export function Water(x, y) {
    const water = new THREE.Group();
    water.position.x = x * tileSize;
    water.position.y = y * tileSize;

    const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, tileSize, 1),
        new THREE.MeshLambertMaterial({ color: 0x5877dd })
    );
    foundation.position.z = 0;
    foundation.receiveShadow = true;
    water.add(foundation);

    return water;
}
