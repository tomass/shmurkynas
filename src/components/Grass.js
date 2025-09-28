import * as THREE from "three";
import { tileSize } from "../constants";

export function Grass(x, y) {
    const grass = new THREE.Group();
    grass.position.x = x * tileSize;
    grass.position.y = y * tileSize;

    const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, tileSize, 3),
        new THREE.MeshLambertMaterial({ color: 0xbaf455 })
    );
    foundation.position.z = 1.5;
    foundation.receiveShadow = true;
    grass.add(foundation);

    return grass;
}
