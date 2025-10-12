import * as THREE from "three";
import { tileSize } from "../constants";
import { mapData } from "./Map";

export function ActivePoint(x, y, colour) {
    const point = new THREE.Mesh(
        new THREE.CapsuleGeometry(5, 8, 4, 4),
        new THREE.MeshLambertMaterial({
            color: colour,
            flatShading: true,
        })
    );
    if (mapData[y][x] === 'P') {
        // Put lightbulb higher above the building
        point.position.z = 50;
    } else {
        point.position.z = 15;
    }
    point.position.x = x * tileSize;
    point.position.y = y * tileSize;
    point.castShadow = true;

    return point;
}
