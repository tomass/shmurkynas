import * as THREE from "three";
import { tileSize } from "../constants";

export function ActivePoint(x, y, colour) {
    const point = new THREE.Mesh(
        new THREE.CapsuleGeometry(5, 8, 4, 4),
        new THREE.MeshLambertMaterial({
            color: colour,
            flatShading: true,
        })
    );
    point.position.z = 50;
    point.position.x = x * tileSize;
    point.position.y = y * tileSize;

    return point;
}
