import * as THREE from "three";
import { tileSize } from "../constants.js";

export function TreasureMap(x, y) {
    const point = new THREE.Mesh(
        new THREE.CylinderGeometry(10, 10, 1, 17),
        new THREE.MeshLambertMaterial({
            color: new THREE.Color("#ebe7d5ff"),
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
