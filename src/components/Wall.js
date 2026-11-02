import * as THREE from "three";
import { tileSize } from "../constants.js";

// An indoor wall. It stands on the whole area of its tile, so walls drawn next
// to each other grow into one solid run.
const wallHeight = 40;

export function Wall(x, y) {
    const wall = new THREE.Group();
    wall.position.x = x * tileSize;
    wall.position.y = y * tileSize;

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(tileSize, tileSize, wallHeight),
        new THREE.MeshLambertMaterial({
            color: 0xe3d9c6,
            flatShading: true,
        })
    );
    body.position.z = wallHeight / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    wall.add(body);

    return wall;
}
