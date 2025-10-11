import * as THREE from "three";
import { tileSize } from "../constants";

export function Coin(x, y, colour) {
    const point = new THREE.Mesh(
        new THREE.CylinderGeometry(21, 21, 1, 17),
        new THREE.MeshLambertMaterial({
            color: new THREE.Color("#f6d32d"),
            roughness: 0.5,
            metalness: 0.1,
            flatShading: true,
        })
    );
    point.castShadow = true;
    point.position.z = 23;
    point.position.x = x * tileSize;
    point.position.y = y * tileSize;

    return point;
}
