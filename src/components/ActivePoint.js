import * as THREE from "three";
import { tileSize } from "../constants.js";

// x and y are the place of the point in the world, tile is the kind of tile it
// is standing on - a lightbulb on a house has to hang higher than one standing
// on the grass.
export function ActivePoint(x, y, colour, tile) {
    const point = new THREE.Mesh(
        new THREE.CapsuleGeometry(5, 8, 4, 4),
        new THREE.MeshLambertMaterial({
            color: colour,
            flatShading: true,
        })
    );
    if (tile === 'P') {
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
