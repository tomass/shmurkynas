import * as THREE from "three";
import { tileSize } from "../constants";

export function Coin(x, y, colour) {
    const point = new THREE.Mesh(
        new THREE.CapsuleGeometry(10, 10, 4, 6),
        new THREE.MeshLambertMaterial({
            color: colour,
            flatShading: true,
        })
    );
    point.position.z = 10;
    point.position.x = x * tileSize;
    point.position.y = y * tileSize;

    return point;
}
